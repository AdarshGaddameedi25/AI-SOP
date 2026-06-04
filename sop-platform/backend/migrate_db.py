from app import create_app
from models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Starting PostgreSQL database migration...")
            
            sops_alter_queries = [
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS sop_number VARCHAR(50) UNIQUE",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS gxp_classification VARCHAR(50)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS applicable_regulations TEXT",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS systems_involved TEXT",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS process_trigger TEXT",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS process_inputs TEXT",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS process_outputs TEXT",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS process_owner_role VARCHAR(150)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(150)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS approver_role VARCHAR(150)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS affected_personnel TEXT",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS site VARCHAR(150)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS supersedes VARCHAR(100)",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS audit_trail_required BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS electronic_signature_required BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE sops ADD COLUMN IF NOT EXISTS critical_steps TEXT",
                "ALTER TABLE sops ALTER COLUMN version TYPE VARCHAR(20) USING version::VARCHAR(20)"
            ]
            for query in sops_alter_queries:
                conn.execute(text(query))
                print(f"Executed: {query}")
                
            indexes_queries = [
                "CREATE INDEX IF NOT EXISTS idx_sop_status ON sops (status)",
                "CREATE INDEX IF NOT EXISTS idx_sop_created_by ON sops (created_by)",
                "CREATE INDEX IF NOT EXISTS idx_sop_current_reviewer ON sops (current_reviewer)"
            ]
            for query in indexes_queries:
                conn.execute(text(query))
                print(f"Executed: {query}")

            reports_alter_queries = [
                "ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS classification VARCHAR(100)",
                "ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS total_checks INTEGER",
                "ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS passed_checks_count INTEGER",
                "ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS failed_checks_count INTEGER",
                "ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS audit_results JSON DEFAULT '{}'",
                "ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS critical_failures JSON DEFAULT '[]'"
            ]
            for query in reports_alter_queries:
                conn.execute(text(query))
                print(f"Executed: {query}")
                
            users_alter_queries = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE"
            ]
            for query in users_alter_queries:
                conn.execute(text(query))
                print(f"Executed: {query}")
                
            trans.commit()
            print("PostgreSQL database migration completed successfully!")
        except Exception as e:
            trans.rollback()
            print("Migration failed, rolling back changes.")
            raise e
