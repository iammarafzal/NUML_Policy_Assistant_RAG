import os
import logging
from ingestion.loader import load_documents
from ingestion.splitter import split_documents
from rag.embeddings import get_embedding_model
from rag.vector_store import create_vector_store

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def ingest():

    logging.info("Documents loading...")
    documents = load_documents()

    logging.info(f"Loaded {len(documents)} pages")

    logging.info("Splitting documents into chunks...")
    chunks = split_documents(documents)

    logging.info(f"Splitted the documents into {len(chunks)} chunks")

    embeddings = get_embedding_model()

    if os.getenv("CHROMA_API_KEY"):
        logging.info("Creating vector database on Chroma Cloud...")
    else:
        logging.info("Creating vector database locally...")
        
    vector_store = create_vector_store(chunks, embeddings)
    logging.info("Done! ChromaDB has been created successfully.")

if __name__ == "__main__":
    ingest()
