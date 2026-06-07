
import logging
import re
from datetime import datetime, timezone

from constants import AUDIT_ACTIONS, DEPARTMENT_CODES

logger = logging.getLogger(__name__)


def log_action(db, AuditLog, sop_id, user_id: int, action: str, details: str) -> None:
    if action not in AUDIT_ACTIONS:
        logger.warning(
            "log_action called with unknown action '%s' - skipping audit log.", action
        )
        return

    try:
        entry = AuditLog(
            sop_id=sop_id,
            user_id=user_id,
            action=action,
            details=details[:500] if details else None,
        )
        db.session.add(entry)
        db.session.commit()
        logger.debug("Audit log written: action=%s user_id=%s sop_id=%s", action, user_id, sop_id)
    except Exception:
        logger.exception(
            "Failed to write audit log: action=%s user_id=%s sop_id=%s", action, user_id, sop_id
        )
        db.session.rollback()


def generate_sop_number(db, SOP, department: str) -> str:
    dept_code = DEPARTMENT_CODES.get(department, department[:3].upper())
    year = datetime.now(timezone.utc).year
    prefix = f"{dept_code}-{year}-"

    try:
        existing = (
            SOP.query
            .filter(SOP.sop_number.like(f"{prefix}%"))
            .with_entities(SOP.sop_number)
            .all()
        )
        max_seq = 0
        for (num,) in existing:
            if num and num.startswith(prefix):
                tail = num[len(prefix):]
                if tail.isdigit():
                    max_seq = max(max_seq, int(tail))
        return f"{prefix}{max_seq + 1:03d}"
    except Exception:
        logger.exception("Failed to query existing SOP numbers; using fallback.")
        import uuid
        return f"{prefix}{uuid.uuid4().hex[:4].upper()}"


def sanitize_string(value: str, max_length: int | None = None) -> str:
    cleaned = value.strip() if isinstance(value, str) else ""
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned


def parse_pagination_params(args: dict) -> tuple[int, int]:
    from constants import DEFAULT_PAGE, DEFAULT_LIMIT, MAX_PAGE_LIMIT

    try:
        page = int(args.get("page", DEFAULT_PAGE))
        limit = int(args.get("limit", DEFAULT_LIMIT))
    except (ValueError, TypeError):
        page, limit = DEFAULT_PAGE, DEFAULT_LIMIT

    page = max(1, page)
    limit = max(1, min(limit, MAX_PAGE_LIMIT))
    return page, limit


def parse_json_request(req) -> tuple[dict | None, str | None]:
    import json

    try:
        raw = req.get_data(as_text=True)
    except Exception as exc: 
        return None, f"Could not read request body: {exc}"

    if raw is None or raw.strip() == "":
        return None, None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON: {exc.msg}"

    if not isinstance(parsed, dict):
        return None, "JSON body must be an object."

    return parsed, None


def bump_minor_version(version_str: str) -> str:
    if not version_str:
        return "0.1"
    try:
        parts = version_str.split('.')
        if len(parts) == 2:
            major = int(parts[0])
            minor = int(parts[1])
            return f"{major}.{minor + 1}"
        return "0.1"
    except Exception:
        return "0.1"


def bump_major_version(version_str: str) -> str:
    if not version_str:
        return "1.0"
    try:
        parts = version_str.split('.')
        if len(parts) >= 1:
            major = int(parts[0])
            return f"{major + 1}.0"
        return "1.0"
    except Exception:
        return "1.0"


