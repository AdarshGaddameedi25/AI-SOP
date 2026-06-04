"""
app.py - Flask application factory and entry point.
"""

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def create_app(config_class=Config) -> Flask:
    """Application factory - creates and fully configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise EnvironmentError("DATABASE_URL is not set in the environment.")
    if not app.config.get("JWT_SECRET_KEY"):
        raise EnvironmentError("JWT_SECRET_KEY is not set in the environment.")
    if len(app.config.get("JWT_SECRET_KEY", "")) < 32:
        raise EnvironmentError("JWT_SECRET_KEY must be at least 32 characters long.")
    if not app.config.get("TESTING") and not app.config.get("GEMINI_API_KEY"):
        raise EnvironmentError("GEMINI_API_KEY is not set in the environment.")

    gemini_key = app.config.get("GEMINI_API_KEY")
    if gemini_key:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        logger.info("Gemini API configured at startup.")

    db.init_app(app)
    JWTManager(app)

    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}})

    from routes.auth_routes import auth_bp
    from routes.sop_routes import sop_bp
    from routes.compliance_routes import compliance_bp
    from routes.workflow_routes import workflow_bp
    from routes.export_routes import export_bp
    from routes.audit_routes import audit_bp
    from routes.admin_routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(sop_bp, url_prefix="/api/v1/sop")
    app.register_blueprint(compliance_bp, url_prefix="/api/v1/compliance")
    app.register_blueprint(workflow_bp, url_prefix="/api/v1/workflow")
    app.register_blueprint(export_bp, url_prefix="/api/v1/export")
    app.register_blueprint(audit_bp, url_prefix="/api/v1/audit")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")

    @app.route("/api/v1/health", methods=["GET"])
    def health():
        """Public liveness check."""
        return jsonify({"success": True, "data": {"status": "ok"}}), 200

    with app.app_context():
        import models.db_models  # noqa: F401
        db.create_all()
        logger.info("Database tables verified / created.")

    logger.info("Flask application created successfully.")
    return app


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(host="0.0.0.0", port=5001, debug=True)

