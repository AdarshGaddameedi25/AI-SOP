
import logging
from datetime import datetime, timezone

from constants import WORKFLOW_TRANSITIONS, APPROVAL_STAGES
from services.serializer_service import serialize_sop

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_transition_config(current_status: str, action: str) -> dict | None:
    return WORKFLOW_TRANSITIONS.get((current_status, action))


def _is_original_author(sop, user_id: int) -> bool:
    return sop.created_by == user_id


def _perform_transition(
    db,
    SOP,
    AuditLog,
    Approval,
    User,
    sop_id: int,
    action: str,
    current_user_id: int,
    current_user_role: str,
    comments: str | None = None,
) -> tuple[dict | None, str | None]:
    from utils.helpers import log_action

    sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
    if sop is None:
        return None, f"SOP with id {sop_id} not found."

    config = _get_transition_config(sop.status, action)
    if config is None:
        return None, (
            f"Cannot perform '{action}' on an SOP with status '{sop.status}'. "
            f"This transition is not allowed by the enterprise workflow."
        )

    allowed_roles = config["roles"]
    next_status = config["next_status"]
    audit_action = config["audit_action"]

    if current_user_role not in allowed_roles:
        return None, (
            f"Your role '{current_user_role}' is not permitted to perform '{action}'. "
            f"Required role(s): {', '.join(allowed_roles)}."
        )

    if action in ("submit_review", "resubmit"):
        if not _is_original_author(sop, current_user_id):
            return None, "Only the original author of this SOP can perform this action."

    rejection_comments = sop.rejection_comments
    if action == "reviewer_reject":
        if not comments or not comments.strip():
            return None, "Rejection comments are required when rejecting an SOP."
        sop.rejection_comments = comments.strip()
    elif action == "resubmit":
        sop.rejection_comments = None
        from models.db_models import ComplianceReport
        ComplianceReport.query.filter_by(sop_id=sop.id).delete()
    
    if action == "submit_review":
        from models.db_models import ComplianceReport
        ComplianceReport.query.filter_by(sop_id=sop.id).delete()

    old_status = sop.status
    sop.status = next_status
    sop.updated_by = current_user_id

    now = _utcnow()
    if action == "reviewer_approve":
        sop.reviewer_approved_at = now
        sop.current_reviewer = current_user_id
    elif action == "final_approve":
        sop.approved_at = now
        sop.current_approver = current_user_id

    if action == "resubmit":
        from models.db_models import SOPVersionHistory
        from utils.helpers import bump_minor_version
        
        existing_history = SOPVersionHistory.query.filter_by(sop_id=sop.id, version=sop.version).first()
        if not existing_history:
            history_record = SOPVersionHistory(
                sop_id=sop.id,
                version=sop.version,
                title=sop.title,
                content=sop.content,
                summary=rejection_comments or "Returned to draft for rework.",
                created_by=sop.created_by,
            )
            db.session.add(history_record)
        
        sop.version = bump_minor_version(sop.version)
        
    elif action == "final_approve":
        from models.db_models import SOPVersionHistory
        from utils.helpers import bump_major_version
        
        new_version = bump_major_version(sop.version)
        sop.version = new_version
        
        existing_history = SOPVersionHistory.query.filter_by(sop_id=sop.id, version=new_version).first()
        if not existing_history:
            history_record = SOPVersionHistory(
                sop_id=sop.id,
                version=new_version,
                title=sop.title,
                content=sop.content,
                summary=comments or "Final Approved Version.",
                created_by=current_user_id,
            )
            db.session.add(history_record)



    if action in ("reviewer_approve", "reviewer_reject", "final_approve"):
        stage = APPROVAL_STAGES["final"] if action == "final_approve" else APPROVAL_STAGES["review"]
        try:
            approval = Approval(
                sop_id=sop_id,
                reviewer_id=current_user_id,
                approval_stage=stage,
                status=next_status,
                comments=comments.strip() if comments else None,
            )
            db.session.add(approval)
        except Exception:
            logger.exception("Could not create Approval record for sop_id=%s", sop_id)

    try:
        db.session.commit()
    except Exception:
        logger.exception("Failed to commit workflow transition for sop_id=%s", sop_id)
        db.session.rollback()
        return None, "Database error during workflow transition. Please try again."

    detail_msg = (
        f"SOP '{sop.title}' transitioned from '{old_status}' to '{next_status}' "
        f"by user_id={current_user_id} (role={current_user_role})."
    )
    if comments:
        detail_msg += f" Comments: {comments[:200]}"

    log_action(db, AuditLog, sop_id, current_user_id, audit_action, detail_msg)
    logger.info(
        "Workflow transition: sop_id=%s %s→%s by user_id=%s (role=%s)",
        sop_id, old_status, next_status, current_user_id, current_user_role,
    )

    return serialize_sop(sop), None



def submit_for_review(db, SOP, AuditLog, Approval, User, sop_id: int, user_id: int, user_role: str):
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="submit_review",
        current_user_id=user_id, current_user_role=user_role,
    )


def reviewer_approve_sop(
    db, SOP, AuditLog, Approval, User,
    sop_id: int, user_id: int, user_role: str,
    comments: str | None = None,
):
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="reviewer_approve",
        current_user_id=user_id, current_user_role=user_role,
        comments=comments,
    )


def reviewer_reject_sop(
    db, SOP, AuditLog, Approval, User,
    sop_id: int, user_id: int, user_role: str,
    comments: str,
):
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="reviewer_reject",
        current_user_id=user_id, current_user_role=user_role,
        comments=comments,
    )


def final_approve_sop(
    db, SOP, AuditLog, Approval, User,
    sop_id: int, user_id: int, user_role: str,
    comments: str | None = None,
):
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="final_approve",
        current_user_id=user_id, current_user_role=user_role,
        comments=comments,
    )


def resubmit_sop(
    db, SOP, AuditLog, Approval, User,
    sop_id: int, user_id: int, user_role: str,
):
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="resubmit",
        current_user_id=user_id, current_user_role=user_role,
    )


def archive_sop(
    db, SOP, AuditLog, Approval, User,
    sop_id: int, user_id: int, user_role: str,
):
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="archive",
        current_user_id=user_id, current_user_role=user_role,
    )
