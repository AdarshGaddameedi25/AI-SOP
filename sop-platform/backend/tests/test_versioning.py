import pytest
from app import create_app
from config import TestingConfig
from models import db
from models.db_models import User, SOP, SOPVersionHistory

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def _get_auth_header(client, username, email, role):
    client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "password": "password123"
    })
    user = User.query.filter_by(email=email).first()
    if user:
        user.role = role
        db.session.commit()
    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "password123"
    })
    token = res.get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_versioning_and_snapshots(app, client):
    author_headers = _get_auth_header(client, "test_author", "author@test.com", "author")
    reviewer_headers = _get_auth_header(client, "test_reviewer", "reviewer@test.com", "reviewer")
    approver_headers = _get_auth_header(client, "test_approver", "approver@test.com", "approver")

    payload = {
        "title": "Access Management SOP",
        "department": "IT",
        "template_type": "IT SOP",
        "description": "Procedure for user login control and access modification.",
        "risk_level": "Medium",
        "gxp_classification": "GxP",
        "applicable_regulations": "21 CFR Part 11",
        "systems_involved": "Active Directory",
        "process_trigger": "New user onboard",
        "process_inputs": "Manager form",
        "process_outputs": "AD account",
        "process_owner_role": "IT Lead",
        "reviewer_role": "QA Analyst",
        "approver_role": "Director",
        "affected_personnel": "IT staff",
        "site": "Main Site",
        "supersedes": "N/A",
        "audit_trail_required": True,
        "electronic_signature_required": True,
        "critical_steps": "Account activation steps"
    }
    
    res = client.post("/api/v1/sop/create", json=payload, headers=author_headers)
    assert res.status_code == 201
    sop_id = res.get_json()["data"]["id"]
    
    res = client.get(f"/api/v1/sop/{sop_id}", headers=author_headers)
    assert res.status_code == 200
    sop_data = res.get_json()["data"]
    assert sop_data["status"] == "draft"
    assert sop_data["version"] == "0.1"

    res = client.post(f"/api/v1/workflow/{sop_id}/submit-review", headers=author_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["status"] == "under_review"
    assert res.get_json()["data"]["version"] == "0.1"

    res = client.post(f"/api/v1/workflow/{sop_id}/reviewer-reject", json={"comments": "Missing section procedure details."}, headers=reviewer_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["status"] == "review_rejected"
    assert res.get_json()["data"]["version"] == "0.1"

    res = client.post(f"/api/v1/workflow/{sop_id}/resubmit", headers=author_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["status"] == "draft"
    assert res.get_json()["data"]["version"] == "0.2"

    res = client.get(f"/api/v1/sop/{sop_id}/versions", headers=author_headers)
    assert res.status_code == 200
    versions_list = res.get_json()["data"]
    assert len(versions_list) == 1
    assert versions_list[0]["version"] == "0.1"
    assert versions_list[0]["summary"] == "Missing section procedure details."
    
    version_snapshot_id = versions_list[0]["id"]
    res = client.get(f"/api/v1/sop/versions/{version_snapshot_id}", headers=author_headers)
    assert res.status_code == 200
    snapshot_data = res.get_json()["data"]
    assert snapshot_data["version"] == "0.1"
    assert snapshot_data["title"] == "Access Management SOP"

    new_content = {
        "purpose": "Updated Purpose for 0.2 draft.",
        "scope": "Scope details.",
        "responsibilities": "Responsibilities details.",
        "procedure": ["Step 1", "Step 2"],
        "references": ["Reference 1"]
    }
    
    res = client.put(f"/api/v1/sop/{sop_id}/content", json={"content": new_content}, headers=author_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["version"] == "0.2"
    assert res.get_json()["data"]["content"]["purpose"] == "Updated Purpose for 0.2 draft."

    res = client.post(f"/api/v1/workflow/{sop_id}/submit-review", headers=author_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["version"] == "0.2"

    res = client.post(f"/api/v1/workflow/{sop_id}/reviewer-approve", json={"comments": "Looks perfect now."}, headers=reviewer_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["status"] == "review_approved"
    assert res.get_json()["data"]["version"] == "0.2"

    res = client.post(f"/api/v1/workflow/{sop_id}/final-approve", json={"comments": "Officially authorizing this SOP."}, headers=approver_headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["status"] == "final_approved"
    assert res.get_json()["data"]["version"] == "1.0"

    res = client.get(f"/api/v1/sop/{sop_id}/versions", headers=author_headers)
    assert res.status_code == 200
    versions_list = res.get_json()["data"]
    assert len(versions_list) == 2
    assert versions_list[0]["version"] == "1.0"
    assert versions_list[0]["summary"] == "Officially authorizing this SOP."
    assert versions_list[1]["version"] == "0.1"
    
    version_1_snapshot_id = versions_list[0]["id"]
    res = client.get(f"/api/v1/sop/versions/{version_1_snapshot_id}", headers=author_headers)
    assert res.status_code == 200
    snapshot_1_data = res.get_json()["data"]
    assert snapshot_1_data["version"] == "1.0"
    assert snapshot_1_data["content"]["purpose"] == "Updated Purpose for 0.2 draft."
