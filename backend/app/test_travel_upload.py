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
from app.models.schedule import Schedule
from app.models.user import User
from app.models.travel import Travel
from app.models.bulk_upload import BulkUpload
from app.models.audit_log import AuditLog
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token

def create_test_excel_bytes(sheet_name="Travel", headers=None, rows=None):
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

def test_travel_upload_workflow():
    db = SessionLocal()
    print("\n=== STARTING TRAVEL BULK UPLOAD TEST SUITE ===")
    
    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Create Target Company A & Company B
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"Travel Test Corp A {unique_suffix}",
            short_name=f"TRA_{unique_suffix}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"Travel Test Corp B {unique_suffix}",
            short_name=f"TRB_{unique_suffix}",
            is_active=True
        )
        db.add_all([comp_a, comp_b])
        db.commit()

        # 2. Create User in Company A
        user_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"admin_a_{unique_suffix}@travel.com",
            full_name="Travel Admin A",
            role="Manager",
            password_hash="hashedpassword123",
            is_active=True
        )
        db.add(user_a)
        db.commit()

        # 3. Create Engineers in Company A and Company B
        orbit_id_a = f"ORB-TRV-A-{unique_suffix}"
        orbit_id_b = f"ORB-TRV-B-{unique_suffix}"

        eng_a = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_name="Travel Engineer A",
            orbit_id=orbit_id_a,
            level="L3 Senior",
            status="Active"
        )
        eng_b = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            engineer_name="Travel Engineer B",
            orbit_id=orbit_id_b,
            level="L2 Specialist",
            status="Active"
        )
        db.add_all([eng_a, eng_b])
        db.commit()

        # 4. Create Schedule for Engineer A in Company A
        sch_a = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a.engineer_id,
            support_type="Customer Support",
            country="United States",
            fab_city="Austin",
            fab_site="Fab 1",
            start_date=date.today(),
            schedule_status="Active"
        )
        db.add(sch_a)
        db.commit()

        # Auth Token for User A
        token_a = create_access_token({"sub": str(user_a.user_id)})
        headers_a = {
            "Authorization": f"Bearer {token_a}",
            "X-Company-ID": str(comp_a.company_id)
        }
        client = TestClient(app)

        # -------------------------------------------------------------
        # TEST 1: Valid Travel Excel Upload (Creation)
        # -------------------------------------------------------------
        excel_valid = create_test_excel_bytes(
            sheet_name="Travel",
            headers=["Orbit ID", "Engineer Name", "Booking Date", "Travel Date", "Purpose", "Comments"],
            rows=[
                [orbit_id_a, "Travel Engineer A", "2026-01-10", "2026-01-15", "Tool Startup", "Flight FL-102 confirmed"],
                [orbit_id_a, "Travel Engineer A", "2026-02-01", "2026-02-05", "Emergency Support", "Hotel H-401 booked"]
            ]
        )

        res1 = client.post(
            "/api/upload",
            data={"module_id": "up-travel"},
            files={"file": ("travel_upload_test.xlsx", excel_valid, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res1.status_code == 200, f"Upload failed: {res1.text}"
        data1 = res1.json()
        assert data1["success"] is True
        assert data1["rowsProcessed"] == 2
        assert data1["errorsCount"] == 0
        print("[PASS] TEST 1: Valid Travel upload succeeded.")

        # Verify DB records created
        db.expire_all()
        travels_a = db.scalars(
            select(Travel)
            .join(Schedule, Travel.schedule_id == Schedule.schedule_id)
            .where(Schedule.engineer_id == eng_a.engineer_id)
        ).all()
        assert len(travels_a) == 2, f"Expected 2 travel records, found {len(travels_a)}"
        print("[PASS] Verified 2 Travel arrangement records created in PostgreSQL database.")

        # -------------------------------------------------------------
        # TEST 2: Existing Travel Update (Upsert Behavior)
        # -------------------------------------------------------------
        excel_upsert = create_test_excel_bytes(
            sheet_name="Travel",
            headers=["Orbit ID", "Engineer Name", "Booking Date", "Travel Date", "Purpose", "Comments"],
            rows=[
                # Updates existing "Tool Startup" travel record comments & booking date
                [orbit_id_a, "Travel Engineer A", "2026-01-11", "2026-01-15", "Tool Startup", "Updated: Flight FL-102 & Hotel H-100"],
                # New travel record
                [orbit_id_a, "Travel Engineer A", "2026-03-01", "2026-03-10", "Annual Review Meeting", "Flight FL-303"]
            ]
        )

        res2 = client.post(
            "/api/upload",
            data={"module_id": "up-travel"},
            files={"file": ("travel_upsert_test.xlsx", excel_upsert, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res2.status_code == 200, f"Upsert upload failed: {res2.text}"
        data2 = res2.json()
        assert data2["success"] is True
        assert data2["rowsProcessed"] == 2
        assert data2["errorsCount"] == 0
        print("[PASS] TEST 2: Travel upsert upload succeeded.")

        db.expire_all()
        travels_a_after = db.scalars(
            select(Travel)
            .join(Schedule, Travel.schedule_id == Schedule.schedule_id)
            .where(Schedule.engineer_id == eng_a.engineer_id)
        ).all()
        assert len(travels_a_after) == 3, f"Expected 3 travel records total after upsert, found {len(travels_a_after)}"
        startup_tr = [t for t in travels_a_after if t.purpose == "Tool Startup"][0]
        assert startup_tr.comments == "Updated: Flight FL-102 & Hotel H-100"
        print("[PASS] Verified existing Travel record updated correctly without creating duplicate.")

        # -------------------------------------------------------------
        # TEST 3: Validation Error - Missing Required Header (Orbit ID)
        # -------------------------------------------------------------
        excel_no_orbit = create_test_excel_bytes(
            sheet_name="Travel",
            headers=["Engineer Name", "Booking Date", "Travel Date", "Purpose"],
            rows=[["Travel Engineer A", "2026-01-10", "2026-01-15", "Tool Startup"]]
        )
        res3 = client.post(
            "/api/upload",
            data={"module_id": "up-travel"},
            files={"file": ("missing_header.xlsx", excel_no_orbit, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_a
        )
        assert res3.status_code == 400
        assert "Required header 'Orbit ID' is missing" in res3.json()["detail"]
        print("[PASS] TEST 3: Missing required header validation caught successfully.")

        # -------------------------------------------------------------
        # TEST 4: Duplicate Rows & Invalid Date Validation (travel_date < booking_date)
        # -------------------------------------------------------------
        excel_dups = create_test_excel_bytes(
            sheet_name="Travel",
            headers=["Orbit ID", "Engineer Name", "Booking Date", "Travel Date", "Purpose"],
            rows=[
                [orbit_id_a, "Travel Engineer A", "2026-04-01", "2026-04-10", "Factory Audit"],
                [orbit_id_a, "Travel Engineer A", "2026-04-01", "2026-04-10", "Factory Audit"], # Duplicate
                [orbit_id_a, "Travel Engineer A", "2026-06-10", "2026-06-01", "Invalid Travel"]  # Invalid date (travel < booking)
            ]
        )
        res4 = client.post(
            "/api/upload",
            data={"module_id": "up-travel"},
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
            sheet_name="Travel",
            headers=["Orbit ID", "Engineer Name", "Booking Date", "Travel Date", "Purpose"],
            rows=[
                [orbit_id_b, "Travel Engineer B", "2026-01-10", "2026-01-15", "Cross Company Trip"]
            ]
        )
        res5 = client.post(
            "/api/upload",
            data={"module_id": "up-travel"},
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

        print("\n=== ALL TRAVEL BULK UPLOAD TESTS PASSED SUCCESSFULLY! ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_travel_upload_workflow()
