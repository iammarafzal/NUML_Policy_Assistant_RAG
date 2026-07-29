from rag.service import RAGService

rag = RAGService()

while True:
    question = input("Question: ")

    response = rag.ask(question)

    print(response.answer)
    print(response.sources)