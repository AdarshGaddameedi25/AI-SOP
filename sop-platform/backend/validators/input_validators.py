
import re

from constants import DEPARTMENTS, TEMPLATE_TYPES, USER_ROLES

_EMAIL_RE = re.compile(r"^[^\@\s]+@[^\@\s]+\.[^\@\s]+$")


def validate_register_input(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username:
        errors.append("Username is required.")
    elif len(username) < 3:
        errors.append("Username must be at least 3 characters long.")
    elif len(username) > 100:
        errors.append("Username must be 100 characters or fewer.")

    if not email:
        errors.append("Email is required.")
    elif not _EMAIL_RE.match(email):
        errors.append("Email address is not valid.")
    elif len(email) > 150:
        errors.append("Email must be 150 characters or fewer.")

    if not password:
        errors.append("Password is required.")
    elif len(password) < 8:
        errors.append("Password must be at least 8 characters long.")

    return (len(errors) == 0, errors)


def validate_login_input(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []

    if not (data.get("email") or "").strip():
        errors.append("Email is required.")

    if not data.get("password"):
        errors.append("Password is required.")

    return (len(errors) == 0, errors)


def validate_sop_input(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []

    title = (data.get("title") or "").strip()
    template_type = (data.get("template_type") or "").strip()
    description = (data.get("description") or "").strip()

    if not title:
        errors.append("Title is required.")
    elif len(title) > 200:
        errors.append("Title must be 200 characters or fewer.")

    if not template_type:
        errors.append("Template type is required.")
    elif template_type not in TEMPLATE_TYPES:
        errors.append(f"Template type must be one of: {', '.join(TEMPLATE_TYPES)}.")

    if not description:
        errors.append("Description is required.")

    return (len(errors) == 0, errors)


def validate_sop_content(content: dict) -> tuple[bool, list[str]]:
    from constants import SOP_CONTENT_SECTIONS

    errors: list[str] = []

    if not isinstance(content, dict):
        return False, ["Content must be a JSON object."]

    for section in SOP_CONTENT_SECTIONS:
        value = content.get(section)
        if value is None:
            errors.append(f"Content section '{section}' is missing.")
        elif isinstance(value, list) and len(value) == 0:
            errors.append(f"Content section '{section}' must not be empty.")
        elif isinstance(value, str) and not value.strip():
            errors.append(f"Content section '{section}' must not be blank.")

    if "procedure" in content and not isinstance(content["procedure"], list):
        errors.append("Content section 'procedure' must be a list of steps.")

    if "references" in content and not isinstance(content["references"], list):
        errors.append("Content section 'references' must be a list.")

    return (len(errors) == 0, errors)


def validate_role_assignment(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []

    new_role = (data.get("role") or "").strip()

    if not new_role:
        errors.append("'role' field is required.")
    elif new_role not in USER_ROLES:
        errors.append(
            f"Invalid role '{new_role}'. "
            f"Must be one of: {', '.join(USER_ROLES)}."
        )

    return (len(errors) == 0, errors)


def validate_rejection_comments(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []

    comments = (data.get("comments") or "").strip()

    if not comments:
        errors.append(
            "'comments' are required when rejecting an SOP. "
            "Provide specific, actionable feedback for the Author."
        )
    elif len(comments) < 10:
        errors.append("Rejection comments must be at least 10 characters. Provide meaningful feedback.")
    elif len(comments) > 2000:
        errors.append("Rejection comments must be 2000 characters or fewer.")

    return (len(errors) == 0, errors)
