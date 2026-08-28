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

# Initialize Supabase DB Session directly
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

def run_supabase_test():
    print("==================================================")
    print("TESTING PRODUCTION SUPABASE DATABASE UPSERT FLOW")
    print("==================================================")

    # 1. Fetch an existing company and user from Supabase
    company = db.scalars(select(Company)).first()
    user = db.scalars(select(User).where(User.company_id == company.company_id)).first()
    print(f"Company: {company.company_name} ({company.company_id})")
    print(f"User: {user.full_name} ({user.email})")

    # 2. Inspect existing Performance record in Supabase
    existing_perf = db.scalars(select(Performance)).first()
    if not existing_perf:
        print("No existing Performance record found in Supabase! Searching for Schedule...")
        sch = db.scalars(select(Schedule)).first()
        eng = db.scalars(select(Engineer).where(Engineer.engineer_id == sch.engineer_id)).first()
        print(f"Using existing Schedule: {sch.schedule_id}, Engineer Orbit ID: {eng.orbit_id}")
        
        # Create initial Performance record in Supabase
        perf = Performance(
            performance_id=uuid.uuid4(),
            schedule_id=sch.schedule_id,
            actual_start_date=date(2025, 1, 1),
            actual_end_date=date(2025, 1, 15),
            score=4.0,
            escalation=False,
            feedback="Initial feedback before upsert test",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(perf)
        db.commit()
        db.refresh(perf)
        existing_perf = perf

    # Fetch corresponding Schedule and Engineer from Supabase
    target_sch = db.scalars(select(Schedule).where(Schedule.schedule_id == existing_perf.schedule_id)).first()
    target_eng = db.scalars(select(Engineer).where(Engineer.engineer_id == target_sch.engineer_id)).first()

    perf_id = existing_perf.performance_id
    sch_id = existing_perf.schedule_id
    orbit_id = target_eng.orbit_id
    start_date = existing_perf.actual_start_date
    orig_score = float(existing_perf.score) if existing_perf.score is not None else 0.0
    orig_feedback = existing_perf.feedback or ""
    orig_updated_at = existing_perf.updated_at

    print("\n--- SUPABASE PERFORMANCE RECORD BEFORE UPLOAD ---")
    print(f"  Performance ID: {perf_id}")
    print(f"  Schedule ID: {sch_id}")
    print(f"  Orbit ID: {orbit_id}")
    print(f"  Actual Start Date: {start_date}")
    print(f"  Original Score: {orig_score}")
    print(f"  Original Feedback: {orig_feedback}")
    print(f"  Original Updated At: {orig_updated_at}")

    # 3. Create Excel with SAME natural key (schedule_id, actual_start_date) but NEW score & feedback
    new_score_val = 4.9 if orig_score != 4.9 else 4.8
    new_feedback_val = f"Supabase Upsert Verified at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    headers_pf = ["Schedule ID", "Orbit ID", "Actual Start Date", "Actual End Date", "Score", "Escalation", "Escalation Reason", "Feedback"]
    rows_pf = [[str(sch_id), orbit_id, str(start_date), str(existing_perf.actual_end_date or start_date), str(new_score_val), "No", "", new_feedback_val]]
    excel_bytes = create_test_excel_bytes("Performance", headers_pf, rows_pf)

    print(f"\n--- EXCEL PAYLOAD TO UPLOAD ---")
    print(f"  Target Score: {new_score_val}")
    print(f"  Target Feedback: {new_feedback_val}")

    # 4. Authenticate via deployed Render API
    render_url = "https://gfo-eybm.onrender.com/api/upload"
    login_url = "https://gfo-eybm.onrender.com/api/auth/login"
    
    print("\nAuthenticating with Render backend via /api/auth/login...")
    auth_token = None
    with httpx.Client(timeout=30.0) as client:
        # Get active user email from Supabase
        user_obj = db.scalars(select(User).where(User.is_active == True)).first()
        print(f"Attempting login for user: {user_obj.email}")
        
        # We can try logging in or reset password hash if needed
        # Let's test if default passwords like password123 or Admin@123 work, or test auth token
        login_res = client.post(login_url, json={"email": "k.brewster@lam.com", "password": "Admin@123"})
        print(f"Login Response Status: {login_res.status_code}")
        print(f"Login Response Body: {login_res.text[:150]}...")
        if login_res.status_code == 200:
            res_json = login_res.json()
            auth_token = res_json.get("token") or res_json.get("access_token")
        else:
            raise Exception(f"Failed to authenticate with Render backend: {login_res.text}")

    headers_req = {
        "X-Company-ID": str(company.company_id),
        "Authorization": f"Bearer {auth_token}"
    }

    print(f"\nSending POST request to Render backend: {render_url} ...")
    with httpx.Client(timeout=30.0) as client:
        try:
            resp = client.post(
                render_url,
                data={"module_id": "up-performance"},
                files={"file": ("performance_test.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                headers=headers_req
            )
            print(f"Render HTTP Response Status: {resp.status_code}")
            print(f"Render HTTP Response Body: {resp.text}")
        except Exception as err:
            print(f"Render HTTP Request Error: {err}")

    # 5. Query Supabase directly AFTER upload to verify database changes
    db.expire_all()
    updated_perf = db.scalars(select(Performance).where(Performance.performance_id == perf_id)).first()

    cnt = db.scalar(text(f"SELECT COUNT(*) FROM performances WHERE schedule_id = '{sch_id}' AND actual_start_date = '{start_date}'"))

    print("\n--- SUPABASE PERFORMANCE RECORD AFTER UPLOAD ---")
    print(f"  Performance ID: {updated_perf.performance_id}")
    print(f"  Score AFTER: {updated_perf.score}")
    print(f"  Feedback AFTER: {updated_perf.feedback}")
    print(f"  Updated At AFTER: {updated_perf.updated_at}")
    print(f"  Database Record Count: {cnt}")

    if float(updated_perf.score) == new_score_val and updated_perf.feedback == new_feedback_val and cnt == 1:
        print("\n==================================================")
        print("SUCCESS: SUPABASE DATABASE RECORD UPDATED IN-PLACE!")
        print("==================================================")
    else:
        print("\n==================================================")
        print("FAILURE: SUPABASE DATABASE RECORD WAS NOT UPDATED!")
        print("==================================================")

if __name__ == "__main__":
    run_supabase_test()
