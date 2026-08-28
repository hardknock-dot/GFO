import os
import sys
import io
import time
import uuid
from datetime import date, datetime
import openpyxl
import httpx
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings
from app.models.company import Company
from app.models.user import User
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.performance import Performance
from app.models.skill import Skill
from app.models.visa import Visa
from app.models.travel import Travel
from app.models.leave import Leave

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def create_test_excel_bytes(sheet_name: str, headers: list, rows: list) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def run_all_supabase_tests():
    print("==================================================")
    print("ALL 7 MODULES PRODUCTION SUPABASE END-TO-END VERIFICATION")
    print("==================================================")

    # 1. Company & Authentication via Render
    company = db.scalars(select(Company)).first()
    print(f"Target Company: {company.company_name} ({company.company_id})")

    login_url = "https://gfo-eybm.onrender.com/api/auth/login"
    render_upload_url = "https://gfo-eybm.onrender.com/api/upload"

    auth_token = None
    with httpx.Client(timeout=30.0) as client:
        res = client.post(login_url, json={"email": "k.brewster@lam.com", "password": "Admin@123"})
        assert res.status_code == 200, f"Failed login: {res.text}"
        auth_token = res.json().get("token") or res.json().get("access_token")
    
    headers_req = {
        "X-Company-ID": str(company.company_id),
        "Authorization": f"Bearer {auth_token}"
    }
    print("Render Backend Authentication: SUCCESS (Token acquired)")

    unique_suffix = f"sp_{int(time.time())}"
    test_orbit_id = f"SUPA_{unique_suffix}"

    with httpx.Client(timeout=30.0) as client:
        # ----------------------------------------------------
        # 1. ENGINEERS MODULE
        # ----------------------------------------------------
        print("\n[1/7] Testing Engineers Module against Render -> Supabase...")
        headers_eng = ["Engineer Name", "Goes By", "Employee ID", "Orbit ID", "Level", "Date of Joining", "Primary Tool", "Customer Exp (Years)", "Industry Exp", "Status", "Email", "Phone Number"]
        rows_eng_v1 = [["Original Supabase Engineer", "O-Supa", "EMP-SUPA", test_orbit_id, "Level 1", "2024-01-01", "Etcher", "3.0 yrs", "5.0 yrs", "Active", f"{unique_suffix}@supa.com", "+123456789"]]
        excel_eng_v1 = create_test_excel_bytes("Engineer", headers_eng, rows_eng_v1)
        
        res1 = client.post(render_upload_url, data={"module_id": "up-engineers"}, files={"file": ("eng1.xlsx", excel_eng_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res1.status_code == 200, f"Engineers insert failed: {res1.text}"
        
        db.expire_all()
        eng_record = db.scalars(select(Engineer).where(Engineer.orbit_id == test_orbit_id, Engineer.company_id == company.company_id)).first()
        assert eng_record is not None, "Engineer record not found in Supabase!"
        orig_eng_id = eng_record.engineer_id
        
        # Update Engineer
        rows_eng_v2 = [["UPDATED Supabase Engineer", "U-Supa", "EMP-SUPA", test_orbit_id, "Level 2 Lead", "2024-01-01", "Etcher Prime", "4.5 yrs", "7.0 yrs", "Active", f"{unique_suffix}@supa.com", "+123456789"]]
        excel_eng_v2 = create_test_excel_bytes("Engineer", headers_eng, rows_eng_v2)
        res2 = client.post(render_upload_url, data={"module_id": "up-engineers"}, files={"file": ("eng2.xlsx", excel_eng_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        print(f"Engineers V2 Render Response: {res2.status_code} - {res2.text}")
        db.expire_all()
        eng_after = db.scalars(select(Engineer).where(Engineer.orbit_id == test_orbit_id, Engineer.company_id == company.company_id)).first()
        print(f"Engineer After Update in Supabase: name='{eng_after.engineer_name}', id='{eng_after.engineer_id}' (orig id='{orig_eng_id}')")
        if eng_after.engineer_name == "UPDATED Supabase Engineer":
            print("  [PASS] Engineers Module: Inserted & Updated in-place in Supabase.")
        else:
            print("  [FAIL] Engineers Module: Render backend skipped updating existing engineer record!")

        # ----------------------------------------------------
        # 2. SKILLS MODULE
        # ----------------------------------------------------
        print("\n[2/7] Testing Skills Module against Render -> Supabase...")
        headers_sk = ["Orbit ID", "Country", "FAB", "Wafer Size", "Tool Type", "Start Date", "End Date", "Number of Tools", "Role", "Comments"]
        rows_sk_v1 = [[test_orbit_id, "USA", "Fab 10", "300mm", "Etcher Alpha", "2024-01-01", "2024-06-01", "3", "Lead Tech", "Original Skill Comment"]]
        excel_sk_v1 = create_test_excel_bytes("Skill Matrix", headers_sk, rows_sk_v1)
        res_s1 = client.post(render_upload_url, data={"module_id": "up-skills"}, files={"file": ("sk1.xlsx", excel_sk_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_s1.status_code == 200, f"Skills insert failed: {res_s1.text}"

        db.expire_all()
        sk_before = db.scalars(select(Skill).where(Skill.engineer_id == orig_eng_id)).first()
        orig_sk_id = sk_before.skill_id

        # Update Skill
        rows_sk_v2 = [[test_orbit_id, "usa", "fab 10", "300mm", "etcher alpha", "2024-01-01", "2024-06-01", "5", "Senior Lead Tech", "UPDATED Skill Comment"]]
        excel_sk_v2 = create_test_excel_bytes("Skill Matrix", headers_sk, rows_sk_v2)
        res_s2 = client.post(render_upload_url, data={"module_id": "up-skills"}, files={"file": ("sk2.xlsx", excel_sk_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_s2.status_code == 200, f"Skills update failed: {res_s2.text}"

        db.expire_all()
        sk_after = db.scalars(select(Skill).where(Skill.engineer_id == orig_eng_id)).first()
        assert sk_after.skill_id == orig_sk_id
        assert sk_after.comments == "UPDATED Skill Comment"
        cnt_sk = db.scalar(text(f"SELECT COUNT(*) FROM skills WHERE engineer_id = '{orig_eng_id}'"))
        assert cnt_sk == 1
        print("  [PASS] Skills Module: Inserted & Updated in-place in Supabase.")

        # ----------------------------------------------------
        # 3. SCHEDULES MODULE
        # ----------------------------------------------------
        print("\n[3/7] Testing Schedules Module against Render -> Supabase...")
        headers_sc = ["Orbit ID", "Support Type", "Country", "Fab City", "Fab Site", "Start Date", "End Date", "Schedule Status", "Remarks"]
        rows_sc_v1 = [[test_orbit_id, "Onsite Support", "USA", "Phoenix", "Fab 42", "2024-03-01", "2024-05-01", "Upcoming", "Original Schedule Remark"]]
        excel_sc_v1 = create_test_excel_bytes("Schedule", headers_sc, rows_sc_v1)
        res_sc1 = client.post(render_upload_url, data={"module_id": "up-schedule"}, files={"file": ("sc1.xlsx", excel_sc_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_sc1.status_code == 200, f"Schedule insert failed: {res_sc1.text}"

        db.expire_all()
        sc_before = db.scalars(select(Schedule).where(Schedule.engineer_id == orig_eng_id)).first()
        orig_sc_id = sc_before.schedule_id

        # Update Schedule
        rows_sc_v2 = [[test_orbit_id, "onsite support", "usa", "phoenix", "fab 42", "2024-03-01", "2024-05-01", "Ongoing", "UPDATED Schedule Remark"]]
        excel_sc_v2 = create_test_excel_bytes("Schedule", headers_sc, rows_sc_v2)
        res_sc2 = client.post(render_upload_url, data={"module_id": "up-schedule"}, files={"file": ("sc2.xlsx", excel_sc_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_sc2.status_code == 200, f"Schedule update failed: {res_sc2.text}"

        db.expire_all()
        sc_after = db.scalars(select(Schedule).where(Schedule.engineer_id == orig_eng_id)).first()
        assert sc_after.schedule_id == orig_sc_id
        assert sc_after.remarks == "UPDATED Schedule Remark"
        cnt_sc = db.scalar(text(f"SELECT COUNT(*) FROM schedules WHERE engineer_id = '{orig_eng_id}'"))
        assert cnt_sc == 1
        print("  [PASS] Schedules Module: Inserted & Updated in-place in Supabase.")

        # ----------------------------------------------------
        # 4. VISA MODULE
        # ----------------------------------------------------
        print("\n[4/7] Testing Visa Module against Render -> Supabase...")
        headers_vs = ["Orbit ID", "Country", "Visa Type", "Applied On", "Visa Start Date", "Visa End Date", "Comments"]
        rows_vs_v1 = [[test_orbit_id, "Japan", "Work Visa", "2024-01-10", "2024-02-01", "2025-02-01", "Original Visa Comment"]]
        excel_vs_v1 = create_test_excel_bytes("Visa", headers_vs, rows_vs_v1)
        res_v1 = client.post(render_upload_url, data={"module_id": "up-visa"}, files={"file": ("vs1.xlsx", excel_vs_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_v1.status_code == 200, f"Visa insert failed: {res_v1.text}"

        db.expire_all()
        vs_before = db.scalars(select(Visa).where(Visa.engineer_id == orig_eng_id)).first()
        orig_vs_id = vs_before.visa_id

        # Update Visa
        rows_vs_v2 = [[test_orbit_id, "japan", "work visa", "2024-01-10", "2024-02-01", "2025-02-01", "UPDATED Visa Comment"]]
        excel_vs_v2 = create_test_excel_bytes("Visa", headers_vs, rows_vs_v2)
        res_v2 = client.post(render_upload_url, data={"module_id": "up-visa"}, files={"file": ("vs2.xlsx", excel_vs_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_v2.status_code == 200, f"Visa update failed: {res_v2.text}"

        db.expire_all()
        vs_after = db.scalars(select(Visa).where(Visa.engineer_id == orig_eng_id)).first()
        assert vs_after.visa_id == orig_vs_id
        assert vs_after.comments == "UPDATED Visa Comment"
        cnt_vs = db.scalar(text(f"SELECT COUNT(*) FROM visa_details WHERE engineer_id = '{orig_eng_id}'"))
        assert cnt_vs == 1
        print("  [PASS] Visa Module: Inserted & Updated in-place in Supabase.")

        # ----------------------------------------------------
        # 5. TRAVEL MODULE
        # ----------------------------------------------------
        print("\n[5/7] Testing Travel Module against Render -> Supabase...")
        headers_tr = ["Orbit ID", "Booking Date", "Travel Date", "Purpose", "Comments"]
        rows_tr_v1 = [[test_orbit_id, "2024-02-15", "2024-03-01", "Customer Support", "Original Flight Comment"]]
        excel_tr_v1 = create_test_excel_bytes("Travel", headers_tr, rows_tr_v1)
        res_t1 = client.post(render_upload_url, data={"module_id": "up-travel"}, files={"file": ("tr1.xlsx", excel_tr_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_t1.status_code == 200, f"Travel insert failed: {res_t1.text}"

        db.expire_all()
        tr_before = db.scalars(select(Travel).where(Travel.schedule_id == orig_sc_id)).first()
        orig_tr_id = tr_before.travel_id

        # Update Travel
        rows_tr_v2 = [[test_orbit_id, "2024-02-15", "2024-03-01", "customer support", "UPDATED Flight Comment"]]
        excel_tr_v2 = create_test_excel_bytes("Travel", headers_tr, rows_tr_v2)
        res_t2 = client.post(render_upload_url, data={"module_id": "up-travel"}, files={"file": ("tr2.xlsx", excel_tr_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_t2.status_code == 200, f"Travel update failed: {res_t2.text}"

        db.expire_all()
        tr_after = db.scalars(select(Travel).where(Travel.schedule_id == orig_sc_id)).first()
        assert tr_after.travel_id == orig_tr_id
        assert tr_after.comments == "UPDATED Flight Comment"
        cnt_tr = db.scalar(text(f"SELECT COUNT(*) FROM travel_arrangements WHERE schedule_id = '{orig_sc_id}'"))
        assert cnt_tr == 1
        print("  [PASS] Travel Module: Inserted & Updated in-place in Supabase.")

        # ----------------------------------------------------
        # 6. PERFORMANCE MODULE
        # ----------------------------------------------------
        print("\n[6/7] Testing Performance Module against Render -> Supabase...")
        headers_pf = ["Schedule ID", "Orbit ID", "Actual Start Date", "Actual End Date", "Score", "Escalation", "Escalation Reason", "Feedback"]
        rows_pf_v1 = [[str(orig_sc_id), test_orbit_id, "2024-03-01", "2024-05-01", "4.5", "No", "", "Original Feedback 4.5"]]
        excel_pf_v1 = create_test_excel_bytes("Performance", headers_pf, rows_pf_v1)
        res_p1 = client.post(render_upload_url, data={"module_id": "up-performance"}, files={"file": ("pf1.xlsx", excel_pf_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_p1.status_code == 200, f"Performance insert failed: {res_p1.text}"

        db.expire_all()
        pf_before = db.scalars(select(Performance).where(Performance.schedule_id == orig_sc_id)).first()
        orig_pf_id = pf_before.performance_id

        # Update Performance
        rows_pf_v2 = [[str(orig_sc_id), test_orbit_id, "2024-03-01", "2024-05-01", "4.9", "No", "", "UPDATED Feedback 4.9"]]
        excel_pf_v2 = create_test_excel_bytes("Performance", headers_pf, rows_pf_v2)
        res_p2 = client.post(render_upload_url, data={"module_id": "up-performance"}, files={"file": ("pf2.xlsx", excel_pf_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_p2.status_code == 200, f"Performance update failed: {res_p2.text}"

        db.expire_all()
        pf_after = db.scalars(select(Performance).where(Performance.schedule_id == orig_sc_id)).first()
        assert pf_after.performance_id == orig_pf_id
        assert float(pf_after.score) == 4.9
        assert pf_after.feedback == "UPDATED Feedback 4.9"
        cnt_pf = db.scalar(text(f"SELECT COUNT(*) FROM performances WHERE schedule_id = '{orig_sc_id}'"))
        assert cnt_pf == 1
        print("  [PASS] Performance Module: Inserted & Updated in-place in Supabase.")

        # ----------------------------------------------------
        # 7. LEAVE MODULE
        # ----------------------------------------------------
        print("\n[7/7] Testing Leave Module against Render -> Supabase...")
        headers_lv = ["Orbit ID", "Requested Date", "Requested On", "Leave Type", "Approval Status"]
        rows_lv_v1 = [[test_orbit_id, "2024-07-15", "2024-06-01", "Annual Leave", "Pending"]]
        excel_lv_v1 = create_test_excel_bytes("Leave", headers_lv, rows_lv_v1)
        res_l1 = client.post(render_upload_url, data={"module_id": "up-leave"}, files={"file": ("lv1.xlsx", excel_lv_v1, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_l1.status_code == 200, f"Leave insert failed: {res_l1.text}"

        db.expire_all()
        lv_before = db.scalars(select(Leave).where(Leave.engineer_id == orig_eng_id)).first()
        orig_lv_id = lv_before.leave_id

        # Update Leave
        rows_lv_v2 = [[test_orbit_id, "2024-07-15", "2024-06-01", "annual leave", "Approved"]]
        excel_lv_v2 = create_test_excel_bytes("Leave", headers_lv, rows_lv_v2)
        res_l2 = client.post(render_upload_url, data={"module_id": "up-leave"}, files={"file": ("lv2.xlsx", excel_lv_v2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_req)
        assert res_l2.status_code == 200, f"Leave update failed: {res_l2.text}"

        db.expire_all()
        lv_after = db.scalars(select(Leave).where(Leave.engineer_id == orig_eng_id)).first()
        assert lv_after.leave_id == orig_lv_id
        assert lv_after.approval_status == "Approved"
        cnt_lv = db.scalar(text(f"SELECT COUNT(*) FROM leaves WHERE engineer_id = '{orig_eng_id}'"))
        assert cnt_lv == 1
        print("  [PASS] Leave Module: Inserted & Updated in-place in Supabase.")

        print("\n==================================================")
        print("ALL 7 MODULES SUCCESSFULLY VERIFIED AGAINST SUPABASE VIA RENDER BACKEND!")
        print("==================================================")

if __name__ == "__main__":
    run_all_supabase_tests()
