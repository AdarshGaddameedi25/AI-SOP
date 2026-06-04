"""
routes/audit_routes.py - Audit log viewer endpoints (Admin only).

Prefix: /api/v1/audit

Endpoints:
    GET /api/v1/audit/logs              → Paginated platform-wide audit log
    GET /api/v1/audit/sop/<sop_id>     → Audit trail for a specific SOP

Both endpoints require JWT authentication AND admin role.
"""

import logging

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db
from models.db_models import AuditLog, User, SOP
from services.response_service import (
    success_response,
    forbidden_response,
    not_found_response,
    server_error_response,
    error_response,
)
from services.serializer_service import serialize_audit_log
from utils.helpers import parse_pagination_params

logger = logging.getLogger(__name__)
audit_bp = Blueprint("audit", __name__)


def _require_admin(user_id: int) -> tuple[User | None, str | None]:
    """Load the user and verify they have admin role. Returns (user, error)."""
    user = db.session.get(User, user_id)
    if user is None:
        return None, "Authenticated user not found."
    if user.role != "admin":
        return None, "Access denied. Audit log requires admin role."
    return user, None



@audit_bp.route("/logs", methods=["GET"])
@jwt_required()
def get_audit_logs():
    """Return a paginated list of all audit log entries. Admin only."""
    try:
        user_id = int(get_jwt_identity())
        _, auth_error = _require_admin(user_id)
        if auth_error:
            if "denied" in auth_error:
                return forbidden_response(auth_error)
            return error_response(auth_error, 401)

        page, limit = parse_pagination_params(request.args)

        action_filter = request.args.get("action", "").strip() or None
        sop_id_filter = request.args.get("sop_id", "").strip() or None

        query = AuditLog.query.order_by(AuditLog.timestamp.desc())

        if action_filter:
            query = query.filter(AuditLog.action == action_filter.upper())

        if sop_id_filter:
            try:
                query = query.filter(AuditLog.sop_id == int(sop_id_filter))
            except (ValueError, TypeError):
                return error_response("'sop_id' filter must be an integer.", 422)

        pagination = query.paginate(page=page, per_page=limit, error_out=False)

        return success_response({
            "logs": [serialize_audit_log(entry) for entry in pagination.items],
            "total": pagination.total,
            "page": page,
            "limit": limit,
            "pages": pagination.pages,
        })

    except Exception:
        logger.exception("Error fetching audit logs.")
        return server_error_response()



@audit_bp.route("/sop/<int:sop_id>", methods=["GET"])
@jwt_required()
def get_sop_audit_trail(sop_id: int):
    """Return all audit log entries for a specific SOP. Admin only."""
    try:
        user_id = int(get_jwt_identity())
        _, auth_error = _require_admin(user_id)
        if auth_error:
            if "denied" in auth_error:
                return forbidden_response(auth_error)
            return error_response(auth_error, 401)

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        page, limit = parse_pagination_params(request.args)

        pagination = (
            AuditLog.query
            .filter_by(sop_id=sop_id)
            .order_by(AuditLog.timestamp.desc())
            .paginate(page=page, per_page=limit, error_out=False)
        )

        return success_response({
            "sop_id": sop_id,
            "sop_title": sop.title,
            "sop_number": sop.sop_number,
            "logs": [serialize_audit_log(entry) for entry in pagination.items],
            "total": pagination.total,
            "page": page,
            "limit": limit,
            "pages": pagination.pages,
        })

    except Exception:
        logger.exception("Error fetching audit trail for sop_id=%s.", sop_id)
        return server_error_response()
