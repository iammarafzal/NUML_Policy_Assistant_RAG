from langchain_core.documents import Document

def retrieve_documents(
        vector_store,
        query,
        TOP_K = 5,
        SIMILARITY_THRESHOLD = 1.0
    ) -> list[tuple[Document, float]]:
    results = vector_store.similarity_search_with_score(
    query,
    k=TOP_K
    )

    filtered_results = []

    for doc, score in results:
        if score <= SIMILARITY_THRESHOLD:
            filtered_results.append({
                "document": doc,
                "score": score
            })

    return filtered_results
