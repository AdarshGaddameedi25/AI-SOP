"""
services/workflow_service.py — SOP lifecycle transition business logic.

Enterprise 5-Stage Workflow:
  1. Author creates/edits → DRAFT
  2. Author submits       → UNDER_REVIEW  (Reviewer quality gate)
  3a. Reviewer approves  → REVIEW_APPROVED (Approver final auth gate)
  3b. Reviewer rejects   → REVIEW_REJECTED (back to Author)
  4. Author resubmits    → DRAFT (after rejection)
  5. Approver authorizes → FINAL_APPROVED (officially approved)
  6. Admin archives      → ARCHIVED

Separation of Duties:
  - Only Author can submit/resubmit their own SOP
  - Only Reviewer can approve/reject at the quality gate
  - Only Approver can give final authorization
  - Only Admin can archive
  - No role can skip stages
"""

import logging
from datetime import datetime, timezone

from constants import WORKFLOW_TRANSITIONS, APPROVAL_STAGES
from services.serializer_service import serialize_sop

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_transition_config(current_status: str, action: str) -> dict | None:
    """Look up the transition config for a (status, action) pair from constants."""
    return WORKFLOW_TRANSITIONS.get((current_status, action))


def _is_original_author(sop, user_id: int) -> bool:
    """Return True if user_id is the original creator of the SOP."""
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
    """
    Core transition executor. Called by every public transition function.

    Steps:
    1.  Load SOP from DB (404 if not found or soft-deleted).
    2.  Look up transition config for (current_status, action).
    3.  Validate current_user_role is allowed for this transition.
    4.  Author-only check: submit_review / resubmit require original authorship.
    5.  Reject requires a non-empty comment.
    6.  Apply new status.
    7.  Set stage-specific timestamps (reviewer_approved_at, approved_at).
    8.  Record reviewer / approver assignment.
    9.  Create Approval record with correct approval_stage.
    10. Commit.
    11. Write immutable audit log.
    12. Return serialized SOP.
    """
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
    """
    Stage 1 → 2: Author submits DRAFT SOP for Reviewer quality gate.
    Only the original author can submit their own SOP.
    """
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
    """
    Stage 2 → 3a: Reviewer approves the SOP quality gate.
    SOP moves from UNDER_REVIEW → REVIEW_APPROVED.
    Only a Reviewer can perform this action.
    """
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
    """
    Stage 2 → 3b: Reviewer rejects the SOP at the quality gate.
    SOP moves from UNDER_REVIEW → REVIEW_REJECTED.
    Rejection comments are mandatory.
    Only a Reviewer can perform this action.
    """
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
    """
    Stage 3a → 5: Approver grants final business authorization.
    SOP moves from REVIEW_APPROVED → FINAL_APPROVED.
    Only an Approver can perform this action.
    This is the only action Approvers can take — they cannot reject.
    """
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
    """
    Stage 3b → 1: Author resubmits a rejected SOP back to DRAFT for rework.
    Only the original author can resubmit their own SOP.
    """
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="resubmit",
        current_user_id=user_id, current_user_role=user_role,
    )


def archive_sop(
    db, SOP, AuditLog, Approval, User,
    sop_id: int, user_id: int, user_role: str,
):
    """
    Stage 5 → 6: Admin archives a finally-approved SOP.
    SOP moves from FINAL_APPROVED → ARCHIVED.
    Only Admin can perform this action.
    """
    return _perform_transition(
        db, SOP, AuditLog, Approval, User,
        sop_id=sop_id, action="archive",
        current_user_id=user_id, current_user_role=user_role,
    )
