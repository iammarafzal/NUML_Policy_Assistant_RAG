import os
import time
import hashlib
from dotenv import load_dotenv
from tqdm import tqdm
from tenacity import retry, wait_exponential, stop_after_attempt

# LangChain imports
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Project imports
from ingestion.loader import load_documents
from ingestion.splitter import split_documents

# Chroma DB imports
import chromadb

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY") or os.getenv("CHROMA_AUTH_TOKEN")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")
CHROMA_HOST = os.getenv("CHROMA_HOST", "api.trychroma.com")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "numl_policy_gemini2_768")
DATA_DIR = os.getenv("DATA_DIR", "data/documents")

def validate_environment():
    """Validates that all required environment variables are set."""
    missing = []
    if not GEMINI_API_KEY: missing.append("GEMINI_API_KEY")
    if not CHROMA_API_KEY: missing.append("CHROMA_API_KEY (or CHROMA_AUTH_TOKEN)")
    if not CHROMA_TENANT: missing.append("CHROMA_TENANT")
    if not CHROMA_DATABASE: missing.append("CHROMA_DATABASE")
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

def get_chroma_client():
    """Initializes and returns the Chroma CloudClient."""
    print(f"Connecting to Chroma Cloud (Tenant: {CHROMA_TENANT}, Database: {CHROMA_DATABASE})...")
    # For custom hosts, chromadb.HttpClient can also be used, but CloudClient is default for api.trychroma.com
    client = chromadb.CloudClient(
        tenant=CHROMA_TENANT,
        database=CHROMA_DATABASE,
        api_key=CHROMA_API_KEY,
    )
    return client

def load_and_chunk_documents(data_dir: str):
    """Loads PDFs using the project's PyMuPDFLoader and splits them."""
    print(f"Loading documents from {data_dir} using ingestion.loader...")
    documents = load_documents(data_dir)
    
    if not documents:
        print("No documents found.")
        return []

    print(f"Loaded {len(documents)} document pages/files.")

    print("Chunking documents using ingestion.splitter...")
    chunks = split_documents(documents)
    print(f"Split into {len(chunks)} chunks.")
    return chunks

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1.5, min=4, max=30),
    reraise=True
)
def embed_and_upload_batch(collection, embeddings, texts, metadatas, ids):
    """
    Embeds texts and upserts them into Chroma.
    Wrapped in a retry block for fault tolerance against 429 errors or network glitches.
    """
    # Langchain's GoogleGenerativeAIEmbeddings handles embedding under the hood
    vector_embeddings = embeddings.embed_documents(texts)
    
    # Direct upsert to Chroma Cloud
    collection.upsert(
        ids=ids,
        embeddings=vector_embeddings,
        metadatas=metadatas,
        documents=texts
    )

def main():
    # 1. Environment Check
    validate_environment()

    # 2. Initialize Gemini Embeddings
    print("Initializing Gemini Embeddings...")
    try:
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-2",
            google_api_key=GEMINI_API_KEY,
            model_kwargs={"output_dimensionality": 768}
        )
    except TypeError:
        # Fallback if the installed version of langchain-google-genai doesn't support model_kwargs
        print("Note: model_kwargs not supported in this LangChain version. Falling back to default dims.")
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-2",
            google_api_key=GEMINI_API_KEY
        )

    # 3. Setup Chroma
    chroma_client = get_chroma_client()
    collection = chroma_client.get_or_create_collection(
        name=CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    print(f"Using Chroma Collection: {collection.name}")

    # 4. Load & Chunk
    chunks = load_and_chunk_documents(DATA_DIR)
    
    if not chunks:
        print(f"No chunks to process. Ensure documents exist in {DATA_DIR}.")
        return

    # 5. Config Rate Limit & Batching
    BATCH_SIZE = 12         # Small batches (10-15)
    DELAY_SECONDS = 4.5     # Strict wait to respect 15 RPM limit on Google's free tier
    RESUME_INDEX = 996      # Start from the failed index to avoid rate limits
    
    # 6. Ingest
    print(f"Starting vector ingestion pipeline from index {RESUME_INDEX}...")
    with tqdm(total=len(chunks), initial=RESUME_INDEX, desc="Uploading Chunks", unit="chunk") as pbar:
        for i in range(RESUME_INDEX, len(chunks), BATCH_SIZE):
            batch_chunks = chunks[i : i + BATCH_SIZE]
            
            texts = [chunk.page_content for chunk in batch_chunks]
            metadatas = [chunk.metadata for chunk in batch_chunks]
            
            # Generate deterministic IDs for idempotency
            ids = []
            for idx, chunk in enumerate(batch_chunks):
                source = chunk.metadata.get("source", "unknown")
                page = chunk.metadata.get("page", 0)
                global_idx = i + idx
                
                # Create a stable ID using hash of the source, page, and chunk index
                hash_input = f"{source}_{page}_{global_idx}"
                doc_id = hashlib.md5(hash_input.encode()).hexdigest()
                ids.append(f"chunk_{doc_id}")
            
            try:
                embed_and_upload_batch(collection, embeddings, texts, metadatas, ids)
            except Exception as e:
                print(f"\nFailed to process batch starting at index {i} after retries: {e}")
                raise e
            
            pbar.update(len(batch_chunks))
            
            # Rate limiting enforcement
            if i + BATCH_SIZE < len(chunks):
                time.sleep(DELAY_SECONDS)

    print("\nIngestion completed successfully! 🎉")

if __name__ == "__main__":
    main()
