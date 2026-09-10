import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app.main import app
from app.database import get_db
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.services.security import create_access_token, get_password_hash
from app.test_engineer_upload import create_test_excel_bytes

client = TestClient(app)

def test_dynamic_company_upload_flow():
    db = next(get_db())
    
    # 1. Create a brand new dynamic test company that was never hardcoded anywhere
    dynamic_company_id = uuid.uuid4()
    company_name = f"Test Semiconductor Company {uuid.uuid4().hex[:6]}"
    dynamic_company = Company(
        company_id=dynamic_company_id,
        company_name=company_name,
        short_name=f"TSC-{uuid.uuid4().hex[:4].upper()}",
        created_at=datetime.utcnow()
    )
    db.add(dynamic_company)
    
    # Create Global Admin user for testing API uploads
    admin_user = db.scalars(select(User).where(User.role == "Global Admin")).first()
    if not admin_user:
        admin_user = User(
            user_id=uuid.uuid4(),
            email=f"admin_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Global Test Admin",
            role="Global Admin",
            password_hash=get_password_hash("admin123"),
            company_id=dynamic_company_id,
            is_active=True
        )
        db.add(admin_user)
    
    db.commit()
    
    token = create_access_token({"sub": str(admin_user.user_id)})
    headers_auth = {"Authorization": f"Bearer {token}"}
    
    print("\n==================================================")
    print("STARTING DYNAMIC COMPANY MULTI-TENANT TEST SUITE")
    print(f"Dynamic Company Created: '{company_name}' | UUID: {dynamic_company_id}")
    print("==================================================")
    
    # -------------------------------------------------------------
    # TEST 1: Upload new Engineer targeting dynamic_company_id (UUID)
    # -------------------------------------------------------------
    orbit_1 = f"ORB-DYN-{uuid.uuid4().hex[:6].upper()}"
    headers_eng = ["Engineer Name", "Orbit ID", "ID", "Level", "Date of Joining", "Primary Tool", "Customer Experience", "Industry Experience", "Status", "Email", "Phone Number"]
    rows_eng_1 = [["Dynamic Eng One", orbit_1, "EMP-DYN-01", "Level 1", "2025-01-01", "Tool X", "2.0", "3.0", "Active", f"eng1_{uuid.uuid4().hex[:4]}@test.com", "+1234567890"]]
    
    excel_1 = create_test_excel_bytes("Engineer", headers_eng, rows_eng_1)
    
    # Send request with X-Company-ID = dynamic_company_id
    res1 = client.post(
        "/api/upload",
        data={"module_id": "up-engineers"},
        files={"file": ("dynamic_upload.xlsx", excel_1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers={**headers_auth, "X-Company-ID": str(dynamic_company_id)}
    )
    
    assert res1.status_code == 200, f"Upload 1 failed: {res1.text}"
    body1 = res1.json()
    assert body1["success"] is True
    assert body1["inserted"] == 1
    
    # Verify in DB that new_engineer.company_id == dynamic_company_id
    db.expire_all()
    inserted_eng = db.scalars(
        select(Engineer).where(
            func.lower(Engineer.orbit_id) == orbit_1.lower(),
            Engineer.company_id == dynamic_company_id
        )
    ).first()
    
    assert inserted_eng is not None, "Engineer should be created under dynamic company UUID"
    assert inserted_eng.company_id == dynamic_company_id
    assert inserted_eng.engineer_name == "Dynamic Eng One"
    print(f"[PASS] TEST 1: New engineer dynamically assigned to company UUID '{dynamic_company_id}'")
    
    # -------------------------------------------------------------
    # TEST 2: Cross-Tenant Update Blocked
    # -------------------------------------------------------------
    # Create Company B
    company_b_id = uuid.uuid4()
    company_b = Company(
        company_id=company_b_id,
        company_name=f"Company B {uuid.uuid4().hex[:6]}",
        short_name=f"CB-{uuid.uuid4().hex[:4].upper()}",
        created_at=datetime.utcnow()
    )
    db.add(company_b)
    db.commit()
    
    # Try updating existing inserted_eng (from dynamic_company) while selecting Company B
    rows_cross = [[str(inserted_eng.engineer_id), "Malicious Renamed Eng", "EMP-HACK", orbit_1, "Level 5", "2025-01-01", "Tool X", "2.0", "3.0", "Active", "hacker@test.com", "+12345"]]
    excel_cross = create_test_excel_bytes("Engineer", headers_eng, rows_cross)
    
    res_cross = client.post(
        "/api/upload",
        data={"module_id": "up-engineers"},
        files={"file": ("cross_tenant.xlsx", excel_cross, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers={**headers_auth, "X-Company-ID": str(company_b_id)}
    )
    
    assert res_cross.status_code == 200, f"Cross upload failed: {res_cross.text}"
    body_cross = res_cross.json()
    assert body_cross["errorsCount"] > 0, "Cross-tenant update must return validation error"
    
    # Verify original engineer remains unchanged in dynamic_company
    db.expire_all()
    eng_check = db.get(Engineer, inserted_eng.engineer_id)
    assert eng_check.company_id == dynamic_company_id
    assert eng_check.engineer_name == "Dynamic Eng One"
    print("[PASS] TEST 2: Cross-tenant update blocked. Record remained under original company.")
    
    # -------------------------------------------------------------
    # TEST 3: Upload with NO company header/form field MUST FAIL (NO default/fallback)
    # -------------------------------------------------------------
    rows_no_comp = [["No Comp Eng", f"ORB-{uuid.uuid4().hex[:6]}", "EMP-00", "Level 1", "2025-01-01", "Tool X", "2.0", "3.0", "Active", "nocomp@test.com", "+12345"]]
    excel_no_comp = create_test_excel_bytes("Engineer", headers_eng, rows_no_comp)
    
    res_no_comp = client.post(
        "/api/upload",
        data={"module_id": "up-engineers"},
        files={"file": ("no_comp.xlsx", excel_no_comp, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers_auth  # NO X-Company-ID header passed!
    )
    
    assert res_no_comp.status_code == 400, f"Upload without company must fail with 400. Got: {res_no_comp.status_code} - {res_no_comp.text}"
    assert "Target company tenant not selected or invalid" in res_no_comp.json()["detail"]
    print("[PASS] TEST 3: Upload with missing company tenant rejected with HTTP 400 (No fallback).")
    
    print("==================================================")
    print("ALL DYNAMIC MULTI-TENANT TESTS PASSED SUCCESSFULLY!")
    print("==================================================\n")

if __name__ == "__main__":
    test_dynamic_company_upload_flow()
