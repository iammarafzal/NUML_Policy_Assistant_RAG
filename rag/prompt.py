from langchain_core.prompts import ChatPromptTemplate


def get_formatted_prompt(question, context):

    SYSTEM_PROMPT = """
    You are a NUML university Policy Assistant.

    Your job is answer ONLY using the provided context.

    Rules:

    1. Do NOT use your own knowledge.
    2. If the answer is not in the context, reply:
        "I couldn't find this information in the available university policy documents."
    3. Do NOT guess or make assumptions.
    4. If multiple retrived documents contain relevant information, combine them into one answer.
    5. Do NOT include citations. The application will display sources separately.
    6. Be clear, concise, and professional.

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
        "context":context,
        "question":question
    })

    return prompt
