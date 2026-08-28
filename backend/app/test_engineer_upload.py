import sys
import os
import uuid
import io
import openpyxl
from datetime import date, datetime
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.bulk_upload import BulkUpload
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token

def create_test_excel_bytes(sheet_name="Engineer", headers=None, rows=None):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name

    if headers:
        ws.append(headers)
    if rows:
        for r in rows:
            ws.append(r)

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    return bio.getvalue()

def test_engineer_upload_workflow():
    db = SessionLocal()
    print("\n=== STARTING ENGINEER BULK UPLOAD TEST SUITE ===")
    
    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Create Target Company
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"Engineer Test Corp {unique_suffix}",
            short_name=f"ETC_{unique_suffix}",
            is_active=True
        )
        db.add(comp_a)
        db.commit()

        # 2. Create User in Company A
        user_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"admin_{unique_suffix}@eng.com",
            full_name="Engineer Admin A",
            role="Manager",
            password_hash="hashedpassword123",
            is_active=True
        )
        db.add(user_a)
        db.commit()

        token_a = create_access_token({"sub": str(user_a.user_id)})
        headers_auth = {
            "Authorization": f"Bearer {token_a}",
            "X-Company-ID": str(comp_a.company_id)
        }

        client = TestClient(app)

        # Headers for Excel
        headers_excel = [
            "Engineer Name", "Goes By", "Employee ID", "Orbit ID", "Level",
            "Date of Joining", "Primary Tool", "Customer Experience", "Industry Experience",
            "Status", "Email", "Phone Number"
        ]

        orbit_id_1 = f"ORB-ENG-1-{unique_suffix}"
        orbit_id_2 = f"ORB-ENG-2-{unique_suffix}"

        # TEST 1: Creation of New Engineers via Bulk Upload
        rows_v1 = [
            ["Alice Smith", "Alice", "EMP-001", orbit_id_1, "Level 1", "2023-01-15", "Tool Alpha", "2.5", "5.0", "Active", f"alice_{unique_suffix}@test.com", "+1234567890"],
            ["Bob Jones", "Bob", "EMP-002", orbit_id_2, "Level 2", "2022-06-01", "Tool Beta", "4.0", "7.5", "Active", f"bob_{unique_suffix}@test.com", "+1987654321"]
        ]

        excel_v1 = create_test_excel_bytes("Engineer", headers_excel, rows_v1)

        res1 = client.post(
            "/api/upload",
            data={"module_id": "up-engineers", "company_id": str(comp_a.company_id)},
            files={"file": ("engineer_upload_v1.xlsx", excel_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res1.status_code == 200, f"Upload 1 failed: {res1.text}"
        body1 = res1.json()
        assert body1["success"] is True
        assert body1["errorsCount"] == 0
        assert "Ingested 2 new engineer records" in body1["message"]

        # Verify DB records created
        eng1_db = db.scalars(select(Engineer).where(Engineer.orbit_id == orbit_id_1, Engineer.company_id == comp_a.company_id)).first()
        eng2_db = db.scalars(select(Engineer).where(Engineer.orbit_id == orbit_id_2, Engineer.company_id == comp_a.company_id)).first()
        assert eng1_db is not None, "Alice was not created in DB"
        assert eng2_db is not None, "Bob was not created in DB"
        assert eng1_db.engineer_name == "Alice Smith"
        assert eng1_db.level == "Level 1"
        assert float(eng1_db.lam_experience) == 2.5
        print("[PASS] TEST 1: New engineer creation via bulk upload succeeded.")

        # TEST 2: Update Existing Engineers via Bulk Upload (Upsert)
        # Test header aliases ('Customer Exp (Years)', 'Industry Exp') and formats ('4.5 yrs', '8.5+')
        headers_excel_v2 = [
            "Engineer Name", "Goes By", "Employee ID", "Orbit ID", "Level",
            "Date of Joining", "Primary Tool", "Customer Exp (Years)", "Industry Exp",
            "Status", "Email", "Phone Number"
        ]
        rows_v2 = [
            ["Alice Smith Updated", "Ally", "EMP-001", orbit_id_1, "Level 2 Senior", "2023-01-15", "Tool Alpha Prime", "4.5 yrs", "8.5+", "Active", f"alice_{unique_suffix}@test.com", "+1112223333"],
            ["Bob Jones", "Bob", "EMP-002", orbit_id_2, "Level 2", "2022-06-01", "Tool Beta", "4.0", "7.5", "Active", f"bob_{unique_suffix}@test.com", "+1987654321"]
        ]
        excel_v2 = create_test_excel_bytes("Engineer", headers_excel_v2, rows_v2)

        res2 = client.post(
            "/api/upload",
            data={"module_id": "up-engineers", "company_id": str(comp_a.company_id)},
            files={"file": ("engineer_upload_v2.xlsx", excel_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res2.status_code == 200, f"Upload 2 failed: {res2.text}"
        body2 = res2.json()
        assert body2["success"] is True
        assert body2["errorsCount"] == 0
        assert "Replaced 2 existing engineer records" in body2["message"]

        # Verify DB records were replaced (new UUID for same Orbit ID, updated fields)
        db.expire_all()
        eng1_updated = db.scalars(select(Engineer).where(Engineer.orbit_id == orbit_id_1, Engineer.company_id == comp_a.company_id)).first()
        assert eng1_updated is not None, "Engineer record should exist after replacement"
        assert eng1_updated.engineer_name == "Alice Smith Updated"
        assert eng1_updated.goes_by == "Ally"
        assert eng1_updated.level == "Level 2 Senior"
        assert float(eng1_updated.lam_experience) == 4.5
        assert float(eng1_updated.industry_experience) == 8.5
        assert eng1_updated.phone_number == "+1112223333"
        print("[PASS] TEST 2: Previous engineer record deleted and replaced with latest uploaded data.")

        # TEST 3: Validation Error Handling (Bad Email & Duplicate in Sheet)
        rows_v3 = [
            ["Charlie", "Charlie", "EMP-003", f"ORB-ENG-3-{unique_suffix}", "Level 1", "2023-01-15", "Tool", "1", "1", "Active", "invalid-email-format", "123"],
            ["Duplicate Orbit", "Dup", "EMP-004", orbit_id_1, "Level 1", "2023-01-15", "Tool", "1", "1", "Active", f"dup_{unique_suffix}@test.com", "123"]
        ]
        excel_v3 = create_test_excel_bytes("Engineer", headers_excel, rows_v3)

        res3 = client.post(
            "/api/upload",
            data={"module_id": "up-engineers", "company_id": str(comp_a.company_id)},
            files={"file": ("engineer_upload_v3.xlsx", excel_v3, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res3.status_code == 200, f"Upload 3 failed: {res3.text}"
        body3 = res3.json()
        assert body3["errorsCount"] > 0
        print("[PASS] TEST 3: Validation errors and duplicate orbit IDs caught correctly.")

        print("\n=== ALL ENGINEER BULK UPLOAD TESTS PASSED SUCCESSFULLY! ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_engineer_upload_workflow()
