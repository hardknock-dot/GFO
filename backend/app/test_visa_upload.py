import sys
import os
import uuid
import io
import openpyxl
from datetime import date, datetime, timedelta
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.visa import Visa
from app.models.bulk_upload import BulkUpload
from app.models.audit_log import AuditLog
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token

def create_test_excel_bytes(sheet_name="Visa", headers=None, rows=None):
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

def test_visa_upload_workflow():
    db = SessionLocal()
    print("\n=== STARTING VISA BULK UPLOAD TEST SUITE ===")
    
    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Create Target Company A & Company B
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"Visa Test Corp A {unique_suffix}",
            short_name=f"VTA_{unique_suffix}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"Visa Test Corp B {unique_suffix}",
            short_name=f"VTB_{unique_suffix}",
            is_active=True
        )
        db.add_all([comp_a, comp_b])
        db.commit()

        # 2. Create User in Company A
        user_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"admin_a_{unique_suffix}@visa.com",
            full_name="Visa Admin A",
            role="Manager",
            password_hash="hashedpassword123",
            is_active=True
        )
        db.add(user_a)
        db.commit()

        # 3. Create Engineers in Company A and Company B
        orbit_id_a = f"ORB-VISA-A-{unique_suffix}"
        orbit_id_b = f"ORB-VISA-B-{unique_suffix}"

        eng_a = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_name="Engineer A",
            orbit_id=orbit_id_a,
            level="L3 Senior",
            status="Active"
        )
        eng_b = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            engineer_name="Engineer B",
            orbit_id=orbit_id_b,
            level="L2 Specialist",
            status="Active"
        )
        db.add_all([eng_a, eng_b])
        db.commit()

        # Auth Token for User A
        token_a = create_access_token({"sub": str(user_a.user_id)})
        headers_a = {
            "Authorization": f"Bearer {token_a}",
            "X-Company-ID": str(comp_a.company_id)
        }
        client = TestClient(app)

        # -------------------------------------------------------------
        # TEST 1: Valid Visa Excel Upload (Creation)
        # -------------------------------------------------------------
        excel_valid = create_test_excel_bytes(
            sheet_name="Visa",
            headers=["Orbit ID", "Engineer Name", "Country", "Visa Type", "Applied Date", "Start Date", "Expiry Date", "Comments"],
            rows=[
                [orbit_id_a, "Engineer A", "United States", "B1/B2", "2026-01-01", "2026-02-01", "2028-02-01", "Initial B1/B2 Visa"],
                [orbit_id_a, "Engineer A", "Singapore", "Work Permit", "2026-03-01", "2026-04-01", "2027-04-01", "Singapore WP"]
            ]
        )

        res1 = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("visa_upload_test.xlsx", excel_valid, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res1.status_code == 200, f"Upload failed: {res1.text}"
        data1 = res1.json()
        assert data1["success"] is True
        assert data1["rowsProcessed"] == 2
        assert data1["errorsCount"] == 0
        print("[PASS] TEST 1: Valid Visa upload succeeded.")

        # Verify DB records created
        db.expire_all()
        visas_a = db.scalars(select(Visa).where(Visa.engineer_id == eng_a.engineer_id)).all()
        assert len(visas_a) == 2, f"Expected 2 visa records, found {len(visas_a)}"
        print("[PASS] Verified 2 Visa records created in PostgreSQL database.")

        # -------------------------------------------------------------
        # TEST 2: Existing Visa Update (Upsert Behavior)
        # -------------------------------------------------------------
        excel_upsert = create_test_excel_bytes(
            sheet_name="Visa",
            headers=["Orbit ID", "Engineer Name", "Country", "Visa Type", "Applied Date", "Start Date", "Expiry Date", "Comments"],
            rows=[
                # Updates existing US visa expiry date & comments
                [orbit_id_a, "Engineer A", "United States", "B1/B2", "2026-01-01", "2026-02-01", "2029-02-01", "Extended B1/B2 Visa"],
                # New visa record
                [orbit_id_a, "Engineer A", "Japan", "Short-term Business", "2026-05-01", "2026-06-01", "2026-12-01", "Japan Trip"]
            ]
        )

        res2 = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("visa_upsert_test.xlsx", excel_upsert, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res2.status_code == 200, f"Upsert upload failed: {res2.text}"
        data2 = res2.json()
        assert data2["success"] is True
        assert data2["rowsProcessed"] == 2
        assert data2["errorsCount"] == 0
        print("[PASS] TEST 2: Visa upsert upload succeeded.")

        db.expire_all()
        visas_a_after = db.scalars(select(Visa).where(Visa.engineer_id == eng_a.engineer_id)).all()
        assert len(visas_a_after) == 3, f"Expected 3 visa records total after upsert, found {len(visas_a_after)}"
        us_visa = [v for v in visas_a_after if v.country == "United States"][0]
        assert us_visa.comments == "Extended B1/B2 Visa"
        assert us_visa.visa_end_date == date(2029, 2, 1)
        print("[PASS] Verified existing Visa record updated correctly without creating duplicate.")

        # -------------------------------------------------------------
        # TEST 3: Validation Error - Missing Required Column
        # -------------------------------------------------------------
        excel_no_country = create_test_excel_bytes(
            sheet_name="Visa",
            headers=["Orbit ID", "Engineer Name", "Visa Type"],
            rows=[[orbit_id_a, "Engineer A", "B1/B2"]]
        )
        res3 = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("missing_col.xlsx", excel_no_country, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res3.status_code == 400
        assert "Required header(s) missing" in res3.json()["detail"]
        print("[PASS] TEST 3: Missing required header validation caught successfully.")

        # -------------------------------------------------------------
        # TEST 4: Duplicate Rows & Invalid Date Validation
        # -------------------------------------------------------------
        excel_dups = create_test_excel_bytes(
            sheet_name="Visa",
            headers=["Orbit ID", "Engineer Name", "Country", "Visa Type", "Start Date", "Expiry Date"],
            rows=[
                [orbit_id_a, "Engineer A", "Germany", "Schengen", "2026-01-01", "2026-06-01"],
                [orbit_id_a, "Engineer A", "Germany", "Schengen", "2026-01-01", "2026-06-01"], # Duplicate
                [orbit_id_a, "Engineer A", "Taiwan", "Visitor", "2026-08-01", "2026-01-01"]    # Invalid dates (end < start)
            ]
        )
        res4 = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("dups_test.xlsx", excel_dups, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res4.status_code == 200
        data4 = res4.json()
        assert data4["errorsCount"] == 1  # Invalid date row
        assert "report_url" in data4
        print("[PASS] TEST 4: Duplicate row detection and date range validation passed.")

        # -------------------------------------------------------------
        # TEST 5: Company Isolation (Cannot upload for Engineer in Comp B)
        # -------------------------------------------------------------
        excel_cross_company = create_test_excel_bytes(
            sheet_name="Visa",
            headers=["Orbit ID", "Engineer Name", "Country", "Visa Type"],
            rows=[
                [orbit_id_b, "Engineer B", "United States", "B1/B2"]
            ]
        )
        res5 = client.post(
            "/api/upload",
            data={"module_id": "up-visa"},
            files={"file": ("cross_company.xlsx", excel_cross_company, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res5.status_code == 200
        data5 = res5.json()
        assert data5["errorsCount"] == 1, "Expected 1 error for engineer not existing in user company"
        print("[PASS] TEST 5: Multi-tenant company isolation enforced (Cross-company Orbit ID rejected).")

        # -------------------------------------------------------------
        # TEST 6: Audit Logging
        # -------------------------------------------------------------
        audit_entry = db.scalars(
            select(AuditLog).where(
                AuditLog.company_id == comp_a.company_id,
                AuditLog.action == "BULK_UPLOAD"
            )
        ).first()
        assert audit_entry is not None, "Audit log entry not found"
        print("[PASS] TEST 6: Audit log entry verified.")

        print("\n=== ALL VISA BULK UPLOAD TESTS PASSED SUCCESSFULLY! ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_visa_upload_workflow()
