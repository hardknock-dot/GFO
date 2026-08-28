import sys
import os
import uuid
import io
import openpyxl
from datetime import date, datetime
from sqlalchemy import select, text

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

def test_real_db_upsert_flow():
    db = SessionLocal()
    print("\n==================================================")
    print("STARTING END-TO-END PRODUCTION UPSERT VERIFICATION")
    print("==================================================")

    unique_suffix = uuid.uuid4().hex[:8]

    try:
        # 1. Target Tenant & Admin User
        company = Company(
            company_id=uuid.uuid4(),
            company_name=f"ORMP Real Upsert Corp {unique_suffix}",
            short_name=f"ORUC_{unique_suffix}",
            is_active=True
        )
        db.add(company)
        db.commit()

        user = User(
            user_id=uuid.uuid4(),
            company_id=company.company_id,
            email=f"admin_{unique_suffix}@realupsert.com",
            full_name="Real Upsert Admin",
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

        orbit_id_1 = f"ORB-REAL-{unique_suffix}"

        # ====================================================
        # 1. ENGINEERS MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[1/7] Testing Engineers Module Upsert...")
        headers_eng = [
            "Engineer Name", "Goes By", "Employee ID", "Orbit ID", "Level",
            "Date of Joining", "Primary Tool", "Customer Exp (Years)", "Industry Exp",
            "Status", "Email", "Phone Number"
        ]
        rows_eng_v1 = [
            ["Original Engineer", "Orig", "EMP-100", orbit_id_1, "Level 1", "2024-01-01", "Tool A", "2.0", "4.0", "Active", f"eng_{unique_suffix}@test.com", "+1234567890"]
        ]
        excel_eng_v1 = create_test_excel_bytes("Engineer", headers_eng, rows_eng_v1)
        res_e1 = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng1.xlsx", excel_eng_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_e1.status_code == 200, f"Engineers insert failed: {res_e1.text}"
        body_e1 = res_e1.json()
        assert body_e1["inserted"] == 1, f"Expected inserted=1, got {body_e1}"
        print("  [PASS] Engineers V1 Inserted: 1 record created.")

        # Query DB BEFORE
        db.expire_all()
        eng_before = db.scalars(select(Engineer).where(Engineer.orbit_id == orbit_id_1, Engineer.company_id == company.company_id)).first()
        assert eng_before is not None
        orig_eng_id = eng_before.engineer_id
        assert eng_before.engineer_name == "Original Engineer"

        # Upload CHANGED values for same Orbit ID
        rows_eng_v2 = [
            ["Updated Engineer Name", "Ally", "EMP-100", orbit_id_1, "Level 2 Senior", "2024-01-01", "Tool A Prime", "5.0 yrs", "10.0+", "Active", f"eng_{unique_suffix}@test.com", "+1999888777"]
        ]
        excel_eng_v2 = create_test_excel_bytes("Engineer", headers_eng, rows_eng_v2)
        res_e2 = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng2.xlsx", excel_eng_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_e2.status_code == 200, f"Engineers update failed: {res_e2.text}"
        body_e2 = res_e2.json()
        assert body_e2["updated"] == 1, f"Expected updated=1, got {body_e2}"

        # Query DB AFTER directly in PostgreSQL
        db.expire_all()
        eng_after = db.scalars(select(Engineer).where(Engineer.orbit_id == orbit_id_1, Engineer.company_id == company.company_id)).first()
        assert eng_after is not None
        assert eng_after.engineer_id == orig_eng_id, "Engineer ID UUID should be preserved!"
        assert eng_after.engineer_name == "Updated Engineer Name"
        assert eng_after.level == "Level 2 Senior"
        assert float(eng_after.lam_experience) == 5.0
        assert float(eng_after.industry_experience) == 10.0
        cnt_eng = db.scalar(select(text("COUNT(*)")).select_from(Engineer).where(Engineer.orbit_id == orbit_id_1, Engineer.company_id == company.company_id))
        assert cnt_eng == 1, f"Expected count=1, got {cnt_eng}"
        print("  [PASS] Engineers V2 Updated in PostgreSQL: score/name changed, UUID preserved, DB count = 1.")

        # Upload UNCHANGED values
        res_e3 = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng3.xlsx", excel_eng_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_e3.status_code == 200
        body_e3 = res_e3.json()
        assert body_e3["unchanged"] == 1, f"Expected unchanged=1, got {body_e3}"
        print("  [PASS] Engineers V3 Unchanged: DB preserved without unnecessary mutations.")

        # ====================================================
        # 2. SKILLS MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[2/7] Testing Skills Module Upsert...")
        headers_sk = ["Orbit ID", "Country", "FAB", "Wafer Size", "Tool Type", "Start Date", "End Date", "Number of Tools", "Role", "Comments"]
        rows_sk_v1 = [[orbit_id_1, "USA", "Fab 10", "300mm", "Etcher Alpha", "2024-01-01", "2024-06-01", "3", "Lead Tech", "Initial skill comment"]]
        excel_sk_v1 = create_test_excel_bytes("Skill Matrix", headers_sk, rows_sk_v1)
        res_s1 = client.post("/api/upload", data={"module_id": "up-skills"}, files={"file": ("sk1.xlsx", excel_sk_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_s1.status_code == 200, f"Skills insert failed: {res_s1.text}"
        body_s1 = res_s1.json()
        assert body_s1["inserted"] == 1

        db.expire_all()
        sk_before = db.scalars(select(Skill).where(Skill.engineer_id == orig_eng_id)).first()
        assert sk_before is not None
        orig_sk_id = sk_before.skill_id
        assert sk_before.comments == "Initial skill comment"

        # Update skill with changed role & comments (with case/whitespace variation in fab/country)
        rows_sk_v2 = [[orbit_id_1, "usa ", "FAB 10", "300mm", "Etcher Alpha", "2024-01-01", "2024-06-01", "5", "Senior Lead Tech", "UPDATED skill comment"]]
        excel_sk_v2 = create_test_excel_bytes("Skill Matrix", headers_sk, rows_sk_v2)
        res_s2 = client.post("/api/upload", data={"module_id": "up-skills"}, files={"file": ("sk2.xlsx", excel_sk_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_s2.status_code == 200, f"Skills update failed: {res_s2.text}"
        body_s2 = res_s2.json()
        assert body_s2["updated"] == 1, f"Expected updated=1, got {body_s2}"

        db.expire_all()
        sk_after = db.scalars(select(Skill).where(Skill.engineer_id == orig_eng_id)).first()
        assert sk_after is not None
        assert sk_after.skill_id == orig_sk_id
        assert sk_after.role == "Senior Lead Tech"
        assert sk_after.comments == "UPDATED skill comment"
        assert sk_after.number_of_tools == 5
        cnt_sk = db.scalar(select(text("COUNT(*)")).select_from(Skill).where(Skill.engineer_id == orig_eng_id))
        assert cnt_sk == 1
        print("  [PASS] Skills V2 Updated in PostgreSQL: role/comments changed, DB count = 1.")

        # ====================================================
        # 3. SCHEDULES MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[3/7] Testing Schedules Module Upsert...")
        headers_sc = ["Orbit ID", "Support Type", "Country", "Fab City", "Fab Site", "Start Date", "End Date", "Schedule Status", "Remarks"]
        rows_sc_v1 = [[orbit_id_1, "Onsite Support", "USA", "Phoenix", "Fab 42", "2024-03-01", "2024-05-01", "Upcoming", "Original schedule remark"]]
        excel_sc_v1 = create_test_excel_bytes("Schedule", headers_sc, rows_sc_v1)
        res_sc1 = client.post("/api/upload", data={"module_id": "up-schedule"}, files={"file": ("sc1.xlsx", excel_sc_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_sc1.status_code == 200
        body_sc1 = res_sc1.json()
        assert body_sc1["inserted"] == 1

        db.expire_all()
        sc_before = db.scalars(select(Schedule).where(Schedule.engineer_id == orig_eng_id)).first()
        assert sc_before is not None
        orig_sc_id = sc_before.schedule_id

        # Update schedule status & remarks
        rows_sc_v2 = [[orbit_id_1, "onsite support", "usa", "phoenix", "Fab 42", "2024-03-01", "2024-05-01", "Ongoing", "UPDATED schedule remark"]]
        excel_sc_v2 = create_test_excel_bytes("Schedule", headers_sc, rows_sc_v2)
        res_sc2 = client.post("/api/upload", data={"module_id": "up-schedule"}, files={"file": ("sc2.xlsx", excel_sc_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_sc2.status_code == 200
        body_sc2 = res_sc2.json()
        assert body_sc2["updated"] == 1

        db.expire_all()
        sc_after = db.scalars(select(Schedule).where(Schedule.engineer_id == orig_eng_id)).first()
        assert sc_after is not None
        assert sc_after.schedule_id == orig_sc_id
        assert sc_after.schedule_status == "Ongoing"
        assert sc_after.remarks == "UPDATED schedule remark"
        cnt_sc = db.scalar(select(text("COUNT(*)")).select_from(Schedule).where(Schedule.engineer_id == orig_eng_id))
        assert cnt_sc == 1
        print("  [PASS] Schedules V2 Updated in PostgreSQL: status/remarks changed, DB count = 1.")

        # ====================================================
        # 4. VISA MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[4/7] Testing Visa Module Upsert...")
        headers_vs = ["Orbit ID", "Country", "Visa Type", "Applied On", "Visa Start Date", "Visa End Date", "Comments"]
        rows_vs_v1 = [[orbit_id_1, "Japan", "Work Visa", "2024-01-10", "2024-02-01", "2025-02-01", "Original visa comment"]]
        excel_vs_v1 = create_test_excel_bytes("Visa", headers_vs, rows_vs_v1)
        res_v1 = client.post("/api/upload", data={"module_id": "up-visa"}, files={"file": ("v1.xlsx", excel_vs_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_v1.status_code == 200
        body_v1 = res_v1.json()
        assert body_v1["inserted"] == 1

        db.expire_all()
        vs_before = db.scalars(select(Visa).where(Visa.engineer_id == orig_eng_id)).first()
        assert vs_before is not None
        orig_vs_id = vs_before.visa_id

        # Update visa comments
        rows_vs_v2 = [[orbit_id_1, "japan", "work visa", "2024-01-10", "2024-02-01", "2025-02-01", "UPDATED visa comment"]]
        excel_vs_v2 = create_test_excel_bytes("Visa", headers_vs, rows_vs_v2)
        res_v2 = client.post("/api/upload", data={"module_id": "up-visa"}, files={"file": ("v2.xlsx", excel_vs_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_v2.status_code == 200
        body_v2 = res_v2.json()
        assert body_v2["updated"] == 1

        db.expire_all()
        vs_after = db.scalars(select(Visa).where(Visa.engineer_id == orig_eng_id)).first()
        assert vs_after is not None
        assert vs_after.visa_id == orig_vs_id
        assert vs_after.comments == "UPDATED visa comment"
        cnt_vs = db.scalar(select(text("COUNT(*)")).select_from(Visa).where(Visa.engineer_id == orig_eng_id))
        assert cnt_vs == 1
        print("  [PASS] Visa V2 Updated in PostgreSQL: comments changed, DB count = 1.")

        # ====================================================
        # 5. TRAVEL MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[5/7] Testing Travel Module Upsert...")
        headers_tr = ["Orbit ID", "Booking Date", "Travel Date", "Purpose", "Comments"]
        rows_tr_v1 = [[orbit_id_1, "2024-02-15", "2024-03-01", "Customer Support", "Original flight comment"]]
        excel_tr_v1 = create_test_excel_bytes("Travel", headers_tr, rows_tr_v1)
        res_t1 = client.post("/api/upload", data={"module_id": "up-travel"}, files={"file": ("t1.xlsx", excel_tr_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_t1.status_code == 200
        body_t1 = res_t1.json()
        assert body_t1["inserted"] == 1

        db.expire_all()
        tr_before = db.scalars(select(Travel).where(Travel.schedule_id == orig_sc_id)).first()
        assert tr_before is not None
        orig_tr_id = tr_before.travel_id

        # Update travel comments
        rows_tr_v2 = [[orbit_id_1, "2024-02-15", "2024-03-01", "customer support", "UPDATED flight comment"]]
        excel_tr_v2 = create_test_excel_bytes("Travel", headers_tr, rows_tr_v2)
        res_t2 = client.post("/api/upload", data={"module_id": "up-travel"}, files={"file": ("t2.xlsx", excel_tr_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_t2.status_code == 200
        body_t2 = res_t2.json()
        assert body_t2["updated"] == 1

        db.expire_all()
        tr_after = db.scalars(select(Travel).where(Travel.schedule_id == orig_sc_id)).first()
        assert tr_after is not None
        assert tr_after.travel_id == orig_tr_id
        assert tr_after.comments == "UPDATED flight comment"
        cnt_tr = db.scalar(select(text("COUNT(*)")).select_from(Travel).where(Travel.schedule_id == orig_sc_id))
        assert cnt_tr == 1
        print("  [PASS] Travel V2 Updated in PostgreSQL: comments changed, DB count = 1.")

        # ====================================================
        # 6. PERFORMANCE MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[6/7] Testing Performance Module Upsert...")
        headers_pf = ["Schedule ID", "Orbit ID", "Actual Start Date", "Actual End Date", "Score", "Escalation", "Escalation Reason", "Feedback"]
        rows_pf_v1 = [[str(orig_sc_id), orbit_id_1, "2024-03-01", "2024-05-01", "4.5", "No", "", "Original feedback score 4.5"]]
        excel_pf_v1 = create_test_excel_bytes("Performance", headers_pf, rows_pf_v1)
        res_p1 = client.post("/api/upload", data={"module_id": "up-performance"}, files={"file": ("p1.xlsx", excel_pf_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_p1.status_code == 200
        body_p1 = res_p1.json()
        assert body_p1["inserted"] == 1

        # Query DB BEFORE
        db.expire_all()
        pf_before = db.scalars(select(Performance).where(Performance.schedule_id == orig_sc_id)).first()
        assert pf_before is not None
        orig_pf_id = pf_before.performance_id
        assert float(pf_before.score) == 4.5
        assert pf_before.feedback == "Original feedback score 4.5"

        # Update performance score to 4.9 & feedback to "Excellent"
        rows_pf_v2 = [[str(orig_sc_id), orbit_id_1, "2024-03-01", "2024-05-01", "4.9", "No", "", "Excellent"]]
        excel_pf_v2 = create_test_excel_bytes("Performance", headers_pf, rows_pf_v2)
        res_p2 = client.post("/api/upload", data={"module_id": "up-performance"}, files={"file": ("p2.xlsx", excel_pf_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_p2.status_code == 200
        body_p2 = res_p2.json()
        assert body_p2["updated"] == 1, f"Expected updated=1, got {body_p2}"

        # Query DB AFTER directly in PostgreSQL
        db.expire_all()
        pf_after = db.scalars(select(Performance).where(Performance.schedule_id == orig_sc_id, Performance.actual_start_date == date(2024, 3, 1))).first()
        assert pf_after is not None
        assert pf_after.performance_id == orig_pf_id
        assert float(pf_after.score) == 4.9, f"Expected score=4.9, got {pf_after.score}"
        assert pf_after.feedback == "Excellent", f"Expected feedback='Excellent', got {pf_after.feedback}"
        cnt_pf = db.scalar(select(text("COUNT(*)")).select_from(Performance).where(Performance.schedule_id == orig_sc_id, Performance.actual_start_date == date(2024, 3, 1)))
        assert cnt_pf == 1, f"Expected count=1, got {cnt_pf}"
        print("  [PASS] Performance V2 Updated in PostgreSQL: score = 4.9, feedback = 'Excellent', DB count = 1.")

        # ====================================================
        # 7. LEAVE MODULE UPSERT VERIFICATION
        # ====================================================
        print("\n[7/7] Testing Leave Module Upsert...")
        headers_lv = ["Orbit ID", "Requested Date", "Requested On", "Leave Type", "Approval Status"]
        rows_lv_v1 = [[orbit_id_1, "2024-07-15", "2024-06-01", "Annual Leave", "Pending"]]
        excel_lv_v1 = create_test_excel_bytes("Leave", headers_lv, rows_lv_v1)
        res_l1 = client.post("/api/upload", data={"module_id": "up-leave"}, files={"file": ("l1.xlsx", excel_lv_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_l1.status_code == 200
        body_l1 = res_l1.json()
        assert body_l1["inserted"] == 1

        db.expire_all()
        lv_before = db.scalars(select(Leave).where(Leave.engineer_id == orig_eng_id)).first()
        assert lv_before is not None
        orig_lv_id = lv_before.leave_id

        # Update approval status to Approved
        rows_lv_v2 = [[orbit_id_1, "2024-07-15", "2024-06-01", "annual leave", "Approved"]]
        excel_lv_v2 = create_test_excel_bytes("Leave", headers_lv, rows_lv_v2)
        res_l2 = client.post("/api/upload", data={"module_id": "up-leave"}, files={"file": ("l2.xlsx", excel_lv_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
        assert res_l2.status_code == 200
        body_l2 = res_l2.json()
        assert body_l2["updated"] == 1

        db.expire_all()
        lv_after = db.scalars(select(Leave).where(Leave.engineer_id == orig_eng_id)).first()
        assert lv_after is not None
        assert lv_after.leave_id == orig_lv_id
        assert lv_after.approval_status == "Approved"
        cnt_lv = db.scalar(select(text("COUNT(*)")).select_from(Leave).where(Leave.engineer_id == orig_eng_id))
        assert cnt_lv == 1
        print("  [PASS] Leave V2 Updated in PostgreSQL: approval status = Approved, DB count = 1.")

        print("\n==================================================")
        print("REAL POSTGRESQL END-TO-END VERIFICATION SUCCESSFUL!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_real_db_upsert_flow()
