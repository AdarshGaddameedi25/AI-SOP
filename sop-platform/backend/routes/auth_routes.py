"""
routes/auth_routes.py — Authentication endpoints (register, login, me).

Enterprise registration policy:
  - Self-registration is open (anyone can register)
  - All new users default to 'author' role
  - Admin uses /api/v1/admin/users/<id>/role to promote users to reviewer/approver/admin

Prefix: /api/v1/auth
"""

import logging

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

from models import db
from models.db_models import User, AuditLog
from validators.input_validators import validate_register_input, validate_login_input
from services.response_service import (
    success_response,
    created_response,
    error_response,
    server_error_response,
    unauthorized_response,
)
from services.serializer_service import serialize_user
from utils.helpers import log_action
from constants import DEFAULT_USER_ROLE

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)



@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user account.

    Enterprise policy: all self-registered users receive the 'author' role.
    Role upgrades (reviewer, approver, admin) must be performed by an Admin
    via PUT /api/v1/admin/users/<id>/role.

    Any 'role' field in the registration body is ignored for security.
    """
    try:
        data = request.get_json(silent=True) or {}

        is_valid, errors = validate_register_input(data)
        if not is_valid:
            return error_response("; ".join(errors), 422)

        email = data["email"].strip().lower()
        username = data["username"].strip()

        if User.query.filter_by(email=email).first():
            return error_response("An account with this email already exists.", 409)

        if User.query.filter_by(username=username).first():
            return error_response("This username is already taken.", 409)

        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(data["password"]),
            role=DEFAULT_USER_ROLE,  # Always 'author' — Admin promotes later
        )
        db.session.add(new_user)
        db.session.commit()

        logger.info("New user registered: id=%s username=%s", new_user.id, new_user.username)
        log_action(db, AuditLog, None, new_user.id, "USER_REGISTERED",
                   f"User '{new_user.username}' registered with default role '{DEFAULT_USER_ROLE}'.")

        return created_response(
            serialize_user(new_user),
            f"Account created successfully. Your role is '{DEFAULT_USER_ROLE}'. "
            f"Contact your Admin to be assigned a different role.",
        )

    except Exception:
        logger.exception("Unexpected error during user registration.")
        db.session.rollback()
        return server_error_response()



@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and return a JWT access token."""
    try:
        data = request.get_json(silent=True) or {}

        is_valid, errors = validate_login_input(data)
        if not is_valid:
            return error_response("; ".join(errors), 422)

        email = data["email"].strip().lower()
        user = User.query.filter_by(email=email).first()

        if user is None or user.is_deleted or not check_password_hash(user.password_hash, data["password"]):
            return unauthorized_response("Invalid email or password.")

        token = create_access_token(identity=str(user.id))
        logger.info("User logged in: id=%s username=%s role=%s", user.id, user.username, user.role)

        return success_response(
            {"access_token": token, "user": serialize_user(user)},
            message="Login successful.",
        )

    except Exception:
        logger.exception("Unexpected error during login.")
        return server_error_response()



@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Return the currently authenticated user's profile."""
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)

        if user is None or user.is_deleted:
            return unauthorized_response("User account not found.")

        return success_response(serialize_user(user))

    except Exception:
        logger.exception("Unexpected error fetching current user.")
        return server_error_response()
