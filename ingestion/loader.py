from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_documents():
    loader = PyPDFDirectoryLoader("documents")
    docs = loader.load()

    return docs
