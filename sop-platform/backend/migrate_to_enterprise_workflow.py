"""
migrate_to_enterprise_workflow.py — Safe database migration script.

Upgrades the database from the 3-role/4-status system to the
enterprise 4-role/6-status architecture.

Changes applied:
  1. Add new columns to 'sops' table:
     - current_approver (INTEGER FK → users.id)
     - reviewer_approved_at (DATETIME)
     - approved_at (DATETIME)

  2. Add new column to 'approvals' table:
     - approval_stage (VARCHAR(20), default 'review')

  3. Add new column to 'compliance_reports' table:
     - triggered_by (INTEGER FK → users.id)

  4. Migrate existing SOP statuses:
     - 'review'    → 'under_review'
     - 'approved'  → 'final_approved'
     - 'rejected'  → 'review_rejected'

  5. Populate approval_stage for existing Approval rows → 'review'

  6. Add new database index: idx_sop_current_approver

Usage:
  cd sop-platform/backend
  python migrate_to_enterprise_workflow.py

The script is idempotent — safe to run multiple times.
"""

import sys
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db
from sqlalchemy import text, inspect


def column_exists(connection, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table without failing if it doesn't."""
    inspector = inspect(connection)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def index_exists(connection, index_name: str) -> bool:
    """Check if an index exists by name (works for PostgreSQL and SQLite)."""
    try:
        result = connection.execute(
            text("SELECT indexname FROM pg_indexes WHERE indexname = :name"),
            {"name": index_name},
        )
        return result.fetchone() is not None
    except Exception:
        try:
            result = connection.execute(
                text("SELECT name FROM sqlite_master WHERE type='index' AND name=:name"),
                {"name": index_name},
            )
            return result.fetchone() is not None
        except Exception:
            return False


def run_migration():
    """Execute all migration steps."""
    app = create_app()

    with app.app_context():
        with db.engine.connect() as conn:
            logger.info("=" * 60)
            logger.info("Enterprise Workflow Migration — Starting")
            logger.info("=" * 60)

            logger.info("\n[STEP 1] Adding new columns to 'sops' table...")

            new_sop_columns = [
                ("current_approver",      "INTEGER"),
                ("reviewer_approved_at",  "TIMESTAMP WITH TIME ZONE"),
                ("approved_at",           "TIMESTAMP WITH TIME ZONE"),
            ]

            for col_name, col_def in new_sop_columns:
                if not column_exists(conn, "sops", col_name):
                    conn.execute(text(f"ALTER TABLE sops ADD COLUMN {col_name} {col_def}"))
                    logger.info("  \u2713 Added column 'sops.%s'", col_name)
                else:
                    logger.info("  \u00b7 Skipping 'sops.%s' \u2014 already exists", col_name)

            try:
                conn.execute(text(
                    "ALTER TABLE sops ADD CONSTRAINT fk_sops_current_approver "
                    "FOREIGN KEY (current_approver) REFERENCES users(id)"
                ))
                logger.info("  \u2713 Added FK constraint on sops.current_approver")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    logger.info("  \u00b7 FK constraint on sops.current_approver already exists")
                else:
                    logger.warning("  \u00b7 Could not add FK constraint (non-fatal): %s", e)

            logger.info("\n[STEP 2] Adding 'approval_stage' to 'approvals' table...")

            if not column_exists(conn, "approvals", "approval_stage"):
                conn.execute(text(
                    "ALTER TABLE approvals ADD COLUMN approval_stage VARCHAR(20) DEFAULT 'review'"
                ))
                logger.info("  \u2713 Added column 'approvals.approval_stage'")
            else:
                logger.info("  \u00b7 Skipping 'approvals.approval_stage' \u2014 already exists")

            logger.info("\n[STEP 3] Adding 'triggered_by' to 'compliance_reports' table...")

            if not column_exists(conn, "compliance_reports", "triggered_by"):
                conn.execute(text(
                    "ALTER TABLE compliance_reports ADD COLUMN triggered_by INTEGER"
                ))
                try:
                    conn.execute(text(
                        "ALTER TABLE compliance_reports ADD CONSTRAINT fk_cr_triggered_by "
                        "FOREIGN KEY (triggered_by) REFERENCES users(id)"
                    ))
                    logger.info("  \u2713 Added column + FK 'compliance_reports.triggered_by'")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info("  \u2713 Added column 'compliance_reports.triggered_by' (FK already exists)")
                    else:
                        logger.warning("  \u2713 Added column, FK warning (non-fatal): %s", e)
            else:
                logger.info("  \u00b7 Skipping 'compliance_reports.triggered_by' \u2014 already exists")

            logger.info("\n[STEP 4] Migrating SOP statuses...")

            status_migrations = [
                ("review",   "under_review",    "review → under_review"),
                ("approved", "final_approved",  "approved → final_approved"),
                ("rejected", "review_rejected", "rejected → review_rejected"),
            ]

            for old_status, new_status, label in status_migrations:
                result = conn.execute(
                    text("SELECT COUNT(*) FROM sops WHERE status = :status"),
                    {"status": old_status},
                )
                count = result.scalar()

                if count > 0:
                    conn.execute(
                        text("UPDATE sops SET status = :new WHERE status = :old"),
                        {"new": new_status, "old": old_status},
                    )
                    logger.info("  ✓ Migrated %d SOP(s): %s", count, label)
                else:
                    logger.info("  · No SOPs with status '%s' — skipping", old_status)

            logger.info("\n[STEP 5] Populating approval_stage for existing approvals...")

            result = conn.execute(
                text("SELECT COUNT(*) FROM approvals WHERE approval_stage IS NULL OR approval_stage = ''")
            )
            null_count = result.scalar()

            if null_count > 0:
                conn.execute(
                    text("UPDATE approvals SET approval_stage = 'review' WHERE approval_stage IS NULL OR approval_stage = ''")
                )
                logger.info("  ✓ Set approval_stage='review' for %d existing approval(s)", null_count)
            else:
                logger.info("  · All existing approvals already have approval_stage set")

            logger.info("\n[STEP 6] Adding index idx_sop_current_approver...")

            if not index_exists(conn, "idx_sop_current_approver"):
                try:
                    conn.execute(text(
                        "CREATE INDEX idx_sop_current_approver ON sops (current_approver)"
                    ))
                    logger.info("  ✓ Created index 'idx_sop_current_approver'")
                except Exception as e:
                    logger.warning("  · Could not create index (may already exist): %s", e)
            else:
                logger.info("  · Index 'idx_sop_current_approver' already exists")

            conn.commit()

            logger.info("\n" + "=" * 60)
            logger.info("Migration completed successfully!")
            logger.info("=" * 60)
            logger.info("\nSummary of changes applied:")
            logger.info("  • sops.current_approver         — Approver user FK")
            logger.info("  • sops.reviewer_approved_at     — Reviewer gate timestamp")
            logger.info("  • sops.approved_at              — Final approval timestamp")
            logger.info("  • approvals.approval_stage      — 'review' or 'final'")
            logger.info("  • compliance_reports.triggered_by — Reviewer who ran check")
            logger.info("  • Status mapping: review→under_review, approved→final_approved,")
            logger.info("                    rejected→review_rejected")
            logger.info("  • New index on sops.current_approver")
            logger.info("\nYour database is now ready for the enterprise 4-role workflow.")


if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        logger.exception("Migration failed: %s", e)
        sys.exit(1)
