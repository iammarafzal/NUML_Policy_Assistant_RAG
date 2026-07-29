from langchain_chroma import Chroma

def create_vector_store(chunks, embeddings):
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="data/chroma_db"
    )

    vector_store.persist()

    return vector_store


def load_vector_store(embeddings):
    vector_store = Chroma(
        embedding_function=embeddings,
        persist_directory="data/chroma_db",
    )


    return vector_store
