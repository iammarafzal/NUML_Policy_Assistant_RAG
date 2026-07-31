from app import app

if __name__ == "__main__":
    # This entry point is used by production WSGI servers like Gunicorn.
    # Example: gunicorn wsgi:app
    app.run()
