from flask import request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

# Initialize Limiter (without app)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per day"],
    storage_uri="memory://",
    default_limits_exempt_when=lambda: request.method == 'OPTIONS'
)

def setup_middleware(app):
    """
    Apply middleware configurations to the Flask app.
    """
    # 1. Configure proxy handling for Render (extract real IP from X-Forwarded-For)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # 2. Attach Limiter to app
    limiter.init_app(app)

    # 3. Register custom 429 Error Handler
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "You have made too many policy requests. Please wait a minute before asking another question.",
            "retry_after": e.description
        }), 429
