from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

def retrieve_documents(
    vector_store,
    all_docs: list[Document],  # Pass all loaded chunks/documents to initialize or use BM25
    query: str,
    top_k: int = 5,
    rrf_k: int = 60,
    bm25_retriever: BM25Retriever = None
) -> list[tuple[Document, float]]:
    """
    Retrieves documents using Hybrid Search (BM25 + Chroma Vector) combined with 
    Reciprocal Rank Fusion (RRF).
    
    Returns:
        list[tuple[Document, float]]: Ranked list of (Document, RRF_Score) tuples.
        Note: Higher RRF score indicates higher relevance (1.0 scale).
    """
    if bm25_retriever is None:
        if not all_docs:
            raise ValueError("Must provide either 'all_docs' or an initialized 'bm25_retriever'")
        bm25_retriever = BM25Retriever.from_documents(all_docs)
        bm25_retriever.k = top_k * 2  # Fetch candidates for fusion

    bm25_results = bm25_retriever.invoke(query)

    vector_results_with_score = vector_store.similarity_search_with_score(
        query,
        k=top_k * 2
    )
    vector_results = [doc for doc, _ in vector_results_with_score]

    doc_scores = {}
    doc_map = {}

    def add_rrf_scores(doc_list):
        for rank, doc in enumerate(doc_list):
            doc_id = doc.page_content
            if doc_id not in doc_scores:
                doc_scores[doc_id] = 0.0
                doc_map[doc_id] = doc
            doc_scores[doc_id] += 1.0 / (rrf_k + rank + 1)

    add_rrf_scores(bm25_results)
    add_rrf_scores(vector_results)

    sorted_docs = sorted(doc_scores.items(), key=lambda item: item[1], reverse=True)

    filtered_results = [
        (doc_map[doc_id], float(score)) 
        for doc_id, score in sorted_docs[:top_k]
    ]

    return filtered_results