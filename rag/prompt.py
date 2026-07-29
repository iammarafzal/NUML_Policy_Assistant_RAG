from langchain_core.prompts import ChatPromptTemplate


def build_prompt(question, context, chat_history=None):

    if chat_history is None:
        chat_history = []

    history_text = ""

    for turn in chat_history:
        history_text += f"User: {turn['user']}\nAssistant: {turn['assistant']}\n"

    SYSTEM_PROMPT = """
    You are a NUML university Policy Assistant.

    Your job is answer ONLY using the provided context.

    Rules:

    1. Do NOT use your own knowledge.
    2. If the answer is not in the context or history, reply:
        "I couldn't find this information in the available university policy documents."
    3. Do NOT guess or make assumptions.
    4. If multiple retrived documents contain relevant information, combine them into one answer.
    5. Do NOT include citations. The application will display sources separately.
    6. Be clear, concise, and professional.

    Previous Conversation History:
    {chat_history}

    Context:
    {context}

    Question:
    {question}

    Answer:
    """

    formatted_prompt = ChatPromptTemplate.from_template(
        template=SYSTEM_PROMPT,
    )

    prompt = formatted_prompt.invoke({
        "chat_history": history_text if history_text else "No prior history.",
        "context":context,
        "question":question
    })

    return prompt
