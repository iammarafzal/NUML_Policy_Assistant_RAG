from langchain_google_genai import ChatGoogleGenerativeAI
from config.settings import LLM_MODEL

def get_llm():

    llm = ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=0,
    )

    return llm
