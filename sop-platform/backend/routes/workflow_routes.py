

import logging

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db
from models.db_models import SOP, AuditLog, Approval, User
from services import workflow_service
from services.response_service import (
    success_response,
    error_response,
    forbidden_response,
    server_error_response,
)

logger = logging.getLogger(__name__)
workflow_bp = Blueprint("workflow", __name__)


def _get_current_user(user_id: int):
   
    return db.session.get(User, user_id)


def _map_error_code(error: str) -> int:

    lower = error.lower()
    if "not found" in lower:
        return 404
    if any(k in lower for k in ("role", "permission", "not permitted", "author", "only")):
        return 403
    return 400



@workflow_bp.route("/<int:sop_id>/submit-review", methods=["POST"])
@jwt_required()
def submit_for_review(sop_id: int):
    
    try:
        user_id = int(get_jwt_identity())
        user = _get_current_user(user_id)
        if user is None:
            return error_response("Authenticated user not found.", 401)

        sop, error = workflow_service.submit_for_review(
            db=db, SOP=SOP, AuditLog=AuditLog, Approval=Approval, User=User,
            sop_id=sop_id, user_id=user_id, user_role=user.role,
        )

        if error:
            return error_response(error, _map_error_code(error))

        logger.info("SOP %s submitted for review by author user_id=%s", sop_id, user_id)
        return success_response(sop, message="SOP submitted for Reviewer quality gate.")

    except Exception:
        logger.exception("Error submitting SOP %s for review.", sop_id)
        return server_error_response()



@workflow_bp.route("/<int:sop_id>/reviewer-approve", methods=["POST"])
@jwt_required()
def reviewer_approve(sop_id: int):

    try:
        user_id = int(get_jwt_identity())
        user = _get_current_user(user_id)
        if user is None:
            return error_response("Authenticated user not found.", 401)

        data = request.get_json(silent=True) or {}
        comments = (data.get("comments") or "").strip() or None

        sop, error = workflow_service.reviewer_approve_sop(
            db=db, SOP=SOP, AuditLog=AuditLog, Approval=Approval, User=User,
            sop_id=sop_id, user_id=user_id, user_role=user.role,
            comments=comments,
        )

        if error:
            return error_response(error, _map_error_code(error))

        logger.info("SOP %s reviewer-approved by user_id=%s", sop_id, user_id)
        return success_response(
            sop,
            message="SOP approved at review stage. Sent to Approver for final authorization.",
        )

    except Exception:
        logger.exception("Error during reviewer approval of SOP %s.", sop_id)
        return server_error_response()



@workflow_bp.route("/<int:sop_id>/reviewer-reject", methods=["POST"])
@jwt_required()
def reviewer_reject(sop_id: int):
    
    try:
        user_id = int(get_jwt_identity())
        user = _get_current_user(user_id)
        if user is None:
            return error_response("Authenticated user not found.", 401)

        data = request.get_json(silent=True) or {}
        comments = (data.get("comments") or "").strip()

        if not comments:
            return error_response(
                "'comments' are required when rejecting an SOP. "
                "Provide actionable feedback for the Author.",
                422,
            )

        sop, error = workflow_service.reviewer_reject_sop(
            db=db, SOP=SOP, AuditLog=AuditLog, Approval=Approval, User=User,
            sop_id=sop_id, user_id=user_id, user_role=user.role,
            comments=comments,
        )

        if error:
            return error_response(error, _map_error_code(error))

        logger.info("SOP %s reviewer-rejected by user_id=%s", sop_id, user_id)
        return success_response(
            sop,
            message="SOP rejected at review stage. Author has been notified via audit trail.",
        )

    except Exception:
        logger.exception("Error during reviewer rejection of SOP %s.", sop_id)
        return server_error_response()



@workflow_bp.route("/<int:sop_id>/final-approve", methods=["POST"])
@jwt_required()
def final_approve(sop_id: int):
    
    try:
        user_id = int(get_jwt_identity())
        user = _get_current_user(user_id)
        if user is None:
            return error_response("Authenticated user not found.", 401)

        data = request.get_json(silent=True) or {}
        comments = (data.get("comments") or "").strip() or None

        sop, error = workflow_service.final_approve_sop(
            db=db, SOP=SOP, AuditLog=AuditLog, Approval=Approval, User=User,
            sop_id=sop_id, user_id=user_id, user_role=user.role,
            comments=comments,
        )

        if error:
            return error_response(error, _map_error_code(error))

        logger.info("SOP %s final-approved by approver user_id=%s", sop_id, user_id)
        return success_response(
            sop,
            message="SOP granted final authorization. Document is now officially approved.",
        )

    except Exception:
        logger.exception("Error during final approval of SOP %s.", sop_id)
        return server_error_response()



@workflow_bp.route("/<int:sop_id>/resubmit", methods=["POST"])
@jwt_required()
def resubmit_sop(sop_id: int):
    try:
        user_id = int(get_jwt_identity())
        user = _get_current_user(user_id)
        if user is None:
            return error_response("Authenticated user not found.", 401)

        sop, error = workflow_service.resubmit_sop(
            db=db, SOP=SOP, AuditLog=AuditLog, Approval=Approval, User=User,
            sop_id=sop_id, user_id=user_id, user_role=user.role,
        )

        if error:
            return error_response(error, _map_error_code(error))

        logger.info("SOP %s resubmitted to draft by author user_id=%s", sop_id, user_id)
        return success_response(sop, message="SOP returned to draft for revision.")

    except Exception:
        logger.exception("Error resubmitting SOP %s.", sop_id)
        return server_error_response()



@workflow_bp.route("/<int:sop_id>/archive", methods=["POST"])
@jwt_required()
def archive_sop(sop_id: int):
    try:
        user_id = int(get_jwt_identity())
        user = _get_current_user(user_id)
        if user is None:
            return error_response("Authenticated user not found.", 401)

        sop, error = workflow_service.archive_sop(
            db=db, SOP=SOP, AuditLog=AuditLog, Approval=Approval, User=User,
            sop_id=sop_id, user_id=user_id, user_role=user.role,
        )

        if error:
            return error_response(error, _map_error_code(error))

        logger.info("SOP %s archived by admin user_id=%s", sop_id, user_id)
        return success_response(sop, message="SOP archived successfully.")

    except Exception:
        logger.exception("Error archiving SOP %s.", sop_id)
        return server_error_response()



@workflow_bp.route("/<int:sop_id>/approve", methods=["POST"])
@jwt_required()
def deprecated_approve(sop_id: int):
    return error_response(
        "This endpoint has been deprecated. "
        "Use POST /workflow/<id>/reviewer-approve (Reviewer) "
        "or POST /workflow/<id>/final-approve (Approver) instead.",
        410,
    )


@workflow_bp.route("/<int:sop_id>/reject", methods=["POST"])
@jwt_required()
def deprecated_reject(sop_id: int):
    return error_response(
        "This endpoint has been deprecated. "
        "Use POST /workflow/<id>/reviewer-reject (Reviewer) instead.",
        410,
    )
