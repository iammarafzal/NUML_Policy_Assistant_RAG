from ingestion.loader import load_documents
from ingestion.splitter import split_documents
from rag.embeddings import get_embedding_model
from rag.vector_store import create_vector_store

print("Documents loading...")
documents = load_documents()

print(f"Loaded {len(documents)} pages\n")

print("Splitting documents into chunks...")
chunks = split_documents(documents)

print(f"Splitted the documents into {len(chunks)} chunks\n")

embeddings = get_embedding_model()

print("\nCreating vector database...")
vector_store = create_vector_store(chunks, embeddings)
print("\nDone! ChromaDB has been created successfully.")


