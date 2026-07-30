from langchain_core.prompts import ChatPromptTemplate


CONDENSE_QUESTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", 
     "Given the chat history and a follow-up question, rephrase the follow-up question "
     "to be a standalone question that can be understood without the chat history. "
     "Do NOT answer the question, just rewrite it if needed, otherwise return it as is."),
    ("placeholder", "{chat_history}"),
    ("human", "{question}"),
])


def build_prompt(question, context, chat_history=None):

    if chat_history is None:
        chat_history = []

    history_text = ""

    for turn in chat_history:
        if isinstance(turn, tuple) and len(turn) == 2:
            role, content = turn
            if role == 'human':
                history_text += f"User: {content}\n"
            elif role == 'ai':
                history_text += f"Assistant: {content}\n"
        elif isinstance(turn, dict):
            # Fallback in case it's passed as a dict
            if 'user' in turn and 'assistant' in turn:
                history_text += f"User: {turn['user']}\nAssistant: {turn['assistant']}\n"
            elif 'role' in turn and 'content' in turn:
                role = "User" if turn['role'] == 'user' else "Assistant"
                history_text += f"{role}: {turn['content']}\n"

    SYSTEM_PROMPT = """
You are the NUML University Policy Assistant.

Your job is to answer queries ONLY using the provided context.

Rules:
1. Do NOT use your own knowledge.
2. If the answer is not in the context or history, reply:
   "I couldn't find this information in the available university policy documents."
3. Do NOT guess or make assumptions.
4. If multiple retrieved documents contain relevant information, combine them into one comprehensive answer.
5. Do NOT include inline citations (e.g., [Document.pdf]). The application renders sources separately.
6. FORMAT YOUR RESPONSE USING RICH MARKDOWN:
   - Use bold text (`**word**`) for important terms, thresholds, or requirements.
   - Use Markdown bullet points (`- `) or numbered lists (`1. `) for steps, conditions, or multi-item rules.
   - **CRITICAL:** You MUST use actual newline characters (`\n\n`) to format the response into separate paragraphs, lists, and tables. Do NOT return a single continuous line of text.
   - Use Markdown tables (`| Header | Header |`) whenever presenting structured data such as grading scales, GPA criteria, or fee structures.
   - Separate distinct sections using Markdown subheadings (`### Section Title`).
   - ALWAYS include `\n\n` before any subheading or list.
7. Be clear, concise, and professional.

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
