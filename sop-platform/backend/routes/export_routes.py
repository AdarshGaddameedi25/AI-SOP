"""
routes/export_routes.py - PDF and DOCX export endpoints for SOP documents.

Prefix: /api/v1/export

Endpoints:
    GET  /api/v1/export/<sop_id>/pdf          → stream PDF file download
    POST /api/v1/export/<sop_id>/pdf-preview  → inline PDF preview (no DB save)
    GET  /api/v1/export/<sop_id>/docx         → stream DOCX file download

Available for ALL SOP statuses. Non-approved SOPs receive a watermark.
Logs export actions to the audit trail.
"""

import logging
import re

from flask import Blueprint, send_file, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
import io

from models import db
from models.db_models import SOP, AuditLog
from services import export_service
from services.response_service import not_found_response, server_error_response, error_response
from utils.helpers import log_action

logger = logging.getLogger(__name__)
export_bp = Blueprint("export", __name__)


def _safe_filename(title: str) -> str:
    """Convert SOP title to a safe ASCII filename slug."""
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    slug = re.sub(r"[\s_-]+", "_", slug).strip("_")
    return slug[:60] or "sop"



@export_bp.route("/<int:sop_id>/pdf", methods=["GET"])
@jwt_required()
def export_pdf(sop_id: int):
    """Generate and stream a PDF export of the SOP. All statuses allowed."""
    try:
        user_id = int(get_jwt_identity())

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        if not sop.content:
            return error_response(
                "This SOP has no content yet. Please generate or add content before exporting.",
                400,
            )

        pdf_bytes, err = export_service.generate_pdf(sop)
        if err:
            return error_response(err, 500)

        filename = f"{sop.sop_number or _safe_filename(sop.title)}_v{sop.version}.pdf"

        log_action(
            db, AuditLog, sop_id, user_id, "PDF_EXPORTED",
            f"PDF exported for SOP '{sop.title}' (v{sop.version}, status={sop.status}).",
        )
        logger.info("PDF exported: sop_id=%s user_id=%s", sop_id, user_id)

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )

    except Exception:
        logger.exception("Unexpected error generating PDF for sop_id=%s.", sop_id)
        return server_error_response()


@export_bp.route("/<int:sop_id>/pdf-preview", methods=["POST"])
@jwt_required()
def preview_pdf(sop_id: int):
    """
    Generate an inline PDF preview from AI-generated content WITHOUT saving to DB.

    Accepts a JSON body: { "content": { ...SOPContent... } }
    Returns the PDF inline (Content-Disposition: inline) so browsers can render it in an iframe.
    No audit log is written — this is a transient preview only.
    """
    try:
        from flask import request

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        body = request.get_json(silent=True) or {}
        preview_content = body.get("content")
        if not preview_content:
            return error_response("Request body must include a 'content' field.", 400)

        # Build a lightweight in-memory SOP proxy — never touches the DB
        class _SOPProxy:
            def __init__(self, real_sop, content_override):
                self.id = real_sop.id
                self.title = real_sop.title
                self.sop_number = real_sop.sop_number
                self.description = real_sop.description
                self.version = real_sop.version
                self.status = real_sop.status
                self.approved_at = real_sop.approved_at
                self.creator = getattr(real_sop, "creator", None)
                self.created_by = getattr(real_sop, "created_by", None)
                self.content = content_override  # use the preview content

        proxy = _SOPProxy(sop, preview_content)
        pdf_bytes, err = export_service.generate_pdf(proxy)
        if err:
            return error_response(err, 500)

        logger.info("PDF preview generated: sop_id=%s (%d bytes)", sop_id, len(pdf_bytes))

        response = Response(
            pdf_bytes,
            mimetype="application/pdf",
        )
        response.headers["Content-Disposition"] = "inline; filename=preview.pdf"
        response.headers["Content-Length"] = str(len(pdf_bytes))
        # Allow iframe embedding from the same origin
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        return response

    except Exception:
        logger.exception("Unexpected error generating PDF preview for sop_id=%s.", sop_id)
        return server_error_response()


@export_bp.route("/<int:sop_id>/docx", methods=["GET"])
@jwt_required()
def export_docx(sop_id: int):
    """Generate and stream a DOCX export of the SOP. All statuses allowed."""
    try:
        user_id = int(get_jwt_identity())

        sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
        if sop is None:
            return not_found_response(f"SOP with id {sop_id} not found.")

        if not sop.content:
            return error_response(
                "This SOP has no content yet. Please generate or add content before exporting.",
                400,
            )

        docx_bytes, err = export_service.generate_docx(sop)
        if err:
            return error_response(err, 500)

        filename = f"{sop.sop_number or _safe_filename(sop.title)}_v{sop.version}.docx"

        log_action(
            db, AuditLog, sop_id, user_id, "DOCX_EXPORTED",
            f"DOCX exported for SOP '{sop.title}' (v{sop.version}, status={sop.status}).",
        )
        logger.info("DOCX exported: sop_id=%s user_id=%s", sop_id, user_id)

        return send_file(
            io.BytesIO(docx_bytes),
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            as_attachment=True,
            download_name=filename,
        )

    except Exception:
        logger.exception("Unexpected error generating DOCX for sop_id=%s.", sop_id)
        return server_error_response()
