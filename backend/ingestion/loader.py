from pathlib import Path
from langchain_community.document_loaders import PyMuPDFLoader


def load_documents(data_dir="data/documents"):
    data_dir = Path(data_dir)
    docs = []

    for pdf_path in data_dir.glob('*.pdf'):
        loader = PyMuPDFLoader(str(pdf_path))
        docs.extend(loader.load())

    return docs
