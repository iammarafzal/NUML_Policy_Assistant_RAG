def build_context(documents):

    context = ""

    for doc in documents:
        source = doc.metadata['source']
        page = doc.metadata['page']

        context += (
            f"Source: {source}\n"
            f"Page: {page}\n"
            f"{doc.page_content}\n\n"
        )

    return context
