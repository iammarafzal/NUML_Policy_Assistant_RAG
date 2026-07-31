def build_context_from_documents(retrived_results):

    context = ""

    for idx, (doc, score) in enumerate(retrived_results):
        source = doc.metadata.get('source', 'Unknown')
        page = doc.metadata.get('page', 'Unknown')

        context += (
            f"Chunk ID: chunk_{idx}\n"
            f"Source: {source}\n"
            f"Page: {page}\n"
            f"Relevance Score: {score}\n"
            f"{doc.page_content}\n\n"
        )

    return context
