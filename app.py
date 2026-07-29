from flask import Flask, render_template, request
from rag.service import RAGService


app = Flask(
    __name__,
    template_folder="web/templates",
    static_folder="web/static"
    )

rag = RAGService()

@app.route("/", methods=["GET", "POST"])
def home():
    answer = None
    sources = []

    if request.method == "POST":
        question = request.form['question']

        result = rag.ask(question)

        answer = result.answer
        sources = result.sources

    return render_template(
        'index.html',
        answer=answer,
        sources=sources
    )

if __name__ == "__main__":
    app.run(debug=True)
    