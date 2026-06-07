
import logging
from functools import wraps

from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import db
from services.response_service import forbidden_response, unauthorized_response

logger = logging.getLogger(__name__)


def role_required(required_role: str):

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as exc:
                logger.warning("JWT verification failed: %s", exc)
                return unauthorized_response("Valid authentication token required.")

            from models.db_models import User

            identity = get_jwt_identity()
            user_id = int(identity) if identity is not None else None
            user = db.session.get(User, user_id) if user_id is not None else None

            if user is None:
                return unauthorized_response("User account not found.")

            if user.role != required_role:
                logger.warning(
                    "Role check failed: user_id=%s has role '%s', required '%s'",
                    user.id,
                    user.role,
                    required_role,
                )
                return forbidden_response(
                    f"This action requires the '{required_role}' role."
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def get_current_user():
    from models.db_models import User

    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    return db.session.get(User, user_id) if user_id is not None else None

