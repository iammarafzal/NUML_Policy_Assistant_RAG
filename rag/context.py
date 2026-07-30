def build_context_from_documents(retrived_results):

    context = ""

    for doc, score in retrived_results:
        source = doc.metadata.get('source', 'Unknown')
        page = doc.metadata.get('page', 'Unknown')

        context += (
            f"Source: {source}\n"
            f"Page: {page}\n"
            f"Relevance Score: {score}\n"
            f"{doc.page_content}\n\n"
        )

    return context
