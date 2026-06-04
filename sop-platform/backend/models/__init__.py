"""
models/__init__.py - Exposes the shared SQLAlchemy db instance.
Import db from here (or from app.py) to avoid circular imports.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
