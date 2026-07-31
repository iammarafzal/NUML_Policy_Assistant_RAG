# NUML Policy Assistant (RAG Application)

This is a Retrieval-Augmented Generation (RAG) application designed to assist students and staff at the National University of Modern Languages (NUML) with university regulations, examination rules, and policies.

## Features
- **Smart AI Chat**: Answers complex policy questions accurately using hybrid retrieval (Vector Embeddings + BM25).
- **Source Citations**: Clearly lists exact official documents and page numbers used to generate answers.
- **Dynamic Vector Database**: Seamlessly switches between a local Chroma DB during development and Chroma Cloud for production.
- **Modern UI**: Fully responsive frontend featuring Dark/Light modes, clean chat bubbles, and mobile optimization.

## Tech Stack
- **Backend:** Python, Flask
- **AI / LLM:** LangChain, Google Gemini (`gemini-3.1-flash-lite`), HuggingFace Embeddings (`BAAI/bge-small-en-v1.5`)
- **Database:** ChromaDB (Local & Cloud)
- **Frontend:** React, Vite, TailwindCSS, ReactMarkdown

## Setup Instructions

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env` and fill in your API keys.
   ```bash
   cp .env.example .env
   ```

4. Run the data ingestion script (only needed to build the database from scratch):
   ```bash
   python ingest_to_chroma_cloud.py
   ```

5. Run the Flask application locally:
   ```bash
   python app.py
   ```

6. Setup and run the frontend:
   Open a new terminal and navigate to the `frontend` directory.
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Production Deployment (Render)
This application is pre-configured to be deployed on platforms like Render.
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn wsgi:app`
- Make sure to set `GOOGLE_API_KEY`, `CHROMA_API_KEY`, `CHROMA_TENANT`, and `CHROMA_DATABASE` in your hosting provider's environment variables.