"""
routes/compliance_routes.py — Compliance check and report endpoints.

Compliance Segregation Rules (Enterprise Policy):
  - POST /compliance/validate      → REVIEWER ONLY (trigger compliance check)
  - GET  /compliance/<id>/report   → REVIEWER + ADMIN only (read latest report)
  - Authors and Approvers are FULLY BLOCKED from all compliance data.

This implements realistic enterprise review segregation:
  Authors must not self-audit their own documents.
  Compliance grading is an independent quality assurance function.

Prefix: /api/v1/compliance
"""

import logging

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db
from models.db_models import SOP, ComplianceReport, AuditLog, User
from services import compliance_service
from services.serializer_service import serialize_compliance_report
from services.response_service import (
    error_response,
    success_response,
    forbidden_response,
    not_found_response,
    server_error_response,
)
from utils.helpers import log_action
from constants import COMPLIANCE_TRIGGER_ROLES, COMPLIANCE_ALLOWED_ROLES

logger = logging.getLogger(__name__)
compliance_bp = Blueprint("compliance", __name__)


def _get_user(user_id: int) -> User | None:
    """Load the User ORM object for the authenticated user_id."""
    return db.session.get(User, user_id)



@compliance_bp.route("/validate", methods=["POST"])
@jwt_required()
def validate_compliance():
    """
    Run a full compliance check on an SOP and persist the report.

    RESTRICTED: Reviewer role only.
    Authors must not self-audit. Approvers review business fit, not compliance.

    The SOP must be in 'under_review' status for compliance to be triggered.
    This enforces that compliance is only evaluated at the quality gate stage.
    """
    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        if user.role not in COMPLIANCE_TRIGGER_ROLES:
            return forbidden_response(
                f"Access denied. Compliance checks can only be triggered by: "
                f"{', '.join(COMPLIANCE_TRIGGER_ROLES)}. "
                f"Your role '{user.role}' does not have this permission. "
                f"This enforces enterprise compliance segregation — authors cannot self-audit."
            )

        data = request.get_json(silent=True) or {}
        sop_id = data.get("sop_id")

        if sop_id is None:
            return error_response("'sop_id' is required.", 422)

        try:
            sop_id = int(sop_id)
        except (TypeError, ValueError):
            return error_response("'sop_id' must be an integer.", 422)

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        if sop.status != "under_review":
            return error_response(
                f"Compliance checks can only be run on SOPs in 'under_review' status. "
                f"This SOP is currently '{sop.status}'. "
                f"Submit the SOP for review first.",
                409,
            )

        logger.info(
            "Compliance check triggered: sop_id=%s reviewer_user_id=%s", sop_id, user_id
        )

        report, svc_error = compliance_service.run_full_compliance_check(
            db=db,
            SOP=SOP,
            ComplianceReport=ComplianceReport,
            sop_id=sop_id,
            triggered_by_user_id=user_id,
        )

        if svc_error:
            if "not found" in svc_error.lower():
                return not_found_response(svc_error)
            return error_response(svc_error, 400)

        log_action(
            db, AuditLog, sop_id, user_id, "COMPLIANCE_CHECKED",
            f"Compliance check completed for SOP id {sop_id} by reviewer. "
            f"Score: {report['score']}, Classification: {report['classification']}.",
        )

        return success_response(report, message="Compliance check completed.")

    except Exception:
        logger.exception("Unexpected error during compliance validation.")
        return server_error_response()



@compliance_bp.route("/<int:sop_id>/report", methods=["GET"])
@jwt_required()
def get_compliance_report(sop_id: int):
    """
    Fetch the latest compliance report for an SOP.

    RESTRICTED: Reviewer and Admin roles only.
    - Reviewer: needs it to assess quality during review
    - Admin: read-only governance oversight
    - Author and Approver: BLOCKED (compliance data must remain segregated)
    """
    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        if user.role not in COMPLIANCE_ALLOWED_ROLES:
            return forbidden_response(
                f"Access denied. Compliance reports are restricted to: "
                f"{', '.join(COMPLIANCE_ALLOWED_ROLES)}. "
                f"Your role '{user.role}' cannot access compliance data. "
                f"This enforces enterprise compliance segregation."
            )

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        report = (
            ComplianceReport.query
            .filter_by(sop_id=sop_id)
            .order_by(ComplianceReport.created_at.desc())
            .first()
        )

        if report is None:
            return not_found_response(
                f"No compliance report found for SOP id {sop_id}. "
                f"A Reviewer must run a compliance check first."
            )

        logger.info(
            "Compliance report accessed: sop_id=%s user_id=%s role=%s",
            sop_id, user_id, user.role,
        )

        return success_response(
            serialize_compliance_report(report),
            message="Latest compliance report retrieved.",
        )

    except Exception:
        logger.exception("Unexpected error fetching compliance report for sop_id=%s.", sop_id)
        return server_error_response()



@compliance_bp.route("/<int:sop_id>/reports", methods=["GET"])
@jwt_required()
def get_compliance_report_history(sop_id: int):
    """
    Fetch all historical compliance reports for an SOP, newest first.

    RESTRICTED: Reviewer and Admin roles only.
    Useful for tracking compliance improvement over review iterations.
    """
    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        if user.role not in COMPLIANCE_ALLOWED_ROLES:
            return forbidden_response(
                f"Access denied. Compliance reports are restricted to: "
                f"{', '.join(COMPLIANCE_ALLOWED_ROLES)}. Your role: '{user.role}'."
            )

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        reports = (
            ComplianceReport.query
            .filter_by(sop_id=sop_id)
            .order_by(ComplianceReport.created_at.desc())
            .all()
        )

        return success_response(
            {
                "sop_id": sop_id,
                "sop_title": sop.title,
                "sop_number": sop.sop_number,
                "total_reports": len(reports),
                "reports": [serialize_compliance_report(r) for r in reports],
            },
            message=f"Found {len(reports)} compliance report(s).",
        )

    except Exception:
        logger.exception(
            "Unexpected error fetching compliance history for sop_id=%s.", sop_id
        )
        return server_error_response()
