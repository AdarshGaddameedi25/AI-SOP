import pytest
from unittest.mock import patch
from app import create_app
from config import TestingConfig
from models import db
from models.db_models import User, SOP

# Fake classification the AI would return
_MOCK_CLASSIFICATION = {
    "security_risk_level": "High",
    "security_risk_reason": "Procedure involves database credentials — high exposure risk.",
    "gxp_classification": "GMP",
    "information_security_classification": "Confidential",
    "safety_risk_level": "Low",
    "recommended_controls": [
        "Mocked control 1",
        "Mocked control 2",
    ],
}


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


def test_security_classification_endpoint_and_exports(app, client):
    author_headers = _get_auth_header(client, "test_author", "author@test.com", "author")

    # Step 1: Create SOP
    payload = {
        "title": "Database Credential SOP",
        "department": "IT",
        "template_type": "IT SOP",
        "description": "Procedure for database credentials access."
    }
    res = client.post("/api/v1/sop/create", json=payload, headers=author_headers)
    assert res.status_code == 201
    sop_id = res.get_json()["data"]["id"]

    # Step 2: Set content
    content_payload = {
        "content": {
            "purpose": "Define security protocols for database access.",
            "scope": "IT Department database servers.",
            "responsibilities": "DBAs are responsible for executing access controls.",
            "procedure": ["Step 1: Check DBA privileges.", "Step 2: Log into database console."],
            "references": ["Ref 1: DB Access Guide"]
        }
    }
    res = client.put(f"/api/v1/sop/{sop_id}/content", json=content_payload, headers=author_headers)
    assert res.status_code == 200

    # Step 3: Classify — mock the AI call so test runs without a real API key
    with patch(
        "services.ai_service.run_security_classification",
        return_value=(_MOCK_CLASSIFICATION, None),
    ):
        res = client.post(f"/api/v1/sop/{sop_id}/classify", headers=author_headers)

    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.get_json()}"
    data = res.get_json()["data"]
    assert data["security_risk_level"] == "High"
    assert data["gxp_classification"] == "GMP"
    assert data["information_security_classification"] == "Confidential"
    assert data["safety_risk_level"] == "Low"
    assert "Mocked control 1" in data["recommended_controls"]

    # Step 4: Verify DB persistence
    sop_db = SOP.query.get(sop_id)
    assert sop_db.risk_level == "High"
    assert sop_db.gxp_classification == "GMP"
    assert sop_db.content["security_classification"]["security_risk_level"] == "High"

    # Step 5: Export to PDF
    res = client.get(f"/api/v1/export/{sop_id}/pdf", headers=author_headers)
    assert res.status_code == 200
    assert len(res.data) > 0

    # Step 6: Export to DOCX
    res = client.get(f"/api/v1/export/{sop_id}/docx", headers=author_headers)
    assert res.status_code == 200
    assert len(res.data) > 0
