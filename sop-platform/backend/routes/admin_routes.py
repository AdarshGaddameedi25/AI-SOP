

import logging
import sqlalchemy

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db
from models.db_models import User, SOP, AuditLog, ComplianceReport, Approval
from services.response_service import (
    success_response,
    error_response,
    forbidden_response,
    not_found_response,
    server_error_response,
)
from services.serializer_service import serialize_user, serialize_sop_list, serialize_audit_log
from utils.helpers import log_action, parse_pagination_params
from constants import USER_ROLES, VALID_STATUSES, STATUS_DISPLAY_LABELS, STATUS_DISPLAY_COLORS

logger = logging.getLogger(__name__)
admin_bp = Blueprint("admin", __name__)


def _require_admin(user_id: int) -> tuple[User | None, str | None]:
    
    user = db.session.get(User, user_id)
    if user is None:
        return None, "Authenticated user not found."
    if user.role != "admin":
        return None, f"Access denied. This endpoint requires admin role. Your role: '{user.role}'."
    return user, None



@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
   
    try:
        user_id = int(get_jwt_identity())
        admin_user, auth_error = _require_admin(user_id)
        if auth_error:
            return forbidden_response(auth_error)

        page, limit = parse_pagination_params(request.args)

        role_filter = request.args.get("role", "").strip() or None
        if role_filter and role_filter not in USER_ROLES:
            return error_response(
                f"Invalid role filter. Valid roles: {', '.join(USER_ROLES)}.", 422
            )

        query = User.query.filter_by(is_deleted=False).order_by(User.created_at.desc())
        if role_filter:
            query = query.filter(User.role == role_filter)

        pagination = query.paginate(page=page, per_page=limit, error_out=False)

        return success_response({
            "users": [serialize_user(u) for u in pagination.items],
            "total": pagination.total,
            "page": page,
            "limit": limit,
            "pages": pagination.pages,
            "role_filter": role_filter,
        })

    except Exception:
        logger.exception("Error listing users.")
        return server_error_response()



@admin_bp.route("/users/<int:target_user_id>/role", methods=["PUT"])
@jwt_required()
def update_user_role(target_user_id: int):
    
    try:
        user_id = int(get_jwt_identity())
        admin_user, auth_error = _require_admin(user_id)
        if auth_error:
            return forbidden_response(auth_error)

        if target_user_id == user_id:
            return error_response(
                "Admins cannot change their own role to prevent accidental self-lockout. "
                "Have another Admin perform this operation.",
                403,
            )

        target_user = db.session.get(User, target_user_id)
        if target_user is None:
            return not_found_response(f"User with id {target_user_id} not found.")

        data = request.get_json(silent=True) or {}
        new_role = (data.get("role") or "").strip()

        if not new_role:
            return error_response("'role' field is required.", 422)

        if new_role not in USER_ROLES:
            return error_response(
                f"Invalid role '{new_role}'. Valid roles: {', '.join(USER_ROLES)}.", 422
            )

        old_role = target_user.role
        target_user.role = new_role
        db.session.commit()

        log_action(
            db, AuditLog, None, user_id, "USER_ROLE_CHANGED",
            f"Admin user_id={user_id} changed user '{target_user.username}' "
            f"(id={target_user_id}) role from '{old_role}' to '{new_role}'.",
        )

        logger.info(
            "User role changed: target_user_id=%s %s→%s by admin user_id=%s",
            target_user_id, old_role, new_role, user_id,
        )

        return success_response(
            serialize_user(target_user),
            f"User '{target_user.username}' role changed from '{old_role}' to '{new_role}'.",
        )

    except Exception:
        logger.exception("Error updating user role for user_id=%s.", target_user_id)
        db.session.rollback()
        return server_error_response()



@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    
    try:
        user_id = int(get_jwt_identity())
        _, auth_error = _require_admin(user_id)
        if auth_error:
            return forbidden_response(auth_error)

        sop_counts = {}
        for status in VALID_STATUSES:
            count = SOP.query.filter_by(status=status, is_deleted=False).count()
            sop_counts[status] = {
                "count": count,
                "label": STATUS_DISPLAY_LABELS.get(status, status),
                "color": STATUS_DISPLAY_COLORS.get(status, "gray"),
            }

        total_sops = SOP.query.filter_by(is_deleted=False).count()

        user_counts = {}
        for role in USER_ROLES:
            user_counts[role] = User.query.filter_by(role=role, is_deleted=False).count()

        total_users = User.query.filter_by(is_deleted=False).count()

        total_compliance_reports = ComplianceReport.query.count()

        from sqlalchemy import func
        avg_score_result = db.session.query(func.avg(ComplianceReport.score)).scalar()
        avg_compliance_score = round(float(avg_score_result), 1) if avg_score_result else None

        from datetime import datetime, timezone, timedelta
        since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_audit_count = AuditLog.query.filter(
            AuditLog.timestamp >= since_24h
        ).count()

        return success_response({
            "sops": {
                "total": total_sops,
                "by_status": sop_counts,
            },
            "users": {
                "total": total_users,
                "by_role": user_counts,
            },
            "compliance": {
                "total_reports": total_compliance_reports,
                "average_score": avg_compliance_score,
            },
            "audit": {
                "activity_last_24h": recent_audit_count,
            },
        })

    except Exception:
        logger.exception("Error generating admin dashboard.")
        return server_error_response()



@admin_bp.route("/workflow-activity", methods=["GET"])
@jwt_required()
def workflow_activity():
    try:
        user_id = int(get_jwt_identity())
        _, auth_error = _require_admin(user_id)
        if auth_error:
            return forbidden_response(auth_error)

        page, limit = parse_pagination_params(request.args)

        workflow_actions = [
            "SOP_SENT_FOR_REVIEW",
            "REVIEWER_APPROVED",
            "REVIEWER_REJECTED",
            "FINAL_APPROVED",
            "SOP_RESUBMITTED",
            "SOP_ARCHIVED",
        ]

        pagination = (
            AuditLog.query
            .filter(AuditLog.action.in_(workflow_actions))
            .order_by(AuditLog.timestamp.desc())
            .paginate(page=page, per_page=limit, error_out=False)
        )

        return success_response({
            "activity": [serialize_audit_log(entry) for entry in pagination.items],
            "total": pagination.total,
            "page": page,
            "limit": limit,
            "pages": pagination.pages,
        })

    except Exception:
        logger.exception("Error fetching workflow activity.")
        return server_error_response()



@admin_bp.route("/compliance-activity", methods=["GET"])
@jwt_required()
def compliance_activity():

    try:
        user_id = int(get_jwt_identity())
        _, auth_error = _require_admin(user_id)
        if auth_error:
            return forbidden_response(auth_error)

        page, limit = parse_pagination_params(request.args)

        pagination = (
            AuditLog.query
            .filter(AuditLog.action == "COMPLIANCE_CHECKED")
            .order_by(AuditLog.timestamp.desc())
            .paginate(page=page, per_page=limit, error_out=False)
        )

        return success_response({
            "compliance_events": [serialize_audit_log(entry) for entry in pagination.items],
            "total": pagination.total,
            "page": page,
            "limit": limit,
            "pages": pagination.pages,
        })

    except Exception:
        logger.exception("Error fetching compliance activity.")
        return server_error_response()



@admin_bp.route("/users/<int:target_user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(target_user_id: int):

    try:
        user_id = int(get_jwt_identity())
        admin_user, auth_error = _require_admin(user_id)
        if auth_error:
            return forbidden_response(auth_error)

        if target_user_id == user_id:
            return error_response("Admins cannot delete their own account.", 403)

        target_user = db.session.get(User, target_user_id)
        if target_user is None:
            return not_found_response(f"User with id {target_user_id} not found.")

        username = target_user.username
        
        target_user.is_deleted = True
        db.session.commit()
        
        log_action(
            db, AuditLog, None, user_id, "USER_DELETED",
            f"Admin user_id={user_id} soft deleted user '{username}' (id={target_user_id})."
        )
        logger.info("User soft deleted: target_user_id=%s by admin user_id=%s", target_user_id, user_id)
        
        return success_response(None, f"User '{username}' deleted successfully.")

    except Exception:
        logger.exception("Error deleting user_id=%s.", target_user_id)
        db.session.rollback()
        return server_error_response()

