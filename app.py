from flask import Flask, render_template, request, jsonify
from rag.service import RAGService

app = Flask(__name__, template_folder="web/templates", static_folder="web/static")

rag = RAGService()


@app.route("/", methods=["GET"])
def home():
    return render_template('index.html')


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get('question', '')

    if not question:
        return jsonify({"error": "Empty question"}), 400

    result = rag.ask(question)
    sources = [source.model_dump() for source in result.sources]

    return jsonify({
        'question': question,
        'answer': result.answer,
        'sources': sources
    })

if __name__ == "__main__":
    app.run(debug=True)