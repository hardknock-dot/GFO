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
from app.models.schedule import Schedule
from app.models.skill import Skill
from app.models.visa import Visa
from app.models.travel import Travel
from app.models.performance import Performance
from app.models.leave import Leave
from fastapi.testclient import TestClient
from app.main import app
from app.services.security import create_access_token

def create_test_excel_bytes(sheet_name, headers, rows):
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

def run_all_upload_tests():
    db = SessionLocal()
    print("\n==================================================")
    print("STARTING ALL 7 BULK UPLOAD MODULES TEST SUITE")
    print("==================================================")
    
    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Setup Company & User
        company = Company(
            company_id=uuid.uuid4(),
            company_name=f"ORMP Master Test Corp {unique_suffix}",
            short_name=f"OMTC_{unique_suffix}",
            is_active=True
        )
        db.add(company)
        db.commit()

        user = User(
            user_id=uuid.uuid4(),
            company_id=company.company_id,
            email=f"admin_{unique_suffix}@ormp.com",
            full_name="ORMP Admin User",
            role="Manager",
            password_hash="hashedpassword123",
            is_active=True
        )
        db.add(user)
        db.commit()

        token = create_access_token({"sub": str(user.user_id)})
        headers_auth = {
            "Authorization": f"Bearer {token}",
            "X-Company-ID": str(company.company_id)
        }

        client = TestClient(app)

        # 2. Setup Baseline Engineer
        orbit_id_1 = f"ORB-ENG-101-{unique_suffix}"
        eng1 = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=company.company_id,
            orbit_id=orbit_id_1,
            engineer_name="John Doe",
            level="Level 2",
            status="Active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(eng1)
        db.commit()
        db.refresh(eng1)

        # ----------------------------------------------------
        # TEST 1: SKILLS UPLOAD (INSERT & UPDATE/UNCHANGED)
        # ----------------------------------------------------
        print("\n--- Testing Skills Bulk Upload (up-skills) ---")
        headers_skills = [
            "Orbit ID", "Country", "FAB", "Wafer Size", "Tool Type",
            "Start Date", "End Date", "Role", "Primary Role", "Comments"
        ]
        rows_skills_v1 = [
            [orbit_id_1, "USA", "Fab10", "300mm", "Etcher X", "2024-01-01", "2024-06-01", "Lead", "Yes", "Initial Skill"],
            [orbit_id_1, "Taiwan", "Fab12", "300mm", "Deposition Y", "2024-02-01", "2024-08-01", "Support", "No", "Secondary Skill"]
        ]
        excel_skills_v1 = create_test_excel_bytes("Skill Matrix", headers_skills, rows_skills_v1)
        res_sk1 = client.post(
            "/api/upload",
            data={"module_id": "up-skills", "company_id": str(company.company_id)},
            files={"file": ("skills_v1.xlsx", excel_skills_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_sk1.status_code == 200, f"Skills upload v1 failed: {res_sk1.text}"
        body_sk1 = res_sk1.json()
        assert "Ingested 2 new skill records" in body_sk1["message"]
        print("[PASS] Skills V1: 2 records inserted.")

        # Skills V2: Update 1 skill (change comments/role) and keep 1 unchanged
        rows_skills_v2 = [
            [orbit_id_1, "USA", "Fab10", "300mm", "Etcher X", "2024-01-01", "2024-06-01", "Lead Tech", "Yes", "Updated Skill Comment"],
            [orbit_id_1, "Taiwan", "Fab12", "300mm", "Deposition Y", "2024-02-01", "2024-08-01", "Support", "No", "Secondary Skill"]
        ]
        excel_skills_v2 = create_test_excel_bytes("Skill Matrix", headers_skills, rows_skills_v2)
        res_sk2 = client.post(
            "/api/upload",
            data={"module_id": "up-skills", "company_id": str(company.company_id)},
            files={"file": ("skills_v2.xlsx", excel_skills_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_sk2.status_code == 200, f"Skills upload v2 failed: {res_sk2.text}"
        body_sk2 = res_sk2.json()
        assert "Updated 1 existing skill records" in body_sk2["message"]
        assert "1 records were unchanged" in body_sk2["message"]
        print("[PASS] Skills V2: 1 updated, 1 unchanged.")

        # ----------------------------------------------------
        # TEST 2: SCHEDULES UPLOAD (INSERT & UPDATE/UNCHANGED)
        # ----------------------------------------------------
        print("\n--- Testing Schedule Bulk Upload (up-schedule) ---")
        headers_sched = [
            "Orbit ID", "Support Type", "Country", "Fab City", "Fab Site",
            "Start Date", "End Date", "Schedule Status", "Remarks"
        ]
        rows_sched_v1 = [
            [orbit_id_1, "Onsite Support", "USA", "Phoenix", "Fab 42", "2024-03-01", "2024-05-01", "Upcoming", "Initial Schedule"]
        ]
        excel_sched_v1 = create_test_excel_bytes("Schedule", headers_sched, rows_sched_v1)
        res_sc1 = client.post(
            "/api/upload",
            data={"module_id": "up-schedule", "company_id": str(company.company_id)},
            files={"file": ("sched_v1.xlsx", excel_sched_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_sc1.status_code == 200, f"Schedule upload v1 failed: {res_sc1.text}"
        body_sc1 = res_sc1.json()
        assert "Ingested 1 new schedule records" in body_sc1["message"]
        print("[PASS] Schedule V1: 1 record inserted.")

        # Schedule V2: Update remarks & status
        rows_sched_v2 = [
            [orbit_id_1, "Onsite Support", "USA", "Phoenix", "Fab 42", "2024-03-01", "2024-05-01", "Ongoing", "Updated Schedule Remarks"]
        ]
        excel_sched_v2 = create_test_excel_bytes("Schedule", headers_sched, rows_sched_v2)
        res_sc2 = client.post(
            "/api/upload",
            data={"module_id": "up-schedule", "company_id": str(company.company_id)},
            files={"file": ("sched_v2.xlsx", excel_sched_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_sc2.status_code == 200, f"Schedule upload v2 failed: {res_sc2.text}"
        body_sc2 = res_sc2.json()
        assert "Updated 1 existing schedule records" in body_sc2["message"]
        print("[PASS] Schedule V2: 1 record updated.")

        # Fetch schedule ID for Travel/Performance test
        db.expire_all()
        target_sched = db.scalars(select(Schedule).where(Schedule.engineer_id == eng1.engineer_id)).first()
        assert target_sched is not None

        # ----------------------------------------------------
        # TEST 3: VISA UPLOAD (INSERT & UPDATE/UNCHANGED)
        # ----------------------------------------------------
        print("\n--- Testing Visa Bulk Upload (up-visa) ---")
        headers_visa = [
            "Orbit ID", "Country", "Visa Type", "Applied On", "Visa Start Date", "Visa End Date", "Comments"
        ]
        rows_visa_v1 = [
            [orbit_id_1, "Japan", "Work Visa", "2024-01-10", "2024-02-01", "2025-02-01", "Applied v1"]
        ]
        excel_visa_v1 = create_test_excel_bytes("Visa", headers_visa, rows_visa_v1)
        res_vs1 = client.post(
            "/api/upload",
            data={"module_id": "up-visa", "company_id": str(company.company_id)},
            files={"file": ("visa_v1.xlsx", excel_visa_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_vs1.status_code == 200, f"Visa upload v1 failed: {res_vs1.text}"
        body_vs1 = res_vs1.json()
        assert "Ingested 1 new visa records" in body_vs1["message"]
        print("[PASS] Visa V1: 1 record inserted.")

        rows_visa_v2 = [
            [orbit_id_1, "Japan", "Work Visa", "2024-01-10", "2024-02-01", "2025-02-01", "Updated comments v2"]
        ]
        excel_visa_v2 = create_test_excel_bytes("Visa", headers_visa, rows_visa_v2)
        res_vs2 = client.post(
            "/api/upload",
            data={"module_id": "up-visa", "company_id": str(company.company_id)},
            files={"file": ("visa_v2.xlsx", excel_visa_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_vs2.status_code == 200, f"Visa upload v2 failed: {res_vs2.text}"
        body_vs2 = res_vs2.json()
        assert "Updated 1 existing visa records" in body_vs2["message"]
        print("[PASS] Visa V2: 1 record updated.")

        # ----------------------------------------------------
        # TEST 4: TRAVEL UPLOAD (INSERT & UPDATE/UNCHANGED)
        # ----------------------------------------------------
        print("\n--- Testing Travel Bulk Upload (up-travel) ---")
        headers_travel = [
            "Orbit ID", "Booking Date", "Travel Date", "Purpose", "Comments"
        ]
        rows_travel_v1 = [
            [orbit_id_1, "2024-02-15", "2024-03-01", "Customer Onsite Support", "Flight booked v1"]
        ]
        excel_travel_v1 = create_test_excel_bytes("Travel", headers_travel, rows_travel_v1)
        res_tr1 = client.post(
            "/api/upload",
            data={"module_id": "up-travel", "company_id": str(company.company_id)},
            files={"file": ("travel_v1.xlsx", excel_travel_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_tr1.status_code == 200, f"Travel upload v1 failed: {res_tr1.text}"
        body_tr1 = res_tr1.json()
        assert "Ingested 1 new travel records" in body_tr1["message"]
        print("[PASS] Travel V1: 1 record inserted.")

        rows_travel_v2 = [
            [orbit_id_1, "2024-02-15", "2024-03-01", "Customer Onsite Support", "Flight rescheduled v2"]
        ]
        excel_travel_v2 = create_test_excel_bytes("Travel", headers_travel, rows_travel_v2)
        res_tr2 = client.post(
            "/api/upload",
            data={"module_id": "up-travel", "company_id": str(company.company_id)},
            files={"file": ("travel_v2.xlsx", excel_travel_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_tr2.status_code == 200, f"Travel upload v2 failed: {res_tr2.text}"
        body_tr2 = res_tr2.json()
        assert "Updated 1 existing travel records" in body_tr2["message"]
        print("[PASS] Travel V2: 1 record updated.")

        # ----------------------------------------------------
        # TEST 5: PERFORMANCE UPLOAD (INSERT & UPDATE/UNCHANGED)
        # ----------------------------------------------------
        print("\n--- Testing Performance Bulk Upload (up-performance) ---")
        headers_perf = [
            "Schedule ID", "Orbit ID", "Actual Start Date", "Actual End Date",
            "Score", "Escalation", "Escalation Reason", "Feedback"
        ]
        rows_perf_v1 = [
            [str(target_sched.schedule_id), orbit_id_1, "2024-03-01", "2024-05-01", "4.5", "No", "", "Great performance v1"]
        ]
        excel_perf_v1 = create_test_excel_bytes("Performance", headers_perf, rows_perf_v1)
        res_pf1 = client.post(
            "/api/upload",
            data={"module_id": "up-performance", "company_id": str(company.company_id)},
            files={"file": ("perf_v1.xlsx", excel_perf_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_pf1.status_code == 200, f"Performance upload v1 failed: {res_pf1.text}"
        body_pf1 = res_pf1.json()
        assert "Ingested 1 new performance records" in body_pf1["message"]
        print("[PASS] Performance V1: 1 record inserted.")

        rows_perf_v2 = [
            [str(target_sched.schedule_id), orbit_id_1, "2024-03-01", "2024-05-01", "5.0", "No", "", "Outstanding performance v2"]
        ]
        excel_perf_v2 = create_test_excel_bytes("Performance", headers_perf, rows_perf_v2)
        res_pf2 = client.post(
            "/api/upload",
            data={"module_id": "up-performance", "company_id": str(company.company_id)},
            files={"file": ("perf_v2.xlsx", excel_perf_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_pf2.status_code == 200, f"Performance upload v2 failed: {res_pf2.text}"
        body_pf2 = res_pf2.json()
        assert "Updated 1 existing performance records" in body_pf2["message"]
        print("[PASS] Performance V2: 1 record updated.")

        # ----------------------------------------------------
        # TEST 6: LEAVE UPLOAD (INSERT & UPDATE/UNCHANGED)
        # ----------------------------------------------------
        print("\n--- Testing Leave Bulk Upload (up-leave) ---")
        headers_leave = [
            "Orbit ID", "Requested Date", "Requested On", "Leave Type", "Approval Status"
        ]
        rows_leave_v1 = [
            [orbit_id_1, "2024-07-15", "2024-06-01", "Annual Leave", "Pending"]
        ]
        excel_leave_v1 = create_test_excel_bytes("Leave", headers_leave, rows_leave_v1)
        res_lv1 = client.post(
            "/api/upload",
            data={"module_id": "up-leave", "company_id": str(company.company_id)},
            files={"file": ("leave_v1.xlsx", excel_leave_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_lv1.status_code == 200, f"Leave upload v1 failed: {res_lv1.text}"
        body_lv1 = res_lv1.json()
        assert "Ingested 1 new leave records" in body_lv1["message"]
        print("[PASS] Leave V1: 1 record inserted.")

        rows_leave_v2 = [
            [orbit_id_1, "2024-07-15", "2024-06-01", "Annual Leave", "Approved"]
        ]
        excel_leave_v2 = create_test_excel_bytes("Leave", headers_leave, rows_leave_v2)
        res_lv2 = client.post(
            "/api/upload",
            data={"module_id": "up-leave", "company_id": str(company.company_id)},
            files={"file": ("leave_v2.xlsx", excel_leave_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers=headers_auth
        )
        assert res_lv2.status_code == 200, f"Leave upload v2 failed: {res_lv2.text}"
        body_lv2 = res_lv2.json()
        assert "Updated 1 existing leave records" in body_lv2["message"]
        print("[PASS] Leave V2: 1 record updated.")

        print("\n==================================================")
        print("ALL 7 BULK UPLOAD MODULES TESTED & PASSED SUCCESSFULLY!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_all_upload_tests()
