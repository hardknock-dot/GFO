import pytest
import io
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.database import get_db, Base, engine, SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.security import get_password_hash
from app.services.sharepoint_service import SharePointServiceError

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create test companies
    comp_a_id = uuid.uuid4()
    comp_b_id = uuid.uuid4()
    
    comp_a = Company(company_id=comp_a_id, company_name=f"Test Company A {comp_a_id.hex[:4]}", short_name=f"TCA_{comp_a_id.hex[:6]}", is_active=True)
    comp_b = Company(company_id=comp_b_id, company_name=f"Test Company B {comp_b_id.hex[:4]}", short_name=f"TCB_{comp_b_id.hex[:6]}", is_active=True)
    db.add_all([comp_a, comp_b])
    
    # Create test engineers
    eng_a_id = uuid.uuid4()
    eng_b_id = uuid.uuid4()
    
    eng_a_orbit = f"ORB-{eng_a_id.hex[:6]}"
    eng_b_orbit = f"ORB-{eng_b_id.hex[:6]}"
    eng_a = Engineer(
        engineer_id=eng_a_id,
        company_id=comp_a_id,
        engineer_name="John Doe",
        orbit_id=eng_a_orbit,
        avatar_url=None
    )
    eng_b = Engineer(
        engineer_id=eng_b_id,
        company_id=comp_b_id,
        engineer_name="Jane Smith",
        orbit_id=eng_b_orbit,
        avatar_url=None
    )
    db.add_all([eng_a, eng_b])
    
    # Create test users
    user_admin_id = uuid.uuid4()
    admin_email = f"admin_{uuid.uuid4().hex[:6]}@test.com"
    user_b_email = f"userb_{uuid.uuid4().hex[:6]}@test.com"
    user_admin = User(
        user_id=user_admin_id,
        email=admin_email,
        password_hash=get_password_hash("password123"),
        full_name="Test Admin",
        role="Main Admin",
        company_id=comp_a_id,
        is_active=True
    )
    
    user_comp_b_id = uuid.uuid4()
    user_comp_b = User(
        user_id=user_comp_b_id,
        email=user_b_email,
        password_hash=get_password_hash("password123"),
        full_name="Company B User",
        role="Manager",
        company_id=comp_b_id,
        is_active=True
    )
    db.add_all([user_admin, user_comp_b])
    db.commit()
    
    yield {
        "db": db,
        "comp_a_id": str(comp_a_id),
        "comp_b_id": str(comp_b_id),
        "eng_a_id": str(eng_a_id),
        "eng_b_id": str(eng_b_id),
        "admin_email": admin_email,
        "user_b_email": user_b_email
    }
    
    db.close()

def get_auth_token(email: str):
    res = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["token"]

def test_upload_photo_invalid_file_format(setup_db):
    token = get_auth_token(setup_db["admin_email"])
    headers = {"Authorization": f"Bearer {token}"}
    
    files = {"file": ("test.txt", io.BytesIO(b"dummy text content"), "text/plain")}
    res = client.post(
        f"/api/engineers/{setup_db['eng_a_id']}/photo",
        headers=headers,
        files=files
    )
    assert res.status_code == 400
    assert "Unsupported image file format" in res.json()["detail"]

def test_upload_photo_oversized_file(setup_db):
    token = get_auth_token(setup_db["admin_email"])
    headers = {"Authorization": f"Bearer {token}"}
    
    # 6MB dummy content
    large_content = b"0" * (6 * 1024 * 1024)
    files = {"file": ("large.jpg", io.BytesIO(large_content), "image/jpeg")}
    res = client.post(
        f"/api/engineers/{setup_db['eng_a_id']}/photo",
        headers=headers,
        files=files
    )
    assert res.status_code == 400
    assert "exceeds maximum limit" in res.json()["detail"]

def test_upload_photo_cross_company_rejection(setup_db):
    token = get_auth_token(setup_db["user_b_email"])
    headers = {"Authorization": f"Bearer {token}"}
    
    # User B (Company B) tries to upload photo for Engineer A (Company A)
    files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff\xe0dummy_jpg"), "image/jpeg")}
    res = client.post(
        f"/api/engineers/{setup_db['eng_a_id']}/photo",
        headers=headers,
        files=files
    )
    assert res.status_code in (403, 404)

@patch("app.services.sharepoint_service.sharepoint_service.upload_photo")
def test_upload_photo_sharepoint_failure_rolls_back(mock_sp, setup_db):
    mock_sp.side_effect = SharePointServiceError(
        message="Unable to upload image because the ORMP application does not currently have permission to write to the SharePoint engineer-images folder.",
        status_code=403
    )
    
    token = get_auth_token(setup_db["admin_email"])
    headers = {"Authorization": f"Bearer {token}"}
    
    files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff\xe0dummy_jpg"), "image/jpeg")}
    res = client.post(
        f"/api/engineers/{setup_db['eng_a_id']}/photo",
        headers=headers,
        files=files
    )
    assert res.status_code == 403
    assert "SharePoint" in res.json()["detail"] or "permission" in res.json()["detail"]
    
    # Check DB was NOT updated
    db = setup_db["db"]
    eng = db.get(Engineer, uuid.UUID(setup_db["eng_a_id"]))
    db.refresh(eng)
    assert eng.avatar_url is None

@patch("app.services.sharepoint_service.sharepoint_service.upload_photo")
def test_upload_photo_success_updates_db_and_audit(mock_sp, setup_db):
    sp_url = "https://obtmhl.sharepoint.com/sites/GFOLamDashboard/Shared%20Documents/ORB-101.jpg"
    mock_sp.return_value = {
        "item_id": "sp-item-12345",
        "web_url": sp_url,
        "download_url": sp_url,
        "filename": "ORB-101.jpg"
    }
    
    token = get_auth_token(setup_db["admin_email"])
    headers = {"Authorization": f"Bearer {token}"}
    
    files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff\xe0dummy_jpg_content"), "image/jpeg")}
    res = client.post(
        f"/api/engineers/{setup_db['eng_a_id']}/photo",
        headers=headers,
        files=files
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["avatar_url"] == sp_url
    
    # Verify DB update
    db = setup_db["db"]
    eng = db.get(Engineer, uuid.UUID(setup_db["eng_a_id"]))
    db.refresh(eng)
    assert eng.avatar_url == sp_url
    
    # Verify Audit Log entry
    audit = db.scalars(
        select(AuditLog)
        .where(AuditLog.entity_id == uuid.UUID(setup_db["eng_a_id"]))
        .where(AuditLog.action == "ENGINEER_PHOTO_UPDATED")
    ).first()
    assert audit is not None
    assert "photo updated" in audit.description.lower()
