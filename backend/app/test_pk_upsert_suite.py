import sys
import os
import uuid
import io
import openpyxl
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, func

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

def run_pk_upsert_test_suite():
    db = SessionLocal()
    print("\n==================================================================")
    print("STARTING ROBUST PRIMARY-KEY-BASED UPSERT TEST SUITE FOR ALL 7 MODULES")
    print("==================================================================")

    suffix_a = uuid.uuid4().hex[:8]
    suffix_b = uuid.uuid4().hex[:8]

    try:
        # 1. Setup Company A & Company B for Tenant Isolation Testing
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"PK Test Corp A {suffix_a}",
            short_name=f"PK_A_{suffix_a}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"PK Test Corp B {suffix_b}",
            short_name=f"PK_B_{suffix_b}",
            is_active=True
        )
        db.add_all([comp_a, comp_b])
        db.commit()

        # Users
        user_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            email=f"admin_a_{suffix_a}@test.com",
            full_name="Admin A",
            role="Manager",
            password_hash="pass",
            is_active=True
        )
        user_b = User(
            user_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            email=f"admin_b_{suffix_b}@test.com",
            full_name="Admin B",
            role="Manager",
            password_hash="pass",
            is_active=True
        )
        db.add_all([user_a, user_b])
        db.commit()

        token_a = create_access_token({"sub": str(user_a.user_id)})
        token_b = create_access_token({"sub": str(user_b.user_id)})

        headers_a = {"Authorization": f"Bearer {token_a}", "X-Company-ID": str(comp_a.company_id)}
        headers_b = {"Authorization": f"Bearer {token_b}", "X-Company-ID": str(comp_b.company_id)}

        client = TestClient(app)

        # Baseline Engineers for Company A & B
        orbit_a = f"ORB-ENG-A-{suffix_a}"
        orbit_b = f"ORB-ENG-B-{suffix_b}"

        eng_a = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            orbit_id=orbit_a,
            engineer_name="Engineer Alpha",
            level="Level 1",
            status="Active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        eng_b = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            orbit_id=orbit_b,
            engineer_name="Engineer Beta",
            level="Level 1",
            status="Active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add_all([eng_a, eng_b])
        db.commit()

        # =========================================================================
        # MODULE 1: UP-ENGINEERS (engineer_id)
        # =========================================================================
        print("\n--- [MODULE 1] Testing up-engineers PK-Based Updates ---")
        headers_eng = ["Engineer ID", "Engineer Name", "Goes By", "Customer ID", "Orbit ID", "Level", "Date of Joining", "Primary Tool", "Customer Experience", "Industry Experience", "Status", "Email", "Phone Number"]
        
        orbit_new = f"ORB-NEW-{suffix_a}"
        # TEST A: Insert new engineer without PK
        rows_eng_a = [["", "New Eng One", "Newbie", "CUST-100", orbit_new, "Level 1", "2024-01-01", "Tool A", "2.0", "3.0", "Active", f"new1_{suffix_a}@test.com", "+1234567890"]]
        res = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_a.xlsx", create_test_excel_bytes("Engineer", headers_eng, rows_eng_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1
        
        db.expire_all()
        created_eng = db.scalars(select(Engineer).where(Engineer.orbit_id == orbit_new, Engineer.company_id == comp_a.company_id)).first()
        assert created_eng is not None
        assert created_eng.lam_id == "CUST-100"
        eng_id_str = str(created_eng.engineer_id)
        print(f"[PASS] TEST A: Eng inserted with Customer ID (CUST-100) & generated engineer_id: {eng_id_str}")

        # TEST B: Single non-key field change with PK
        rows_eng_b = [[eng_id_str, "New Eng One", "Newbie", "CUST-100", orbit_new, "Level 1", "2024-01-01", "Tool A", "2.0", "3.0", "Active", f"new1_{suffix_a}@test.com", "+9998887777"]]
        res = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_b.xlsx", create_test_excel_bytes("Engineer", headers_eng, rows_eng_b), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1
        
        db.expire_all()
        cnt = db.scalar(select(func.count()).select_from(Engineer).where(Engineer.company_id == comp_a.company_id))
        assert cnt == 2  # eng_a + created_eng
        db_eng_b = db.get(Engineer, created_eng.engineer_id)
        assert db_eng_b.phone_number == "+9998887777"
        print(f"[PASS] TEST B: Single field updated. PK static: {db_eng_b.engineer_id}, Count: {cnt}")

        # TEST C: Multiple fields changed with PK (including Customer ID, name & experience)
        rows_eng_c = [[eng_id_str, "New Eng One Updated", "Newbie Prime", "CUST-999-UPDATED", orbit_new, "Level 2 Senior", "2024-01-15", "Tool B Prime", "5.5 yrs", "8.0+", "Active", f"new1_updated_{suffix_a}@test.com", "+9998887777"]]
        res = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_c.xlsx", create_test_excel_bytes("Engineer", headers_eng, rows_eng_c), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        db_eng_c = db.get(Engineer, created_eng.engineer_id)
        assert db_eng_c.engineer_name == "New Eng One Updated"
        assert db_eng_c.lam_id == "CUST-999-UPDATED"
        assert db_eng_c.level == "Level 2 Senior"
        assert float(db_eng_c.lam_experience) == 5.5
        assert float(db_eng_c.industry_experience) == 8.0
        print("[PASS] TEST C: Multiple fields updated cleanly.")

        # TEST D: Unchanged row
        res = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_d.xlsx", create_test_excel_bytes("Engineer", headers_eng, rows_eng_c), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["unchanged"] == 1
        print("[PASS] TEST D: Unchanged row recognized.")

        # TEST E: Non-existent UUID with PK -> Rejected
        fake_uuid = str(uuid.uuid4())
        rows_eng_e = [[fake_uuid, "Fake Eng", "Fake", "EMP-999", "ORB-FAKE", "Level 1", "2024-01-01", "Tool", "1", "1", "Active", "fake@test.com", "+1234567890"]]
        res = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_e.xlsx", create_test_excel_bytes("Engineer", headers_eng, rows_eng_e), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["errorsCount"] == 1
        assert res.json()["inserted"] == 0
        assert res.json()["updated"] == 0
        print("[PASS] TEST E: Non-existent UUID update rejected.")

        # TEST F: Cross-tenant update attempt -> Rejected
        rows_eng_f = [[eng_id_str, "Hacked Name", "Hack", "EMP-100", orbit_new, "Level 1", "2024-01-01", "Tool A", "2.0", "3.0", "Active", "hacked@test.com", "+1234567890"]]
        res = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_f.xlsx", create_test_excel_bytes("Engineer", headers_eng, rows_eng_f), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_b)
        assert res.status_code == 200, res.text
        assert res.json()["errorsCount"] == 1
        assert res.json()["inserted"] == 0
        assert res.json()["updated"] == 0
        print("[PASS] TEST F: Cross-tenant update blocked.")


        # =========================================================================
        # MODULE 2: UP-SKILLS (skill_id)
        # =========================================================================
        print("\n--- [MODULE 2] Testing up-skills PK-Based Updates ---")
        headers_sk = ["Skill ID", "Orbit ID", "Country", "FAB", "Wafer Size", "Tool Type", "Start Date", "End Date", "Role", "Comments"]
        
        # TEST A: Insert
        rows_sk_a = [["", orbit_a, "USA", "Fab10", "300mm", "Etcher X", "2024-01-01", "2024-06-01", "Lead", "Initial Skill"]]
        res = client.post("/api/upload", data={"module_id": "up-skills"}, files={"file": ("sk_a.xlsx", create_test_excel_bytes("Skill Matrix", headers_sk, rows_sk_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1

        db.expire_all()
        created_sk = db.scalars(select(Skill).where(Skill.engineer_id == eng_a.engineer_id)).first()
        assert created_sk is not None
        sk_id_str = str(created_sk.skill_id)
        print(f"[PASS] TEST A: Skill inserted with skill_id: {sk_id_str}")

        # TEST B & C: Change composite key fields (Start Date, End Date, Fab, Tool Type) using PK -> UPDATE SAME ROW!
        rows_sk_bc = [[sk_id_str, orbit_a, "Taiwan", "Fab12-New", "300mm", "Etcher X Prime", "2024-02-15", "2024-11-30", "Lead Senior", "Updated Skill via PK"]]
        res = client.post("/api/upload", data={"module_id": "up-skills"}, files={"file": ("sk_bc.xlsx", create_test_excel_bytes("Skill Matrix", headers_sk, rows_sk_bc), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        sk_cnt = db.scalar(select(func.count()).select_from(Skill).where(Skill.engineer_id == eng_a.engineer_id))
        assert sk_cnt == 1  # EXACTLY 1 row, no duplicates!
        db_sk = db.get(Skill, created_sk.skill_id)
        assert db_sk.fab == "Fab12-New"
        assert db_sk.tool_type == "Etcher X Prime"
        assert str(db_sk.start_date) == "2024-02-15"
        assert str(db_sk.end_date) == "2024-11-30"
        print(f"[PASS] TEST B & C: Skill modified in-place across key fields. Skill count remains: {sk_cnt}")


        # =========================================================================
        # MODULE 3: UP-SCHEDULE (schedule_id)
        # =========================================================================
        print("\n--- [MODULE 3] Testing up-schedule PK-Based Updates ---")
        headers_sc = ["Schedule ID", "Orbit ID", "Support Type", "Country", "Fab City", "Fab Site", "Start Date", "End Date", "Schedule Status", "Remarks"]

        # TEST A: Insert
        rows_sc_a = [["", orbit_a, "Onsite Support", "USA", "Phoenix", "Fab 42", "2024-03-01", "2024-05-01", "Upcoming", "Initial Sched"]]
        res = client.post("/api/upload", data={"module_id": "up-schedule"}, files={"file": ("sc_a.xlsx", create_test_excel_bytes("Schedule", headers_sc, rows_sc_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1

        db.expire_all()
        created_sc = db.scalars(select(Schedule).where(Schedule.engineer_id == eng_a.engineer_id)).first()
        assert created_sc is not None
        sc_id_str = str(created_sc.schedule_id)
        print(f"[PASS] TEST A: Schedule inserted with schedule_id: {sc_id_str}")

        # TEST B & C: Update schedule dates, country, fab_site, and support_type via PK
        rows_sc_bc = [[sc_id_str, orbit_a, "Remote Support", "Germany", "Dresden", "Fab 1", "2024-04-01", "2024-09-01", "Ongoing", "Updated Schedule via PK"]]
        res = client.post("/api/upload", data={"module_id": "up-schedule"}, files={"file": ("sc_bc.xlsx", create_test_excel_bytes("Schedule", headers_sc, rows_sc_bc), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        sc_cnt = db.scalar(select(func.count()).select_from(Schedule).where(Schedule.engineer_id == eng_a.engineer_id))
        assert sc_cnt == 1
        db_sc = db.get(Schedule, created_sc.schedule_id)
        assert db_sc.country == "Germany"
        assert db_sc.support_type == "Remote Support"
        assert str(db_sc.start_date) == "2024-04-01"
        assert db_sc.schedule_status == "Ongoing"
        print(f"[PASS] TEST B & C: Schedule updated in-place. Schedule count remains: {sc_cnt}")


        # =========================================================================
        # MODULE 4: UP-VISA (visa_id)
        # =========================================================================
        print("\n--- [MODULE 4] Testing up-visa PK-Based Updates ---")
        headers_vs = ["Visa ID", "Orbit ID", "Country", "Visa Type", "Applied On", "Visa Start Date", "Visa End Date", "Comments"]

        # TEST A: Insert
        rows_vs_a = [["", orbit_a, "Japan", "Work Visa", "2024-01-10", "2024-02-01", "2025-02-01", "Initial Visa"]]
        res = client.post("/api/upload", data={"module_id": "up-visa"}, files={"file": ("vs_a.xlsx", create_test_excel_bytes("Visa", headers_vs, rows_vs_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1

        db.expire_all()
        created_vs = db.scalars(select(Visa).where(Visa.engineer_id == eng_a.engineer_id)).first()
        assert created_vs is not None
        vs_id_str = str(created_vs.visa_id)
        print(f"[PASS] TEST A: Visa inserted with visa_id: {vs_id_str}")

        # TEST B & C: Update visa_type, dates, comments via PK
        rows_vs_bc = [[vs_id_str, orbit_a, "South Korea", "Specialist Visa", "2024-01-15", "2024-03-01", "2026-03-01", "Updated Visa via PK"]]
        res = client.post("/api/upload", data={"module_id": "up-visa"}, files={"file": ("vs_bc.xlsx", create_test_excel_bytes("Visa", headers_vs, rows_vs_bc), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        vs_cnt = db.scalar(select(func.count()).select_from(Visa).where(Visa.engineer_id == eng_a.engineer_id))
        assert vs_cnt == 1
        db_vs = db.get(Visa, created_vs.visa_id)
        assert db_vs.country == "South Korea"
        assert db_vs.visa_type == "Specialist Visa"
        assert str(db_vs.visa_end_date) == "2026-03-01"
        print(f"[PASS] TEST B & C: Visa updated in-place. Visa count remains: {vs_cnt}")


        # =========================================================================
        # MODULE 5: UP-TRAVEL (travel_id)
        # =========================================================================
        print("\n--- [MODULE 5] Testing up-travel PK-Based Updates ---")
        headers_tr = ["Travel ID", "Orbit ID", "Booking Date", "Travel Date", "Purpose", "Comments"]

        # TEST A: Insert
        rows_tr_a = [["", orbit_a, "2024-02-01", "2024-02-15", "Onsite Support Trip", "Flight Flight 101"]]
        res = client.post("/api/upload", data={"module_id": "up-travel"}, files={"file": ("tr_a.xlsx", create_test_excel_bytes("Travel", headers_tr, rows_tr_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1

        db.expire_all()
        created_tr = db.scalars(select(Travel).where(Travel.schedule_id == created_sc.schedule_id)).first()
        assert created_tr is not None
        tr_id_str = str(created_tr.travel_id)
        print(f"[PASS] TEST A: Travel inserted with travel_id: {tr_id_str}")

        # TEST B & C: Update travel_date, purpose, comments via PK
        rows_tr_bc = [[tr_id_str, orbit_a, "2024-02-05", "2024-02-20", "Emergency Tool Install", "Rescheduled flight"]]
        res = client.post("/api/upload", data={"module_id": "up-travel"}, files={"file": ("tr_bc.xlsx", create_test_excel_bytes("Travel", headers_tr, rows_tr_bc), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        tr_cnt = db.scalar(select(func.count()).select_from(Travel).where(Travel.schedule_id == created_sc.schedule_id))
        assert tr_cnt == 1
        db_tr = db.get(Travel, created_tr.travel_id)
        assert db_tr.purpose == "Emergency Tool Install"
        assert str(db_tr.travel_date) == "2024-02-20"
        print(f"[PASS] TEST B & C: Travel updated in-place. Travel count remains: {tr_cnt}")


        # =========================================================================
        # MODULE 6: UP-PERFORMANCE (performance_id)
        # =========================================================================
        print("\n--- [MODULE 6] Testing up-performance PK-Based Updates ---")
        headers_pf = ["Performance ID", "Schedule ID", "Orbit ID", "Score", "Actual Start Date", "Actual End Date", "Escalation", "Escalation Reason", "Feedback"]

        # TEST A: Insert
        rows_pf_a = [["", sc_id_str, orbit_a, "4.2", "2024-03-01", "2024-04-30", "No", "", "Good job"]]
        res = client.post("/api/upload", data={"module_id": "up-performance"}, files={"file": ("pf_a.xlsx", create_test_excel_bytes("Performance", headers_pf, rows_pf_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1

        db.expire_all()
        created_pf = db.scalars(select(Performance).where(Performance.schedule_id == created_sc.schedule_id)).first()
        assert created_pf is not None
        pf_id_str = str(created_pf.performance_id)
        print(f"[PASS] TEST A: Performance inserted with performance_id: {pf_id_str}")

        # TEST B & C: Update score, actual_start_date, escalation via PK
        rows_pf_bc = [[pf_id_str, sc_id_str, orbit_a, "4.9", "2024-03-05", "2024-05-10", "Yes", "Minor delay in parts", "Excellent resolution"]]
        res = client.post("/api/upload", data={"module_id": "up-performance"}, files={"file": ("pf_bc.xlsx", create_test_excel_bytes("Performance", headers_pf, rows_pf_bc), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        pf_cnt = db.scalar(select(func.count()).select_from(Performance).where(Performance.schedule_id == created_sc.schedule_id))
        assert pf_cnt == 1
        db_pf = db.get(Performance, created_pf.performance_id)
        assert float(db_pf.score) == 4.9
        assert db_pf.escalation is True
        assert db_pf.escalation_reason == "Minor delay in parts"
        print(f"[PASS] TEST B & C: Performance updated in-place. Performance count remains: {pf_cnt}")


        # =========================================================================
        # MODULE 7: UP-LEAVE (leave_id)
        # =========================================================================
        print("\n--- [MODULE 7] Testing up-leave PK-Based Updates ---")
        headers_lv = ["Leave ID", "Orbit ID", "Leave Type", "Requested Date", "Requested On", "Approval Status"]

        # TEST A: Insert
        rows_lv_a = [["", orbit_a, "Annual Leave", "2024-07-01", "2024-06-15", "Pending"]]
        res = client.post("/api/upload", data={"module_id": "up-leave"}, files={"file": ("lv_a.xlsx", create_test_excel_bytes("Leave", headers_lv, rows_lv_a), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["inserted"] == 1

        db.expire_all()
        created_lv = db.scalars(select(Leave).where(Leave.engineer_id == eng_a.engineer_id)).first()
        assert created_lv is not None
        lv_id_str = str(created_lv.leave_id)
        print(f"[PASS] TEST A: Leave inserted with leave_id: {lv_id_str}")

        # TEST B & C: Update leave_type, requested_date, approval_status via PK
        rows_lv_bc = [[lv_id_str, orbit_a, "Sick Leave", "2024-07-05", "2024-06-15", "Approved"]]
        res = client.post("/api/upload", data={"module_id": "up-leave"}, files={"file": ("lv_bc.xlsx", create_test_excel_bytes("Leave", headers_lv, rows_lv_bc), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_a)
        assert res.status_code == 200, res.text
        assert res.json()["updated"] == 1

        db.expire_all()
        lv_cnt = db.scalar(select(func.count()).select_from(Leave).where(Leave.engineer_id == eng_a.engineer_id))
        assert lv_cnt == 1
        db_lv = db.get(Leave, created_lv.leave_id)
        assert db_lv.leave_type == "Sick Leave"
        assert str(db_lv.requested_date) == "2024-07-05"
        assert db_lv.approval_status == "Approved"
        print(f"[PASS] TEST B & C: Leave updated in-place. Leave count remains: {lv_cnt}")

        print("\n==================================================================")
        print("ALL 7 MODULES PASSED PK-BASED UPSERT REAL DATABASE TEST SUITE!")
        print("==================================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_pk_upsert_test_suite()
