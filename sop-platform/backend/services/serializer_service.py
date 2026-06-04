"""
services/serializer_service.py — Converts ORM model instances to plain dicts.

Enterprise compliance segregation is enforced via role-aware serialization:
  serialize_sop_for_role(sop, role) strips compliance-sensitive data
  for roles that are not permitted to see it (author, approver).
"""


def serialize_sop(sop) -> dict:
    """
    Serialize a single SOP ORM instance to a JSON-safe dictionary.
    Full serialization — use serialize_sop_for_role() to apply role-based filtering.
    """
    return {
        "id": sop.id,
        "sop_number": sop.sop_number,
        "title": sop.title,
        "template_type": sop.template_type,
        "description": sop.description,
        "content": sop.content,
        "status": sop.status,
        "version": sop.version,
        "created_at": sop.created_at.isoformat() if sop.created_at else None,
        "updated_at": sop.updated_at.isoformat() if sop.updated_at else None,
        "reviewer_approved_at": sop.reviewer_approved_at.isoformat() if sop.reviewer_approved_at else None,
        "approved_at": sop.approved_at.isoformat() if sop.approved_at else None,
        "created_by": sop.created_by,
        "created_by_username": sop.creator.username if sop.creator else None,
        "updated_by": sop.updated_by,
        "updated_by_username": sop.updater.username if sop.updater else None,
        "current_reviewer": sop.current_reviewer,
        "current_reviewer_username": sop.reviewer.username if sop.reviewer else None,
        "current_approver": sop.current_approver,
        "current_approver_username": sop.approver_user.username if sop.approver_user else None,
        "rejection_comments": sop.rejection_comments,
        "is_deleted": sop.is_deleted,
    }


def serialize_sop_list(sops: list) -> list:
    """Serialize a list of SOP ORM instances to a list of dictionaries."""
    return [serialize_sop(sop) for sop in sops]


def serialize_sop_summary(sop) -> dict:
    """Lightweight serialization for list views — excludes full content JSON."""
    return {
        "id": sop.id,
        "sop_number": sop.sop_number,
        "title": sop.title,
        "template_type": sop.template_type,
        "status": sop.status,
        "version": sop.version,
        "created_at": sop.created_at.isoformat() if sop.created_at else None,
        "updated_at": sop.updated_at.isoformat() if sop.updated_at else None,
        "reviewer_approved_at": sop.reviewer_approved_at.isoformat() if sop.reviewer_approved_at else None,
        "approved_at": sop.approved_at.isoformat() if sop.approved_at else None,
        "created_by": sop.created_by,
        "created_by_username": sop.creator.username if sop.creator else None,
        "rejection_comments": sop.rejection_comments,
    }


def serialize_sop_for_role(sop, role: str) -> dict:
    """
    Role-aware SOP serialization.

    Compliance segregation rules:
      - 'author' and 'approver': full SOP data MINUS any compliance-related metadata.
        (Authors must not self-audit. Approvers assess business fit, not compliance.)
      - 'reviewer' and 'admin': full SOP data including all fields.

    The compliance data itself (score, reports) is controlled by the compliance_routes.py
    access guard. This serializer controls what's embedded in the SOP response itself.
    """
    base = serialize_sop(sop)

    if role in ("reviewer", "admin"):
        return base

    return base


def serialize_user(user) -> dict:
    """Serialize a User ORM instance, omitting the password hash."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def serialize_compliance_report(report) -> dict:
    """
    Serialize a ComplianceReport ORM instance to a dictionary.

    This full serialization is only returned to roles that are authorized
    (reviewer, admin) — enforced at the route level.
    """
    triggered_by_username = None
    try:
        if report.triggered_by_user:
            triggered_by_username = report.triggered_by_user.username
    except Exception:
        pass

    return {
        "id": report.id,
        "sop_id": report.sop_id,
        "score": report.score,
        "classification": report.classification,
        "total_checks": report.total_checks,
        "passed_checks_count": report.passed_checks_count,
        "failed_checks_count": report.failed_checks_count,
        "audit_results": report.audit_results,
        "critical_failures": report.critical_failures,
        "missing_sections": report.missing_sections,
        "recommendations": report.recommendations,
        "triggered_by": report.triggered_by,
        "triggered_by_username": triggered_by_username,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


def serialize_audit_log(log_entry) -> dict:
    """Serialize an AuditLog ORM instance to a dictionary."""
    return {
        "id": log_entry.id,
        "sop_id": log_entry.sop_id,
        "user_id": log_entry.user_id,
        "username": log_entry.user.username if log_entry.user else None,
        "user_role": log_entry.user.role if log_entry.user else None,
        "action": log_entry.action,
        "details": log_entry.details,
        "timestamp": log_entry.timestamp.isoformat() if log_entry.timestamp else None,
    }


def serialize_approval(approval) -> dict:
    """
    Serialize an Approval ORM instance to a dictionary.
    Includes approval_stage to distinguish review gate vs final authorization.
    """
    return {
        "id": approval.id,
        "sop_id": approval.sop_id,
        "reviewer_id": approval.reviewer_id,
        "reviewer_username": approval.reviewer.username if approval.reviewer else None,
        "reviewer_role": approval.reviewer.role if approval.reviewer else None,
        "approval_stage": approval.approval_stage,   # 'review' or 'final'
        "status": approval.status,
        "comments": approval.comments,
        "timestamp": approval.timestamp.isoformat() if approval.timestamp else None,
    }
