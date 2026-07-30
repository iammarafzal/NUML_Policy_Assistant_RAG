import re
from dotenv import load_dotenv

from langchain_community.retrievers import BM25Retriever
from rag.embeddings import get_embedding_model
from rag.vector_store import load_vector_store
from rag.context import build_context_from_documents
from rag.retriever import retrieve_documents
from rag.prompt import build_prompt, CONDENSE_QUESTION_PROMPT
from rag.llm import get_llm
from rag.schemas import ResponseSchema
from config.settings import TOP_K

class RAGService:

    # Maximum conversational turns to retain in memory and feed to the LLM
    MAX_HISTORY_TURNS = 5  # Keeps memory lean and token usage under control

    def __init__(self):
        self.embeddings = get_embedding_model()
        self.vector_store = load_vector_store(self.embeddings)
        self.llm = get_llm()
        self.structured_llm = self.llm.with_structured_output(ResponseSchema)

        # -------------------------------------------------------------
        # Initialize BM25 Retriever once for hybrid search
        # -------------------------------------------------------------
        all_doc_dicts = self.vector_store.get(include=["documents", "metadatas"])
        
        from langchain_core.documents import Document
        all_docs = [
            Document(page_content=text, metadata=meta or {})
            for text, meta in zip(all_doc_dicts["documents"], all_doc_dicts["metadatas"])
        ]
        
        self.bm25_retriever = BM25Retriever.from_documents(all_docs)
        self.bm25_retriever.k = TOP_K * 2  # Fetch candidates for fusion

    def _need_rewriting(self, question: str) -> bool:
        if len(question.split()) < 6:
            return True

        contextual_triggers = [
            "it", "this", "that", "them", "these", "those", 
            "no", "instead", "what about", "how about", "and for"
        ]
        words = re.findall(r'\b\w+\b', question.lower())
        if any(trigger in words for trigger in contextual_triggers):
            return True

        return False

    def _generate_standalone_query(self, question: str, chat_history: list) -> str:
        if not chat_history:
            return question

        # Token Optimization: Only slice the recent N turns for query rewriting
        # chat_history format from frontend: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
        recent_history = chat_history[-(self.MAX_HISTORY_TURNS * 2):]
        formatted_history = []
        for msg in recent_history:
            if msg.get('role') == 'user':
                formatted_history.append(('human', msg.get('content', '')))
            elif msg.get('role') == 'assistant':
                formatted_history.append(('ai', msg.get('content', '')))

        chain = CONDENSE_QUESTION_PROMPT | self.llm
        response = chain.invoke({
            "chat_history": formatted_history,
            "question": question
        })

        standalone_query = response.content if isinstance(response.content, str) else str(response.content)
        return standalone_query

    def ask(self, question: str, chat_history: list = None) -> ResponseSchema:
        if chat_history is None:
            chat_history = []

        if chat_history and self._need_rewriting(question):
            search_query = self._generate_standalone_query(question, chat_history)
        else:
            search_query = question

        # Execute Hybrid RRF Retrieval (Vector + BM25)
        documents = retrieve_documents(
            vector_store=self.vector_store,
            all_docs=None,
            query=search_query,
            top_k=TOP_K,
            bm25_retriever=self.bm25_retriever
        )

        context = build_context_from_documents(documents)

        # Token Optimization: Only pass the pruned recent history into final generation prompt
        recent_history = chat_history[-(self.MAX_HISTORY_TURNS * 2):]
        formatted_history = []
        for msg in recent_history:
            if msg.get('role') == 'user':
                formatted_history.append(('human', msg.get('content', '')))
            elif msg.get('role') == 'assistant':
                formatted_history.append(('ai', msg.get('content', '')))

        prompt = build_prompt(
            question=question,
            context=context,
            chat_history=formatted_history
        )

        response = self.structured_llm.invoke(prompt)

        return response