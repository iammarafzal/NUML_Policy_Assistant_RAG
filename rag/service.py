from rag.embeddings import get_embedding_model
from rag.vector_store import load_vector_store
from rag.context import build_context_from_documents
from rag.retriver import retrieve_documents
from rag.prompt import build_prompt
from rag.llm import get_llm
from rag.schemas import ResponseSchema
from config.settings import TOP_K, SIMILARITY_THRESHOLD
from dotenv import load_dotenv

load_dotenv()

class RAGService:

    def __init__(self):
        self.embeddings = get_embedding_model()
        self.vector_store = load_vector_store(self.embeddings)
        self.llm = get_llm()
        self.structured_llm = self.llm.with_structured_output(ResponseSchema)

        self.chat_history = []


    def ask(self, question: str) -> ResponseSchema:

        documents = retrieve_documents(
            self.vector_store,
            question,
            TOP_K,
            SIMILARITY_THRESHOLD
        )

        if not documents:
            response = "\nI couldn't find relevant information in the university policy documents."
            return ResponseSchema(
                answer=response,
                sources=[]
            )

        context = build_context_from_documents(documents)

        prompt = build_prompt(
            question=question,
            context=context,
            chat_history=self.chat_history
        )

        response = self.structured_llm.invoke(prompt)

        self.chat_history.append({
            "user": question,
            "assistant": response.answer
        })
        
        return response
