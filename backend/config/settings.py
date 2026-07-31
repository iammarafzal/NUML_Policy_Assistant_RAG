import os
from dotenv import load_dotenv

load_dotenv()

TOP_K = 5

SIMILARITY_THRESHOLD = 1.0

# Local Chroma Database path
CHROMA_DB_PATH = "data/chroma_db"

# Chroma Cloud Settings (Optional, used if CHROMA_API_KEY is set)
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "default_tenant")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "default_database")

DOCUMENT_PATH = "data/documents"

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', "models/gemini-embedding-2")
EMBEDDING_DIMENSION = 768
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "numl_policy_gemini2_768")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

LLM_MODEL = os.getenv("LLM_MODEL", "gemini-3.1-flash-lite")