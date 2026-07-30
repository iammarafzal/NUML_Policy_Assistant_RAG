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
    # 1. Initialize BM25 if not pre-built
    if bm25_retriever is None:
        if not all_docs:
            raise ValueError("Must provide either 'all_docs' or an initialized 'bm25_retriever'")
        bm25_retriever = BM25Retriever.from_documents(all_docs)
        bm25_retriever.k = top_k * 2  # Fetch candidates for fusion

    # 2. Get Top Candidates from BM25 (Keyword Match)
    bm25_results = bm25_retriever.invoke(query)

    # 3. Get Top Candidates from ChromaDB (Semantic Match)
    vector_results_with_score = vector_store.similarity_search_with_score(
        query,
        k=top_k * 2
    )
    vector_results = [doc for doc, _ in vector_results_with_score]

    # 4. Perform Reciprocal Rank Fusion (RRF)
    doc_scores = {}
    doc_map = {}

    # Helper function to accumulate RRF scores
    def add_rrf_scores(doc_list):
        for rank, doc in enumerate(doc_list):
            # Create a unique key using page content and metadata
            doc_id = doc.page_content
            if doc_id not in doc_scores:
                doc_scores[doc_id] = 0.0
                doc_map[doc_id] = doc
            # Formula: 1 / (k + rank)
            doc_scores[doc_id] += 1.0 / (rrf_k + rank + 1)

    # Calculate fusion ranks
    add_rrf_scores(bm25_results)
    add_rrf_scores(vector_results)

    # 5. Sort documents by combined RRF score descending
    sorted_docs = sorted(doc_scores.items(), key=lambda item: item[1], reverse=True)

    # 6. Return top_k as list[tuple[Document, float]]
    filtered_results = [
        (doc_map[doc_id], float(score)) 
        for doc_id, score in sorted_docs[:top_k]
    ]

    return filtered_results