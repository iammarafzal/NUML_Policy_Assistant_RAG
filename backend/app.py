import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from rag.service import RAGService
from middleware import setup_middleware, limiter

app = Flask(__name__)
frontend_url = os.environ.get("FRONTEND_URL", "*")
CORS(app, origins=[frontend_url] if frontend_url != "*" else "*")

setup_middleware(app)

rag = RAGService()


@app.route("/", methods=["GET"])
@limiter.exempt
def home():
    return jsonify({"status": "healthy", "service": "NUML Policy Assistant API"})


@app.route("/ask", methods=["POST"])
@limiter.limit("5/minute;30/hour")
def ask():
    data = request.get_json()
    question = data.get('question', '')
    history = data.get('history', [])

    if not question:
        return jsonify({"error": "Empty question"}), 400

    result = rag.ask(question, chat_history=history)

    return jsonify({
        'question': question,
        'answer': result['answer'],
        'sources': result['sources']
    })



if __name__ == "__main__":
    app.run(debug=True)