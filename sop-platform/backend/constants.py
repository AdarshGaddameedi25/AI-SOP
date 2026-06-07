

DEPARTMENTS = ["IT", "HR", "Finance", "Operations", "Quality"]

DEPARTMENT_CODES = {
    "IT": "IT",
    "HR": "HR",
    "Finance": "FIN",
    "Operations": "OPS",
    "Quality": "QA",
}

TEMPLATE_TYPES = ["IT SOP", "HR SOP", "Quality SOP", "Security SOP"]


USER_ROLES = ["author", "reviewer", "approver", "admin"]

DEFAULT_USER_ROLE = "author"

DOCUMENT_LIFECYCLE_ROLES = ["author", "reviewer", "approver"]


VALID_STATUSES = [
    "draft",            # Author is working on the document
    "under_review",     # Submitted by Author; Reviewer quality gate
    "review_approved",  # Reviewer approved; awaiting Approver final auth
    "review_rejected",  # Reviewer rejected; returned to Author for rework
    "final_approved",   # Approver gave final authorization; officially approved
    "archived",         # Admin archived; document lifecycle complete
]

STATUS_DISPLAY_LABELS = {
    "draft":            "Draft",
    "under_review":     "Under Review",
    "review_approved":  "Review Approved",
    "review_rejected":  "Review Rejected",
    "final_approved":   "Final Approved",
    "archived":         "Archived",
}

STATUS_DISPLAY_COLORS = {
    "draft":            "gray",
    "under_review":     "amber",
    "review_approved":  "blue",
    "review_rejected":  "red",
    "final_approved":   "green",
    "archived":         "slate",
}

RISK_LEVELS = ["Low", "Medium", "High", "Critical"]

GXP_CLASSIFICATIONS = ["GxP", "Non-GxP", "GMP", "GLP", "GCP", "GxP-Direct", "GxP-Indirect"]


SOP_CONTENT_SECTIONS = ["purpose", "scope", "responsibilities", "procedure", "references"]

SOP_RICH_SECTIONS = [
    "document_header",
    "purpose",
    "scope",
    "definitions",
    "responsibilities",
    "prerequisites",
    "procedure",
    "quality_control_checkpoints",
    "deviation_handling",
    "references",
    "revision_history",
    "approval_block",
]


COMPLIANCE_POINTS_PER_SECTION = 20

COMPLIANCE_CLASSIFICATIONS = {
    "audit_ready": 90,       # score >= 90 → Audit Ready
    "minor_gaps": 75,        # score >= 75 → Minor Gaps
    "moderate_gaps": 60,     # score >= 60 → Moderate Gaps
}

COMPLIANCE_CLASSIFICATION_LABELS = {
    "audit_ready":    "Audit Ready",
    "minor_gaps":     "Minor Gaps",
    "moderate_gaps":  "Moderate Gaps",
    "major_revision": "Major Revision Required",
}

COMPLIANCE_ALLOWED_ROLES = ["reviewer", "admin"]

COMPLIANCE_TRIGGER_ROLES = ["reviewer"]


WORKFLOW_TRANSITIONS = {
    ("draft", "submit_review"): {
        "roles": ["author"],
        "next_status": "under_review",
        "audit_action": "SOP_SENT_FOR_REVIEW",
        "description": "Author submitted SOP for Reviewer quality gate.",
    },

    ("under_review", "reviewer_approve"): {
        "roles": ["reviewer"],
        "next_status": "review_approved",
        "audit_action": "REVIEWER_APPROVED",
        "description": "Reviewer approved SOP quality. Sent to Approver for final authorization.",
    },

    ("under_review", "reviewer_reject"): {
        "roles": ["reviewer"],
        "next_status": "review_rejected",
        "audit_action": "REVIEWER_REJECTED",
        "description": "Reviewer rejected SOP. Returned to Author for rework.",
    },

    ("review_approved", "final_approve"): {
        "roles": ["approver"],
        "next_status": "final_approved",
        "audit_action": "FINAL_APPROVED",
        "description": "Approver granted final business authorization. SOP is officially approved.",
    },

    ("review_rejected", "resubmit"): {
        "roles": ["author"],
        "next_status": "draft",
        "audit_action": "SOP_RESUBMITTED",
        "description": "Author resubmitted rejected SOP for rework.",
    },

    ("final_approved", "archive"): {
        "roles": ["admin"],
        "next_status": "archived",
        "audit_action": "SOP_ARCHIVED",
        "description": "Admin archived the approved SOP.",
    },
}


APPROVAL_STAGES = {
    "review":   "review",   # Reviewer quality gate decision
    "final":    "final",    # Approver final authorization
}


AUDIT_ACTIONS = [
    "SOP_CREATED",
    "SOP_UPDATED",
    "SOP_SENT_FOR_REVIEW",
    "REVIEWER_APPROVED",
    "REVIEWER_REJECTED",
    "FINAL_APPROVED",
    "SOP_RESUBMITTED",
    "SOP_ARCHIVED",
    "SOP_DELETED",
    "SOP_CLASSIFIED",
    "COMPLIANCE_CHECKED",
    "PDF_EXPORTED",
    "DOCX_EXPORTED",
    "AI_GENERATED",
    "USER_REGISTERED",
    "USER_ROLE_CHANGED",
    "REVIEW_REQUESTED",
    "SOP_APPROVED",
    "SOP_REJECTED",
]


ROLE_VISIBLE_STATUSES = {
    "author":   None,              # Filtered by created_by in query, not by status
    "reviewer": ["under_review"],  # Pool-based: sees all SOPs pending review
    "approver": ["review_approved"],  # Sees SOPs ready for final authorization
    "admin":    None,              # Sees all SOPs regardless of status
}


MAX_PAGE_LIMIT = 100
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 10
