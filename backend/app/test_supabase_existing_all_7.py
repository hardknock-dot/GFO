import os
import sys
import io
import time
import uuid
from datetime import date, datetime
import openpyxl
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings
from app.main import app
from app.models.company import Company
from app.models.user import User
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.performance import Performance
from app.models.skill import Skill
from app.models.visa import Visa
from app.models.travel import Travel
from app.models.leave import Leave

# Direct engine to Supabase PostgreSQL
engine = create_engine(settings.DATABASE_URL, connect_args={"prepare_threshold": None})
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

client = TestClient(app)

def create_excel(sheet_name: str, headers: list, rows: list) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def run_existing_supabase_tests():
    print("==================================================")
    print("REAL SUPABASE EXISTING-RECORDS UPSERT TEST SUITE")
    print("==================================================")

    # Fetch company and user
    company = db.scalars(select(Company)).first()
    user = db.scalars(select(User).where(User.company_id == company.company_id)).first()
    print(f"Database Host: {engine.url.host}")
    print(f"Company Target: {company.company_name} ({company.company_id})")
    print(f"User Auth Context: {user.full_name} ({user.email})")

    from app.services.security import create_access_token
    token = create_access_token({"sub": str(user.user_id)})
    headers_auth = {
        "Authorization": f"Bearer {token}",
        "X-Company-ID": str(company.company_id)
    }

    timestamp_str = datetime.now().strftime("%H:%M:%S")

    # ====================================================
    # [1/7] ENGINEERS MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[1/7] Testing Engineers Module (Existing Supabase Record)...")
    eng_before = db.scalars(select(Engineer).where(Engineer.company_id == company.company_id)).first()
    assert eng_before is not None, "No existing Engineer found in Supabase!"
    
    orig_eng_id = eng_before.engineer_id
    orbit_id = eng_before.orbit_id
    orig_name = eng_before.engineer_name
    orig_goes_by = eng_before.goes_by or ""
    
    print(f"  Existing Engineer UUID: {orig_eng_id}")
    print(f"  Natural Key (Orbit ID, Company ID): ('{orbit_id}', '{company.company_id}')")
    print(f"  Name BEFORE: '{orig_name.replace(chr(8203), '')}' | Goes By BEFORE: '{orig_goes_by.replace(chr(8203), '')}'")

    new_name = f"{orig_name} (SupaUpd {timestamp_str})"
    new_goes_by = f"GB-{timestamp_str}"

    headers_eng = ["Engineer Name", "Goes By", "Employee ID", "Orbit ID", "Level", "Date of Joining", "Primary Tool", "Customer Exp (Years)", "Industry Exp", "Status", "Email", "Phone Number"]
    rows_eng = [[new_name, new_goes_by, eng_before.lam_id or "EMP-100", orbit_id, eng_before.level or "Level 1", str(eng_before.date_of_joining or "2024-01-01"), eng_before.primary_tool_type or "Etcher", "5.0 yrs", "8.0 yrs", eng_before.status or "Active", eng_before.email or f"eng_{orbit_id}@supa.com", "+123456789"]]
    excel_eng = create_excel("Engineer", headers_eng, rows_eng)

    res_eng = client.post("/api/upload", data={"module_id": "up-engineers"}, files={"file": ("eng_up.xlsx", excel_eng, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_eng.status_code == 200, f"Engineers upload failed: {res_eng.text}"
    body_eng = res_eng.json()
    print(f"  API Response Payload: {body_eng}")
    assert body_eng["updated"] == 1, f"Expected updated=1, got {body_eng}"
    assert body_eng["inserted"] == 0, f"Expected inserted=0, got {body_eng}"

    db.expire_all()
    eng_after = db.scalars(select(Engineer).where(Engineer.engineer_id == orig_eng_id)).first()
    assert eng_after is not None, "Engineer missing from Supabase!"
    assert eng_after.engineer_id == orig_eng_id, "Engineer UUID changed!"
    assert eng_after.engineer_name == new_name, f"Expected name='{new_name}', got '{eng_after.engineer_name}'"
    assert eng_after.goes_by == new_goes_by, f"Expected goes_by='{new_goes_by}', got '{eng_after.goes_by}'"

    cnt_eng = db.scalar(text(f"SELECT COUNT(*) FROM engineers WHERE orbit_id = '{orbit_id}' AND company_id = '{company.company_id}'"))
    assert cnt_eng == 1, f"Duplicate Engineer created! Count = {cnt_eng}"
    print(f"  [PASS] Engineers Module: UUID preserved ({orig_eng_id}), Name & Goes By updated in Supabase, DB Count = 1.")

    # ====================================================
    # [2/7] SKILLS MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[2/7] Testing Skills Module (Existing Supabase Record)...")
    sk_before = db.scalars(select(Skill).where(Skill.start_date.isnot(None))).first()
    if not sk_before:
        sk_before = db.scalars(select(Skill)).first()
        sk_before.start_date = date(2025, 1, 13)
        sk_before.end_date = date(2025, 4, 13)
        sk_before.country = "Japan"
        sk_before.fab = "Rapidus"
        sk_before.wafer_size = "300mm"
        db.commit()
        db.refresh(sk_before)

    orig_sk_id = sk_before.skill_id
    sk_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == sk_before.engineer_id)).first()
    sk_orbit_id = sk_eng.orbit_id

    print(f"  Existing Skill UUID: {orig_sk_id}")
    print(f"  Engineer Orbit ID: {sk_orbit_id}")
    print(f"  Role BEFORE: '{sk_before.role}' | Comments BEFORE: '{sk_before.comments}'")

    new_sk_role = f"Lead Spec {timestamp_str}"
    new_sk_comments = f"Skill Updated {timestamp_str}"

    headers_sk = ["Orbit ID", "Country", "FAB", "Wafer Size", "Tool Type", "Start Date", "End Date", "Number of Tools", "Role", "Comments"]
    rows_sk = [[sk_orbit_id, sk_before.country or "Japan", sk_before.fab or "Rapidus", sk_before.wafer_size or "300mm", sk_before.tool_type or "SENSAI", str(sk_before.start_date), str(sk_before.end_date), "5", new_sk_role, new_sk_comments]]
    excel_sk = create_excel("Skill Matrix", headers_sk, rows_sk)

    res_sk = client.post("/api/upload", data={"module_id": "up-skills"}, files={"file": ("sk_up.xlsx", excel_sk, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_sk.status_code == 200, f"Skills upload failed: {res_sk.text}"
    body_sk = res_sk.json()
    print(f"  API Response Payload: {body_sk}")
    assert body_sk["updated"] == 1, f"Expected updated=1, got {body_sk}"
    assert body_sk["inserted"] == 0, f"Expected inserted=0, got {body_sk}"

    db.expire_all()
    sk_after = db.scalars(select(Skill).where(Skill.skill_id == orig_sk_id)).first()
    assert sk_after.skill_id == orig_sk_id
    assert sk_after.role == new_sk_role
    assert sk_after.comments == new_sk_comments

    cnt_sk = db.scalar(text(f"SELECT COUNT(*) FROM skills WHERE skill_id = '{orig_sk_id}'"))
    assert cnt_sk == 1
    print(f"  [PASS] Skills Module: UUID preserved ({orig_sk_id}), Role & Comments updated in Supabase, DB Count = 1.")

    # ====================================================
    # [3/7] SCHEDULES MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[3/7] Testing Schedules Module (Existing Supabase Record)...")
    sc_before = db.scalars(select(Schedule)).first()
    assert sc_before is not None, "No existing Schedule found in Supabase!"
    orig_sc_id = sc_before.schedule_id
    sc_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == sc_before.engineer_id)).first()
    sc_orbit_id = sc_eng.orbit_id

    print(f"  Existing Schedule UUID: {orig_sc_id}")
    print(f"  Engineer Orbit ID: {sc_orbit_id}")
    print(f"  Remarks BEFORE: '{sc_before.remarks}' | Status BEFORE: '{sc_before.schedule_status}'")

    new_sc_remarks = f"Schedule Remark {timestamp_str}"
    new_sc_status = "Ongoing" if sc_before.schedule_status != "Ongoing" else "Completed"

    # Natural Key: (engineer_id, support_type, country, fab_city, fab_site, start_date, end_date)
    headers_sc = ["Orbit ID", "Support Type", "Country", "Fab City", "Fab Site", "Start Date", "End Date", "Schedule Status", "Remarks"]
    rows_sc = [[sc_orbit_id, sc_before.support_type or "Deployment", sc_before.country or "Taiwan", sc_before.fab_city or "", sc_before.fab_site or "", str(sc_before.start_date), str(sc_before.end_date), new_sc_status, new_sc_remarks]]
    excel_sc = create_excel("Schedule", headers_sc, rows_sc)

    res_sc = client.post("/api/upload", data={"module_id": "up-schedule"}, files={"file": ("sc_up.xlsx", excel_sc, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_sc.status_code == 200, f"Schedules upload failed: {res_sc.text}"
    body_sc = res_sc.json()
    print(f"  API Response Payload: {body_sc}")
    assert body_sc["updated"] == 1, f"Expected updated=1, got {body_sc}"
    assert body_sc["inserted"] == 0

    db.expire_all()
    sc_after = db.scalars(select(Schedule).where(Schedule.schedule_id == orig_sc_id)).first()
    assert sc_after.schedule_id == orig_sc_id
    assert sc_after.remarks == new_sc_remarks
    assert sc_after.schedule_status == new_sc_status

    cnt_sc = db.scalar(text(f"SELECT COUNT(*) FROM schedules WHERE schedule_id = '{orig_sc_id}'"))
    assert cnt_sc == 1
    print(f"  [PASS] Schedules Module: UUID preserved ({orig_sc_id}), Remarks & Status updated in Supabase, DB Count = 1.")

    # ====================================================
    # [4/7] VISA MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[4/7] Testing Visa Module (Existing Supabase Record)...")
    vs_before = db.scalars(select(Visa)).first()
    assert vs_before is not None, "No existing Visa found in Supabase!"

    orig_vs_id = vs_before.visa_id
    vs_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == vs_before.engineer_id)).first()
    vs_orbit_id = vs_eng.orbit_id

    print(f"  Existing Visa UUID: {orig_vs_id}")
    print(f"  Engineer Orbit ID: {vs_orbit_id}")
    print(f"  Comments BEFORE: '{vs_before.comments}'")

    new_vs_comments = f"Visa Comment {timestamp_str}"

    headers_vs = ["Orbit ID", "Country", "Visa Type", "Applied On", "Visa Start Date", "Visa End Date", "Comments"]
    rows_vs = [[vs_orbit_id, vs_before.country, vs_before.visa_type, str(vs_before.applied_on or "2025-01-05"), str(vs_before.visa_start_date or "2025-02-01"), str(vs_before.visa_end_date or "2026-02-01"), new_vs_comments]]
    excel_vs = create_excel("Visa", headers_vs, rows_vs)

    res_vs = client.post("/api/upload", data={"module_id": "up-visa"}, files={"file": ("vs_up.xlsx", excel_vs, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_vs.status_code == 200, f"Visa upload failed: {res_vs.text}"
    body_vs = res_vs.json()
    print(f"  API Response Payload: {body_vs}")
    assert body_vs["updated"] == 1, f"Expected updated=1, got {body_vs}"
    assert body_vs["inserted"] == 0

    db.expire_all()
    vs_after = db.scalars(select(Visa).where(Visa.visa_id == orig_vs_id)).first()
    assert vs_after.visa_id == orig_vs_id
    assert vs_after.comments == new_vs_comments

    cnt_vs = db.scalar(text(f"SELECT COUNT(*) FROM visa_details WHERE visa_id = '{orig_vs_id}'"))
    assert cnt_vs == 1
    print(f"  [PASS] Visa Module: UUID preserved ({orig_vs_id}), Comments updated in Supabase, DB Count = 1.")

    # ====================================================
    # [5/7] TRAVEL MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[5/7] Testing Travel Module (Existing Supabase Record)...")
    tr_before = db.scalars(
        select(Travel)
        .join(Schedule, Travel.schedule_id == Schedule.schedule_id)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        .where(Engineer.company_id == company.company_id)
    ).first()
    assert tr_before is not None, "No existing Travel found for company in Supabase!"

    orig_tr_id = tr_before.travel_id
    tr_sch = db.scalars(select(Schedule).where(Schedule.schedule_id == tr_before.schedule_id)).first()
    tr_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == tr_sch.engineer_id)).first()
    tr_orbit_id = tr_eng.orbit_id

    print(f"  Existing Travel UUID: {orig_tr_id}")
    print(f"  Schedule ID: {tr_before.schedule_id}")
    print(f"  Engineer Orbit ID: {tr_orbit_id}")
    print(f"  Comments BEFORE: '{tr_before.comments}'")

    new_tr_comments = f"Flight Remark {timestamp_str}"

    headers_tr = ["Orbit ID", "Booking Date", "Travel Date", "Purpose", "Comments"]
    rows_tr = [[tr_orbit_id, str(tr_before.booking_date or "2025-01-10"), str(tr_before.travel_date), tr_before.purpose, new_tr_comments]]
    excel_tr = create_excel("Travel", headers_tr, rows_tr)

    res_tr = client.post("/api/upload", data={"module_id": "up-travel"}, files={"file": ("tr_up.xlsx", excel_tr, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_tr.status_code == 200, f"Travel upload failed: {res_tr.text}"
    body_tr = res_tr.json()
    print(f"  API Response Payload: {body_tr}")
    assert body_tr["updated"] == 1, f"Expected updated=1, got {body_tr}"
    assert body_tr["inserted"] == 0

    db.expire_all()
    tr_after = db.scalars(select(Travel).where(Travel.travel_id == orig_tr_id)).first()
    assert tr_after.travel_id == orig_tr_id
    assert tr_after.comments == new_tr_comments

    cnt_tr = db.scalar(text(f"SELECT COUNT(*) FROM travel_arrangements WHERE travel_id = '{orig_tr_id}'"))
    assert cnt_tr == 1
    print(f"  [PASS] Travel Module: UUID preserved ({orig_tr_id}), Comments updated in Supabase, DB Count = 1.")

    # ====================================================
    # [6/7] PERFORMANCE MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[6/7] Testing Performance Module (Existing Supabase Record)...")
    pf_before = db.scalars(
        select(Performance)
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
        .where(Engineer.company_id == company.company_id)
    ).first()
    assert pf_before is not None, "No existing Performance record found for company in Supabase!"

    orig_pf_id = pf_before.performance_id
    pf_sch = db.scalars(select(Schedule).where(Schedule.schedule_id == pf_before.schedule_id)).first()
    pf_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == pf_sch.engineer_id)).first()
    pf_orbit_id = pf_eng.orbit_id
    pf_start_date = pf_before.actual_start_date

    orig_pf_score = float(pf_before.score) if pf_before.score is not None else 4.0
    orig_pf_feedback = pf_before.feedback or ""

    print(f"  Existing Performance UUID: {orig_pf_id}")
    print(f"  Schedule ID: {pf_before.schedule_id}")
    print(f"  Engineer Orbit ID: {pf_orbit_id}")
    print(f"  Actual Start Date: {pf_start_date}")
    print(f"  Score BEFORE: {orig_pf_score} | Feedback BEFORE: '{orig_pf_feedback}'")

    new_pf_score = 4.8 if orig_pf_score != 4.8 else 4.9
    new_pf_feedback = f"Perf Feedback {timestamp_str}"

    headers_pf = ["Schedule ID", "Orbit ID", "Actual Start Date", "Actual End Date", "Score", "Escalation", "Escalation Reason", "Feedback"]
    rows_pf = [[str(pf_before.schedule_id), pf_orbit_id, str(pf_start_date), str(pf_before.actual_end_date or "2024-05-01"), str(new_pf_score), "No", "", new_pf_feedback]]
    excel_pf = create_excel("Performance", headers_pf, rows_pf)

    res_pf = client.post("/api/upload", data={"module_id": "up-performance"}, files={"file": ("pf_up.xlsx", excel_pf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_pf.status_code == 200, f"Performance upload failed: {res_pf.text}"
    body_pf = res_pf.json()
    print(f"  API Response Payload: {body_pf}")
    assert body_pf["updated"] == 1, f"Expected updated=1, got {body_pf}"
    assert body_pf["inserted"] == 0

    db.expire_all()
    pf_after = db.scalars(select(Performance).where(Performance.performance_id == orig_pf_id)).first()
    assert pf_after.performance_id == orig_pf_id
    assert float(pf_after.score) == new_pf_score
    assert pf_after.feedback == new_pf_feedback

    cnt_pf = db.scalar(text(f"SELECT COUNT(*) FROM performances WHERE schedule_id = '{pf_before.schedule_id}' AND actual_start_date = '{pf_start_date}'"))
    assert cnt_pf == 1, f"Duplicate Performance record created! Count = {cnt_pf}"
    print(f"  [PASS] Performance Module: UUID preserved ({orig_pf_id}), Score & Feedback updated in Supabase, DB Count = 1.")

    # ====================================================
    # [7/7] LEAVES MODULE (EXISTING SUPABASE RECORD)
    # ====================================================
    print("\n[7/7] Testing Leaves Module (Existing Supabase Record)...")
    lv_before = db.scalars(
        select(Leave)
        .join(Engineer, Leave.engineer_id == Engineer.engineer_id)
        .where(Engineer.company_id == company.company_id)
    ).first()
    assert lv_before is not None, "No existing Leave record found for company in Supabase!"

    orig_lv_id = lv_before.leave_id
    lv_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == lv_before.engineer_id)).first()
    lv_orbit_id = lv_eng.orbit_id
    lv_date = lv_before.requested_date

    print(f"  Existing Leave UUID: {orig_lv_id}")
    print(f"  Engineer Orbit ID: {lv_orbit_id}")
    print(f"  Requested Date: {lv_date}")
    print(f"  Approval Status BEFORE: '{lv_before.approval_status}'")

    new_lv_status = "Approved" if lv_before.approval_status != "Approved" else "Pending"

    headers_lv = ["Orbit ID", "Requested Date", "Requested On", "Leave Type", "Approval Status"]
    rows_lv = [[lv_orbit_id, str(lv_date), str(lv_before.requested_on or "2025-04-20"), lv_before.leave_type or "Annual Leave", new_lv_status]]
    excel_lv = create_excel("Leave", headers_lv, rows_lv)

    res_lv = client.post("/api/upload", data={"module_id": "up-leave"}, files={"file": ("lv_up.xlsx", excel_lv, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}, headers=headers_auth)
    assert res_lv.status_code == 200, f"Leave upload failed: {res_lv.text}"
    body_lv = res_lv.json()
    print(f"  API Response Payload: {body_lv}")
    assert body_lv["updated"] == 1, f"Expected updated=1, got {body_lv}"
    assert body_lv["inserted"] == 0

    db.expire_all()
    lv_after = db.scalars(select(Leave).where(Leave.leave_id == orig_lv_id)).first()
    assert lv_after.leave_id == orig_lv_id
    assert lv_after.approval_status == new_lv_status

    cnt_lv = db.scalar(text(f"SELECT COUNT(*) FROM leaves WHERE leave_id = '{orig_lv_id}'"))
    assert cnt_lv == 1
    print(f"  [PASS] Leaves Module: UUID preserved ({orig_lv_id}), Approval Status updated in Supabase, DB Count = 1.")

    print("\n==================================================")
    print("ALL 7 MODULES SUCCESSFULLY VERIFIED AGAINST EXISTING SUPABASE RECORDS!")
    print("==================================================")

if __name__ == "__main__":
    run_existing_supabase_tests()
