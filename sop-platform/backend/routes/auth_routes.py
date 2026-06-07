

import logging

from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
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
            role=DEFAULT_USER_ROLE, 
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

    try:
        data = request.get_json(silent=True) or {}

        is_valid, errors = validate_login_input(data)
        if not is_valid:
            return error_response("; ".join(errors), 422)

        email = data["email"].strip().lower()
        user = User.query.filter_by(email=email).first()

        if user is None or user.is_deleted or not check_password_hash(user.password_hash, data["password"]):
            return unauthorized_response("Invalid email or password.")

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        logger.info("User logged in: id=%s username=%s role=%s", user.id, user.username, user.role)

        return success_response(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": serialize_user(user),
            },
            message="Login successful.",
        )

    except Exception:
        logger.exception("Unexpected error during login.")
        return server_error_response()


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():

    try:
        user_id = get_jwt_identity()
        user = db.session.get(User, int(user_id))

        if user is None or user.is_deleted:
            return unauthorized_response("User account not found.")

        new_access_token = create_access_token(identity=user_id)
        logger.info("Access token refreshed for user_id=%s", user_id)

        return success_response(
            {"access_token": new_access_token, "user": serialize_user(user)},
            message="Token refreshed.",
        )

    except Exception:
        logger.exception("Unexpected error during token refresh.")
        return server_error_response()


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return success_response(None, message="Logged out successfully.")


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)

        if user is None or user.is_deleted:
            return unauthorized_response("User account not found.")

        return success_response(serialize_user(user))

    except Exception:
        logger.exception("Unexpected error fetching current user.")
        return server_error_response()
