"""
services/compliance_service.py - Rule-based scoring + AI analysis for SOP compliance.

Two-phase compliance check:
1. Rule-based: Check which of the 5 core sections exist in the content.
2. AI-based: Send full content to Gemini for detailed compliance analysis.

The final report merges both, persists to ComplianceReport table, and returns
a rich result including: score, classification, passed_checks, failed_checks,
missing_sections, and recommendations.
"""

import logging

from constants import (
    SOP_CONTENT_SECTIONS,
    COMPLIANCE_POINTS_PER_SECTION,
    COMPLIANCE_CLASSIFICATIONS,
    COMPLIANCE_CLASSIFICATION_LABELS,
)
from services import ai_service
from services.serializer_service import serialize_compliance_report

logger = logging.getLogger(__name__)


def _classify_score(score: int) -> str:
    """Return the compliance classification label for a given score."""
    if score >= COMPLIANCE_CLASSIFICATIONS["audit_ready"]:
        return COMPLIANCE_CLASSIFICATION_LABELS["audit_ready"]
    elif score >= COMPLIANCE_CLASSIFICATIONS["minor_gaps"]:
        return COMPLIANCE_CLASSIFICATION_LABELS["minor_gaps"]
    elif score >= COMPLIANCE_CLASSIFICATIONS["moderate_gaps"]:
        return COMPLIANCE_CLASSIFICATION_LABELS["moderate_gaps"]
    else:
        return COMPLIANCE_CLASSIFICATION_LABELS["major_revision"]


def calculate_rule_based_score(content: dict) -> tuple[int, list[str]]:
    """Score an SOP's content based on presence of the 5 core required sections."""
    missing: list[str] = []
    points = 0

    for section in SOP_CONTENT_SECTIONS:
        value = content.get(section)
        is_present = False

        if isinstance(value, list):
            is_present = len(value) > 0
        elif isinstance(value, str):
            is_present = bool(value.strip())
        elif value:
            is_present = True

        if is_present:
            points += COMPLIANCE_POINTS_PER_SECTION
        else:
            missing.append(section)

    return points, missing


def run_full_compliance_check(
    db, SOP, ComplianceReport, sop_id: int,
    triggered_by_user_id: int | None = None,
) -> tuple[dict | None, str | None]:
    """
    Orchestrate a full compliance check for the given SOP ID.

    Steps:
    1. Load SOP from DB.
    2. Run rule-based structural check (score 0-100).
    3. Run AI Gemini compliance analysis.
    4. Merge results (combine missing sections, use AI score if available, merge lists).
    5. Persist ComplianceReport to database.
    6. Return serialized report.
    """
    sop = SOP.query.filter_by(id=sop_id, is_deleted=False).first()
    if sop is None:
        return None, f"SOP with id {sop_id} not found."

    content = sop.content or {}
    if not content:
        return None, (
            "SOP has no content to evaluate. "
            "Please generate or add content before running a compliance check."
        )

    rule_score, rule_missing = calculate_rule_based_score(content)
    logger.info(
        "Rule-based compliance score for sop_id=%s: %d/100 (missing: %s)",
        sop_id, rule_score, rule_missing,
    )

    ai_result, ai_error = ai_service.run_compliance_check(content)

    if ai_error:
        logger.warning(
            "AI compliance check failed for sop_id=%s: %s (using rule-based data only)",
            sop_id, ai_error,
        )
        ai_score = rule_score
        ai_classification = _classify_score(rule_score)
        ai_missing: list[str] = []
        ai_recommendations: list[str] = []
        ai_total = 0
        ai_passed = 0
        ai_failed = 0
        ai_audit_results = {}
        ai_critical_failures: list[str] = []
    else:
        ai_score = ai_result.get("compliance_score", rule_score)
        ai_classification = ai_result.get("classification") or _classify_score(ai_score)
        ai_missing = ai_result.get("missing_sections", [])
        ai_recommendations = ai_result.get("recommendations", [])
        ai_total = ai_result.get("total_checks", 0)
        ai_passed = ai_result.get("passed_checks", 0)
        ai_failed = ai_result.get("failed_checks", 0)
        ai_audit_results = ai_result.get("audit_results", {})
        ai_critical_failures = ai_result.get("critical_failures", [])

    combined_missing = list(dict.fromkeys(rule_missing + ai_missing))

    final_score = min(ai_score, rule_score) if rule_missing else ai_score
    final_classification = _classify_score(final_score)

    try:
        report = ComplianceReport(
            sop_id=sop_id,
            score=final_score,
            classification=final_classification,
            total_checks=ai_total,
            passed_checks_count=ai_passed,
            failed_checks_count=ai_failed,
            audit_results=ai_audit_results,
            critical_failures=ai_critical_failures,
            missing_sections=combined_missing,
            recommendations=ai_recommendations,
            triggered_by=triggered_by_user_id,
        )
        db.session.add(report)
        db.session.commit()
        logger.info(
            "Compliance report saved: id=%s sop_id=%s score=%s classification=%s",
            report.id, sop_id, final_score, final_classification,
        )
    except Exception:
        logger.exception("Failed to save compliance report for sop_id=%s", sop_id)
        db.session.rollback()
        return None, "Failed to save compliance report to the database."

    result = serialize_compliance_report(report)
    return result, None
