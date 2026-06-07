import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db
from app import create_app
from sqlalchemy import text

def run_migration():
    app = create_app()
    with app.app_context():
        engine = db.engine
        
        with engine.begin() as conn:
            try:
                print("Attempting to add risk_level to sops...")
                conn.execute(text("ALTER TABLE sops ADD COLUMN risk_level VARCHAR(20) DEFAULT 'medium'"))
                print("Successfully added risk_level.")
            except Exception as e:
                print(f"Skipping risk_level (might already exist): {e}")
        
        with engine.begin() as conn:
            try:
                print("Attempting to add gxp_classification to sops...")
                conn.execute(text("ALTER TABLE sops ADD COLUMN gxp_classification VARCHAR(20) DEFAULT 'not_applicable'"))
                print("Successfully added gxp_classification.")
            except Exception as e:
                print(f"Skipping gxp_classification (might already exist): {e}")
                
        with engine.begin() as conn:
            try:
                print("Attempting to add approval_stage to approvals...")
                conn.execute(text("ALTER TABLE approvals ADD COLUMN approval_stage VARCHAR(20) DEFAULT 'review' NOT NULL"))
                print("Successfully added approval_stage.")
            except Exception as e:
                print(f"Skipping approval_stage (might already exist): {e}")

if __name__ == "__main__":
    print("Starting PostgreSQL Migration Fix...")
    run_migration()
    print("Done!")
