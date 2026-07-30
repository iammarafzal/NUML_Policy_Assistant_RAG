import chromadb
from langchain_chroma import Chroma
from config.settings import CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE, CHROMA_DB_PATH, CHROMA_COLLECTION_NAME

def _get_chroma_client():
    """
    Helper function to initialize the correct ChromaDB client.
    Returns a configured client (Cloud or Local) and a kwargs dict for Langchain.
    """
    if CHROMA_API_KEY:
        # Production: Chroma Cloud / Hosted Chroma
        client = chromadb.HttpClient(
            tenant=CHROMA_TENANT,
            database=CHROMA_DATABASE,
            headers={"x-chroma-token": CHROMA_API_KEY}
        )
        # We pass the client directly to Langchain
        return client, {"client": client}
    else:
        # Development: Local persistent ChromaDB
        return None, {"persist_directory": CHROMA_DB_PATH}


def create_vector_store(chunks, embeddings):
    """
    Creates the vector store by embedding and ingesting document chunks.
    Automatically routes to Cloud if CHROMA_API_KEY is set.
    """
    client, kwargs = _get_chroma_client()
    
    vector_store = Chroma.from_documents(
        collection_name=CHROMA_COLLECTION_NAME,
        documents=chunks,
        embedding=embeddings,
        **kwargs
    )

    return vector_store


def load_vector_store(embeddings):
    """
    Loads an existing vector store.
    Automatically routes to Cloud if CHROMA_API_KEY is set.
    """
    client, kwargs = _get_chroma_client()
    
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        embedding_function=embeddings,
        **kwargs
    )

    return vector_store
