"""
SQLAlchemy ORM models for the SOP platform.

Enterprise 4-role architecture:
  Users:   author | reviewer | approver | admin
  Workflow: draft → under_review → review_approved / review_rejected → final_approved → archived
"""

from datetime import datetime, timezone
from sqlalchemy import Index
from models import db


def _utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


class User(db.Model):
    """Registered platform user with strict 4-role access control."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="author")
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)

    created_sops = db.relationship(
        "SOP", foreign_keys="SOP.created_by", back_populates="creator", lazy="dynamic"
    )
    updated_sops = db.relationship(
        "SOP", foreign_keys="SOP.updated_by", back_populates="updater", lazy="dynamic"
    )
    reviewing_sops = db.relationship(
        "SOP",
        foreign_keys="SOP.current_reviewer",
        back_populates="reviewer",
        lazy="dynamic",
    )
    approving_sops = db.relationship(
        "SOP",
        foreign_keys="SOP.current_approver",
        back_populates="approver_user",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username} role={self.role}>"


class SOP(db.Model):
    """Standard Operating Procedure document with full enterprise lifecycle tracking."""

    __tablename__ = "sops"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    sop_number = db.Column(db.String(50), unique=True, nullable=True)

    title = db.Column(db.String(200), nullable=False)
    template_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)

    content = db.Column(db.JSON, nullable=False, default=dict)
    previous_content = db.Column(db.JSON, nullable=True)

    status = db.Column(db.String(50), nullable=False, default="draft")
    version = db.Column(db.String(20), nullable=False, default="0.1")

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    current_reviewer = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    current_approver = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    rejection_comments = db.Column(db.Text, nullable=True)

    is_deleted = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )
    reviewer_approved_at = db.Column(db.DateTime, nullable=True)   # When reviewer approved
    approved_at = db.Column(db.DateTime, nullable=True)            # When final approval was granted

    creator = db.relationship("User", foreign_keys=[created_by], back_populates="created_sops")
    updater = db.relationship("User", foreign_keys=[updated_by], back_populates="updated_sops")
    reviewer = db.relationship(
        "User", foreign_keys=[current_reviewer], back_populates="reviewing_sops"
    )
    approver_user = db.relationship(
        "User", foreign_keys=[current_approver], back_populates="approving_sops"
    )

    compliance_reports = db.relationship(
        "ComplianceReport", back_populates="sop", lazy="dynamic"
    )
    audit_logs = db.relationship("AuditLog", back_populates="sop", lazy="dynamic")
    approvals = db.relationship("Approval", back_populates="sop", lazy="dynamic")
    version_history = db.relationship("SOPVersionHistory", back_populates="sop", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<SOP id={self.id} sop_number={self.sop_number!r} title={self.title!r} status={self.status}>"

    @property
    def created_by_username(self) -> str | None:
        """Return the username of the SOP creator if available."""
        return self.creator.username if getattr(self, "creator", None) else None


Index("idx_sop_status", SOP.status)
Index("idx_sop_created_by", SOP.created_by)
Index("idx_sop_current_reviewer", SOP.current_reviewer)
Index("idx_sop_current_approver", SOP.current_approver)


class ComplianceReport(db.Model):
    """FDA-grade AI + rule-based compliance audit report.

    COMPLIANCE SEGREGATION: Only Reviewers can trigger reports.
    Admin can read reports for governance. Authors and Approvers are blocked.
    """

    __tablename__ = "compliance_reports"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sop_id = db.Column(db.Integer, db.ForeignKey("sops.id"), nullable=False)

    score = db.Column(db.Integer, nullable=False)
    classification = db.Column(db.String(100), nullable=True)    # Audit Ready / Minor Gaps / etc.

    total_checks = db.Column(db.Integer, nullable=True)
    passed_checks_count = db.Column(db.Integer, nullable=True)
    failed_checks_count = db.Column(db.Integer, nullable=True)

    audit_results = db.Column(db.JSON, nullable=True, default=dict)

    critical_failures = db.Column(db.JSON, nullable=False, default=list)
    missing_sections = db.Column(db.JSON, nullable=False, default=list)
    recommendations = db.Column(db.JSON, nullable=False, default=list)

    triggered_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)

    sop = db.relationship("SOP", back_populates="compliance_reports")
    triggered_by_user = db.relationship("User", foreign_keys=[triggered_by])

    def __repr__(self) -> str:
        return f"<ComplianceReport id={self.id} sop_id={self.sop_id} score={self.score} classification={self.classification!r}>"


class AuditLog(db.Model):
    """Immutable audit trail entry for all system actions.

    Append-only: entries are NEVER updated or deleted.
    Satisfies 21 CFR Part 11 audit trail requirements.
    """

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sop_id = db.Column(db.Integer, db.ForeignKey("sops.id"), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=_utcnow)

    sop = db.relationship("SOP", back_populates="audit_logs")
    user = db.relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} user_id={self.user_id}>"


Index("idx_audit_sop_id", AuditLog.sop_id)
Index("idx_audit_action", AuditLog.action)
Index("idx_audit_user_id", AuditLog.user_id)


class Approval(db.Model):
    """Decision record for both Reviewer quality gate and Approver final authorization.

    approval_stage distinguishes between:
      'review' — Reviewer quality gate decision (approve/reject)
      'final'  — Approver final business authorization
    """

    __tablename__ = "approvals"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sop_id = db.Column(db.Integer, db.ForeignKey("sops.id"), nullable=False)

    reviewer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    approval_stage = db.Column(db.String(20), nullable=False, default="review")

    status = db.Column(db.String(50), nullable=False)
    comments = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=_utcnow)

    sop = db.relationship("SOP", back_populates="approvals")
    reviewer = db.relationship("User")

    def __repr__(self) -> str:
        return f"<Approval id={self.id} sop_id={self.sop_id} stage={self.approval_stage} status={self.status}>"


class SOPVersionHistory(db.Model):
    """Immutable snapshot of SOP content for historical tracking."""

    __tablename__ = "sop_version_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sop_id = db.Column(db.Integer, db.ForeignKey("sops.id"), nullable=False)
    version = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.JSON, nullable=False)
    summary = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    sop = db.relationship("SOP", back_populates="version_history")
    creator = db.relationship("User", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<SOPVersionHistory sop_id={self.sop_id} version={self.version!r}>"

Index("idx_sop_version_sop_id", SOPVersionHistory.sop_id)
