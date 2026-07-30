from langchain_google_genai import GoogleGenerativeAIEmbeddings
from config.settings import EMBEDDING_MODEL, GEMINI_API_KEY


def get_embedding_model():
    try:
        return GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL,
            google_api_key=GEMINI_API_KEY,
            model_kwargs={"output_dimensionality": 768}
        )
    except TypeError:
        return GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL,
            google_api_key=GEMINI_API_KEY
        )