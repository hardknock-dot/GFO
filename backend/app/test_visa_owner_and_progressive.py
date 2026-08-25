import sys
import os
import uuid
import openpyxl
import io
from datetime import date, datetime
from sqlalchemy import select
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.visa import Visa
from app.main import app
from app.services.security import create_access_token
from app.schemas.visa import VisaCreate, VisaUpdate
from app.services import visa_service

def create_test_excel(headers, rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Visa"
    ws.append(headers)
    for r in rows:
        ws.append(r)
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    return bio.getvalue()

def run_tests():
    db = SessionLocal()
    print("\n=== STARTING VISA OWNER & TENANT ISOLATION TEST SUITE ===")
    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Setup Company A and Company B
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"Visa Owner Corp A {unique_suffix}",
            short_name=f"VOCA_{unique_suffix}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"Visa Owner Corp B {unique_suffix}",
            short_name=f"VOCB_{unique_suffix}",
            is_active=True
        )
        db.add_all([comp_a, comp_b])
        db.commit()

        # 2. Setup Users in Company A & Company B
        user_a1 = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"owner_a1_{unique_suffix}@visa.com",
            full_name="Owner User A1",
            role="Manager",
            password_hash="pass123",
            is_active=True
        )
        user_a2 = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"owner_a2_{unique_suffix}@visa.com",
            full_name="Owner User A2",
            role="Manager",
            password_hash="pass123",
            is_active=True
        )
        user_b = User(
            user_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            email=f"owner_b_{unique_suffix}@visa.com",
            full_name="Owner User B",
            role="Manager",
            password_hash="pass123",
            is_active=True
        )
        db.add_all([user_a1, user_a2, user_b])
        db.commit()

        # 3. Setup Engineers
        orbit_a = f"ORB-OWN-{unique_suffix}"
        eng_a = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_name="Engineer A",
            orbit_id=orbit_a,
            level="L3",
            status="Active"
        )
        db.add(eng_a)
        db.commit()

        # -------------------------------------------------------------
        # TEST 1: Visa can have an owner & API returns owner correctly
        # -------------------------------------------------------------
        v1_data = VisaCreate(country="Germany", visa_type="Work Permit", owner_id=user_a1.user_id)
        visa1 = visa_service.create_visa(db, eng_a.engineer_id, v1_data)
        assert visa1.owner_id == user_a1.user_id
        assert visa1.owner is not None
        assert visa1.owner["email"] == user_a1.email
        print("[PASS] TEST 1: Visa successfully created with Owner user.")

        # -------------------------------------------------------------
        # TEST 2: Owner can be changed to another valid user in same company
        # -------------------------------------------------------------
        up_data = VisaUpdate(owner_id=user_a2.user_id)
        visa1_updated = visa_service.update_visa(db, visa1.visa_id, up_data)
        assert visa1_updated.owner_id == user_a2.user_id
        assert visa1_updated.owner["email"] == user_a2.email
        print("[PASS] TEST 2: Visa owner successfully updated to new user in same company.")

        # -------------------------------------------------------------
        # TEST 3: Owner can be cleared (set to NULL)
        # -------------------------------------------------------------
        clear_data = VisaUpdate(owner_id=None)
        visa1_cleared = visa_service.update_visa(db, visa1.visa_id, clear_data)
        assert visa1_cleared.owner_id is None
        assert visa1_cleared.owner is None
        print("[PASS] TEST 3: Visa owner successfully cleared to NULL.")

        # -------------------------------------------------------------
        # TEST 4 & 5: Cross-company owner assignment is rejected
        # -------------------------------------------------------------
        cross_data = VisaCreate(country="Japan", visa_type="Short Term", owner_id=user_b.user_id)
        try:
            visa_service.create_visa(db, eng_a.engineer_id, cross_data)
            assert False, "Should have raised HTTPException for cross-company owner"
        except Exception as err:
            assert "Cross-company" in str(err) or "422" in str(err)
            print("[PASS] TEST 4 & 5: Cross-company owner assignment correctly rejected with HTTP 422.")

        # -------------------------------------------------------------
        # TEST 6 & 11: Existing Visa records with NULL owner still work & return owner=null
        # -------------------------------------------------------------
        null_data = VisaCreate(country="Taiwan", visa_type="Resident Permit", owner_id=None)
        visa_null = visa_service.create_visa(db, eng_a.engineer_id, null_data)
        assert visa_null.owner_id is None
        assert visa_null.owner is None
        print("[PASS] TEST 6 & 11: Visa record with NULL owner returns owner=null cleanly.")

        # -------------------------------------------------------------
        # TEST 7: Visa Bulk Upload can assign Owner by email
        # -------------------------------------------------------------
        token = create_access_token({"sub": str(user_a1.user_id)})
        headers = {"Authorization": f"Bearer {token}", "X-Company-ID": str(comp_a.company_id)}
        client = TestClient(app)

        excel_bytes = create_test_excel(
            headers=["Orbit ID", "Engineer Name", "Country", "Visa Type", "Owner Email"],
            rows=[[orbit_a, "Engineer A", "UK", "Business Visa", user_a1.email]]
        )

        res_up = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("visa_test.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers
        )
        assert res_up.status_code == 200, res_up.text
        db.expire_all()
        created_v = db.scalars(select(Visa).where(Visa.engineer_id == eng_a.engineer_id, Visa.country == "UK")).first()
        assert created_v is not None
        assert created_v.owner_id == user_a1.user_id
        print("[PASS] TEST 7: Bulk upload successfully resolved and assigned Owner by email.")

        # -------------------------------------------------------------
        # TEST 8: Invalid Owner in Bulk Upload is caught in report
        # -------------------------------------------------------------
        excel_bad_owner = create_test_excel(
            headers=["Orbit ID", "Engineer Name", "Country", "Visa Type", "Owner Email"],
            rows=[[orbit_a, "Engineer A", "Canada", "Work Permit", "invalid_email@nowhere.com"]]
        )

        res_bad = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("visa_bad_owner.xlsx", excel_bad_owner, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers
        )
        assert res_bad.status_code == 200
        assert res_bad.json()["errorsCount"] == 1
        print("[PASS] TEST 8: Invalid owner email caught in validation report.")

        # -------------------------------------------------------------
        # TEST 9: Existing owner is preserved when Owner is omitted during update
        # -------------------------------------------------------------
        up_no_owner = VisaUpdate(country="United Kingdom")
        v_preserved = visa_service.update_visa(db, created_v.visa_id, up_no_owner)
        assert v_preserved.owner_id == user_a1.user_id
        print("[PASS] TEST 9: Existing visa owner preserved when owner field is omitted during update.")

        # -------------------------------------------------------------
        # TEST 10: GET /api/visa returns owner object correctly
        # -------------------------------------------------------------
        res_get = client.get(f"/api/visa?engineer_id={eng_a.engineer_id}", headers=headers)
        assert res_get.status_code == 200
        items = res_get.json()["items"]
        assert len(items) >= 1
        has_owner_obj = any(i["owner"] is not None and i["owner"]["email"] == user_a1.email for i in items)
        assert has_owner_obj
        print("[PASS] TEST 10: API GET /api/visa serializes owner object correctly.")

        print("\n=== ALL 11 VISA OWNER & TENANT ISOLATION TESTS PASSED! ===")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
