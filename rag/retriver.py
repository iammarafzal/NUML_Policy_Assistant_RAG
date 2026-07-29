
def get_retrieved_and_filtered_documents(
        vector_store,
        query,
        TOP_K = 5,
        SIMILARITY_THRESHOLD = 1.0
    ) -> list:
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
