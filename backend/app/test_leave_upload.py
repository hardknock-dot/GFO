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
from app.models.leave import Leave
from app.models.bulk_upload import BulkUpload
from app.models.audit_log import AuditLog
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token

def create_test_excel_bytes(sheet_name="Leave", headers=None, rows=None):
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

def test_leave_upload_workflow():
    db = SessionLocal()
    print("\n=== STARTING LEAVE BULK UPLOAD TEST SUITE ===")
    
    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Create Target Company A & Company B
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"Leave Test Corp A {unique_suffix}",
            short_name=f"LVA_{unique_suffix}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"Leave Test Corp B {unique_suffix}",
            short_name=f"LVB_{unique_suffix}",
            is_active=True
        )
        db.add_all([comp_a, comp_b])
        db.commit()

        # 2. Create User in Company A
        user_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"admin_a_{unique_suffix}@leave.com",
            full_name="Leave Admin A",
            role="Manager",
            password_hash="hashedpassword123",
            is_active=True
        )
        db.add(user_a)
        db.commit()

        # 3. Create Engineers in Company A and Company B
        orbit_id_a = f"ORB-LEV-A-{unique_suffix}"
        orbit_id_b = f"ORB-LEV-B-{unique_suffix}"

        eng_a = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_name="Leave Engineer A",
            orbit_id=orbit_id_a,
            level="L3 Senior",
            status="Active"
        )
        eng_b = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            engineer_name="Leave Engineer B",
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
        # TEST 1: Valid Leave Excel Upload (Creation)
        # -------------------------------------------------------------
        excel_valid = create_test_excel_bytes(
            sheet_name="Leave",
            headers=["Orbit ID", "Engineer Name", "Leave Type", "Requested Date", "Requested On", "Approval Status"],
            rows=[
                [orbit_id_a, "Leave Engineer A", "Annual Leave", "2026-03-15", "2026-03-01", "Approved"],
                [orbit_id_a, "Leave Engineer A", "Sick Leave", "2026-04-10", "2026-04-09", "Pending"]
            ]
        )

        res1 = client.post(
            "/api/upload",
            data={"module_id": "up-leave"},
            files={"file": ("leave_upload_test.xlsx", excel_valid, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res1.status_code == 200, f"Upload failed: {res1.text}"
        data1 = res1.json()
        assert data1["success"] is True
        assert data1["rowsProcessed"] == 2
        assert data1["errorsCount"] == 0
        print("[PASS] TEST 1: Valid Leave upload succeeded.")

        # Verify DB records created
        db.expire_all()
        leaves_a = db.scalars(
            select(Leave)
            .where(Leave.engineer_id == eng_a.engineer_id)
        ).all()
        assert len(leaves_a) == 2, f"Expected 2 leave records, found {len(leaves_a)}"
        print("[PASS] Verified 2 Leave records created in PostgreSQL database.")

        # -------------------------------------------------------------
        # TEST 2: Existing Leave Update (Upsert Behavior)
        # -------------------------------------------------------------
        excel_upsert = create_test_excel_bytes(
            sheet_name="Leave",
            headers=["Orbit ID", "Engineer Name", "Leave Type", "Requested Date", "Requested On", "Approval Status"],
            rows=[
                # Updates existing "Sick Leave" record status from Pending to Approved
                [orbit_id_a, "Leave Engineer A", "Sick Leave", "2026-04-10", "2026-04-09", "Approved"],
                # New leave record
                [orbit_id_a, "Leave Engineer A", "Training", "2026-05-20", "2026-05-10", "Approved"]
            ]
        )

        res2 = client.post(
            "/api/upload",
            data={"module_id": "up-leave"},
            files={"file": ("leave_upsert_test.xlsx", excel_upsert, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res2.status_code == 200, f"Upsert upload failed: {res2.text}"
        data2 = res2.json()
        assert data2["success"] is True
        assert data2["rowsProcessed"] == 2
        assert data2["errorsCount"] == 0
        print("[PASS] TEST 2: Leave upsert upload succeeded.")

        db.expire_all()
        leaves_a_after = db.scalars(
            select(Leave)
            .where(Leave.engineer_id == eng_a.engineer_id)
        ).all()
        assert len(leaves_a_after) == 3, f"Expected 3 leave records total after upsert, found {len(leaves_a_after)}"
        sick_lv = [l for l in leaves_a_after if l.leave_type == "Sick Leave"][0]
        assert sick_lv.approval_status == "Approved"
        print("[PASS] Verified existing Leave record updated correctly without creating duplicate.")

        # -------------------------------------------------------------
        # TEST 3: Validation Error - Missing Required Header (Requested Date)
        # -------------------------------------------------------------
        excel_no_req_date = create_test_excel_bytes(
            sheet_name="Leave",
            headers=["Orbit ID", "Engineer Name", "Leave Type", "Approval Status"],
            rows=[[orbit_id_a, "Leave Engineer A", "Annual Leave", "Pending"]]
        )
        res3 = client.post(
            "/api/upload",
            data={"module_id": "up-leave"},
            files={"file": ("missing_header.xlsx", excel_no_req_date, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res3.status_code == 400
        assert "Required header 'Requested Date' (Absence Date) is missing" in res3.json()["detail"]
        print("[PASS] TEST 3: Missing required header validation caught successfully.")

        # -------------------------------------------------------------
        # TEST 4: Invalid Date Range Validation (requested_on > requested_date)
        # -------------------------------------------------------------
        excel_invalid_dates = create_test_excel_bytes(
            sheet_name="Leave",
            headers=["Orbit ID", "Engineer Name", "Leave Type", "Requested Date", "Requested On"],
            rows=[
                # Invalid: requested_on (2026-06-15) is LATER than requested_date (2026-06-01)
                [orbit_id_a, "Leave Engineer A", "Personal Leave", "2026-06-01", "2026-06-15"]
            ]
        )
        res4 = client.post(
            "/api/upload",
            data={"module_id": "up-leave"},
            files={"file": ("invalid_dates.xlsx", excel_invalid_dates, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res4.status_code == 200
        data4 = res4.json()
        assert data4["errorsCount"] == 1  # Row rejected
        print("[PASS] TEST 4: Invalid submission date range validation passed.")

        # -------------------------------------------------------------
        # TEST 5: Company Isolation (Cannot upload for Engineer in Comp B)
        # -------------------------------------------------------------
        excel_cross_company = create_test_excel_bytes(
            sheet_name="Leave",
            headers=["Orbit ID", "Engineer Name", "Leave Type", "Requested Date"],
            rows=[
                [orbit_id_b, "Leave Engineer B", "Annual Leave", "2026-07-01"]
            ]
        )
        res5 = client.post(
            "/api/upload",
            data={"module_id": "up-leave"},
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

        print("\n=== ALL LEAVE BULK UPLOAD TESTS PASSED SUCCESSFULLY! ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_leave_upload_workflow()
