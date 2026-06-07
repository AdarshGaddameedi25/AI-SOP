

import logging

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import limiter, _is_testing
from models import db
from models.db_models import SOP, AuditLog, User
from validators.input_validators import validate_sop_input, validate_sop_content
from services import ai_service
from services.response_service import (
    success_response,
    created_response,
    error_response,
    not_found_response,
    server_error_response,
    forbidden_response,
)
from services.serializer_service import serialize_sop, serialize_sop_list
from utils.helpers import log_action, parse_pagination_params, parse_json_request, generate_sop_number
from constants import ROLE_VISIBLE_STATUSES

logger = logging.getLogger(__name__)
sop_bp = Blueprint("sop", __name__)


AUTHOR_EDITABLE_STATUSES = {"draft", "review_rejected"}


def _get_user(user_id: int) -> User | None:
    
    return db.session.get(User, user_id)



@sop_bp.route("/create", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour", error_message="SOP creation limit reached (20/hour). Please try again later.", exempt_when=_is_testing)
def create_sop():

    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        if user.role != "author":
            return forbidden_response(
                f"Only Authors can create SOPs. Your role is '{user.role}'. "
                f"Document creation is an Author responsibility per enterprise policy."
            )

        data, parse_err = parse_json_request(request)
        if parse_err:
            return error_response(parse_err, 400)
        data = data or {}

        is_valid, errors = validate_sop_input(data)
        if not is_valid:
            return error_response("; ".join(errors), 422)

        sop_num = generate_sop_number(db, SOP, data["template_type"].strip())

        sop = SOP(
            sop_number=sop_num,
            title=data["title"].strip(),
            template_type=data["template_type"].strip(),
            description=data.get("description", "").strip(),
            content={},
            status="draft",
            version="0.1",
            created_by=user_id,
        )
        db.session.add(sop)
        db.session.commit()

        log_action(db, AuditLog, sop.id, user_id, "SOP_CREATED",
                   f"SOP '{sop.title}' ({sop.sop_number}) created.")

        logger.info("SOP created: id=%s sop_number=%s title=%r user_id=%s", sop.id, sop.sop_number, sop.title, user_id)
        return created_response(serialize_sop(sop), "SOP created successfully.")

    except Exception:
        logger.exception("Error creating SOP.")
        db.session.rollback()
        return server_error_response()



@sop_bp.route("/list", methods=["GET"])
@jwt_required()
def list_sops():

    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        page, limit = parse_pagination_params(request.args)
        role = user.role

        query = SOP.query.filter_by(is_deleted=False)

        if role == "author":
            query = query.filter(SOP.created_by == user_id)

        elif role == "reviewer":
            visible_statuses = ROLE_VISIBLE_STATUSES["reviewer"]
            query = query.filter(SOP.status.in_(visible_statuses))

        elif role == "approver":
            visible_statuses = ROLE_VISIBLE_STATUSES["approver"]
            query = query.filter(SOP.status.in_(visible_statuses))

        elif role == "admin":
            status_filter = request.args.get("status", "").strip() or None
            if status_filter:
                query = query.filter(SOP.status == status_filter)
        else:
            return forbidden_response(f"Unrecognized role '{role}'.")

        pagination = (
            query
            .order_by(SOP.created_at.desc())
            .paginate(page=page, per_page=limit, error_out=False)
        )

        return success_response({
            "sops": serialize_sop_list(pagination.items),
            "total": pagination.total,
            "page": page,
            "limit": limit,
            "pages": pagination.pages,
            "role_filter": role,
        })

    except Exception:
        logger.exception("Error listing SOPs.")
        return server_error_response()



@sop_bp.route("/search", methods=["GET"])
@jwt_required()
def search_sops():

    try:
        query = request.args.get("q", "").strip()
        if not query:
            return error_response("Search query 'q' parameter is required.", 400)

        db_query = SOP.query.filter(
            SOP.is_deleted == False,
            SOP.title.ilike(f"%{query}%")
        )
        limit = request.args.get("limit", 10, type=int)
        
        sops = db_query.limit(limit).all()

        serialized_results = []
        for sop_obj in sops:
            serialized_results.append({
                "sop": serialize_sop(sop_obj),
            })

        return success_response({"results": serialized_results})

    except Exception:
        logger.exception("Error searching SOPs by author.")
        return server_error_response()



@sop_bp.route("/<int:sop_id>", methods=["GET"])
@jwt_required()
def get_sop(sop_id: int):
    
    try:
        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        return success_response(serialize_sop(sop))

    except Exception:
        logger.exception("Error fetching SOP id=%s.", sop_id)
        return server_error_response()



@sop_bp.route("/<int:sop_id>/content", methods=["PUT"])
@jwt_required()
def update_sop_content(sop_id: int):

    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        if user.role != "author":
            return forbidden_response(
                f"Only Authors can modify SOP content. Your role is '{user.role}'. "
                f"Document editing is strictly an Author responsibility."
            )

        data = request.get_json(silent=True) or {}
        content = data.get("content")

        if content is None:
            return error_response("'content' field is required.", 422)

        is_valid, errors = validate_sop_content(content)
        if not is_valid:
            return error_response("; ".join(errors), 422)

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        if sop.created_by != user_id:
            return forbidden_response(
                "You do not have permission to modify this SOP. "
                "Only the original author can edit their own document."
            )

        if sop.status not in AUTHOR_EDITABLE_STATUSES:
            return error_response(
                f"This SOP cannot be edited in its current status: '{sop.status}'. "
                f"Editable statuses: {', '.join(sorted(AUTHOR_EDITABLE_STATUSES))}. "
                f"SOPs under active review or that are approved cannot be modified.",
                409,
            )

        sop.previous_content = sop.content
        sop.content = content
        sop.updated_by = user_id

        db.session.commit()

        log_action(db, AuditLog, sop.id, user_id, "SOP_UPDATED",
                   f"Content updated for SOP '{sop.title}' (now v{sop.version}).")

        logger.info("SOP content updated: id=%s version=%s user_id=%s", sop.id, sop.version, user_id)
        return success_response(serialize_sop(sop), "SOP content updated successfully.")

    except Exception:
        logger.exception("Error updating SOP content id=%s.", sop_id)
        db.session.rollback()
        return server_error_response()



@sop_bp.route("/generate", methods=["POST"])
@jwt_required()
@limiter.limit("5 per minute", error_message="AI generation limit reached (5/min). Wait a moment before retrying.", exempt_when=_is_testing)
def generate_sop():

    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        if user.role != "author":
            return forbidden_response(
                f"Only Authors can generate SOP content. Your role is '{user.role}'."
            )

        data = request.get_json(silent=True) or {}

        is_valid, errors = validate_sop_input(data)
        if not is_valid:
            return error_response("; ".join(errors), 422)

        title = data["title"].strip()
        template_type = data["template_type"].strip()
        description = data.get("description", "").strip()

        sop_meta = None
        sop_id_hint = data.get("sop_id")
        if sop_id_hint:
            try:
                sop_meta = SOP.query.filter_by(id=int(sop_id_hint), is_deleted=False).first()
            except (TypeError, ValueError):
                pass

        def _meta(field: str, fallback: str) -> str:
            if data.get(field):
                return str(data[field]).strip()
            if sop_meta and getattr(sop_meta, field, None):
                return str(getattr(sop_meta, field)).strip()
            return fallback

        sop_number_str = _meta("sop_number", "")
        if not sop_number_str and sop_meta:
            sop_number_str = sop_meta.sop_number or "TBD"

        logger.info("AI SOP generation requested by author user_id=%s title=%r", user_id, title)

        content, ai_error = ai_service.generate_sop_content(
            title=title,
            template_type=template_type,
            description=description,
            sop_number=sop_number_str or "TBD",
            version=str(sop_meta.version) if sop_meta else "1.0",
            extra_instructions=data.get("critical_steps", "").strip(),
        )

        if ai_error:
            logger.warning("AI generation failed: %s", ai_error)
            return error_response(ai_error, 502)

        log_action(db, AuditLog, sop_id_hint, user_id, "AI_GENERATED",
                   f"AI generated FDA-grade SOP content for title '{title}'.")

        return success_response(
            {"generated_content": content},
            message="SOP content generated. Review and save when ready.",
        )

    except Exception:
        logger.exception("Error during SOP AI generation.")
        return server_error_response()


@sop_bp.route("/<int:sop_id>/classify", methods=["POST"])
@jwt_required()
@limiter.limit("5 per minute", error_message="Classification limit reached (5/min). Please wait.", exempt_when=_is_testing)
def classify_sop(sop_id: int):
   
    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)

        if user is None:
            return error_response("Authenticated user not found.", 401)

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        logger.info(
            "Security classification triggered: sop_id=%s user_id=%s role=%s",
            sop_id, user_id, user.role,
        )

        classification, ai_error = ai_service.run_security_classification(
            title=sop.title,
            description=sop.description or "",
            content=sop.content or {},
        )

        if ai_error:
            logger.warning("Security classification failed: %s", ai_error)
            return error_response(ai_error, 502)

        sop.risk_level = classification.get("security_risk_level")
        sop.gxp_classification = classification.get("gxp_classification")


        content = dict(sop.content or {})
        content["security_classification"] = classification
        sop.content = content

        db.session.commit()

        log_action(
            db, AuditLog, sop_id, user_id, "SOP_CLASSIFIED",
            f"AI security classification completed. "
            f"Risk: {sop.risk_level}, GxP: {sop.gxp_classification}.",
        )

        return success_response(classification, message="Security classification completed.")

    except Exception:
        logger.exception("Error during SOP classification sop_id=%s.", sop_id)
        db.session.rollback()
        return server_error_response()


@sop_bp.route("/<int:sop_id>", methods=["DELETE"])
@jwt_required()
def delete_sop(sop_id: int):

    try:
        user_id = int(get_jwt_identity())
        user = _get_user(user_id)
        if not user:
            return error_response("Authenticated user not found.", 401)
        role = user.role

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        if role not in ["author", "admin"]:
            return forbidden_response("Only authors or admins can delete an SOP.")

        if role == "author" and sop.created_by != user_id:
            return forbidden_response("You can only delete your own SOPs.")

        sop.is_deleted = True
        db.session.commit()

        log_action(db, AuditLog, sop.id, user_id, "SOP_DELETED", f"SOP soft deleted.")

        return success_response(None, message="SOP deleted successfully.")

    except Exception:
        db.session.rollback()
        logger.exception("Error deleting SOP.")
        return server_error_response()



@sop_bp.route("/<int:sop_id>/versions", methods=["GET"])
@jwt_required()
def get_sop_versions(sop_id: int):

    try:
        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        from models.db_models import SOPVersionHistory
        versions = SOPVersionHistory.query.filter_by(sop_id=sop_id).order_by(SOPVersionHistory.created_at.desc()).all()
        
        serialized_versions = []
        for v in versions:
            serialized_versions.append({
                "id": v.id,
                "sop_id": v.sop_id,
                "version": v.version,
                "title": v.title,
                "summary": v.summary,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "created_by": v.created_by,
                "creator_username": v.creator.username if v.creator else None
            })
            
        return success_response(serialized_versions)
    except Exception:
        logger.exception("Error fetching SOP version history.")
        return server_error_response()



@sop_bp.route("/versions/<int:version_id>", methods=["GET"])
@jwt_required()
def get_sop_version_detail(version_id: int):

    try:
        from models.db_models import SOPVersionHistory
        version_snapshot = SOPVersionHistory.query.get(version_id)
        if version_snapshot is None:
            return not_found_response(f"SOP version history record with id {version_id} not found.")
            
        sop = SOP.query.filter_by(id=version_snapshot.sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response("Parent SOP not found or has been deleted.")

        serialized_snapshot = {
            "id": version_snapshot.id,
            "sop_id": version_snapshot.sop_id,
            "version": version_snapshot.version,
            "title": version_snapshot.title,
            "content": version_snapshot.content,
            "summary": version_snapshot.summary,
            "created_at": version_snapshot.created_at.isoformat() if version_snapshot.created_at else None,
            "created_by": version_snapshot.created_by,
            "creator_username": version_snapshot.creator.username if version_snapshot.creator else None
        }
        return success_response(serialized_snapshot)
    except Exception:
        logger.exception("Error fetching SOP version snapshot detail.")
        return server_error_response()


