import uuid
from datetime import datetime, date
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app.main import app
from app.database import get_db
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.user import User
from app.services.security import create_access_token, get_password_hash
from app.test_engineer_upload import create_test_excel_bytes

client = TestClient(app)

def test_axcelis_date_upload():
    db = next(get_db())
    
    # Get or create Axcelis company
    axcelis = db.scalars(select(Company).where(func.lower(Company.company_name).like("%axcelis%"))).first()
    if not axcelis:
        axcelis = Company(
            company_id=uuid.uuid4(),
            company_name="Axcelis Technologies(ION)",
            short_name="AXCELIS",
            created_at=datetime.utcnow()
        )
        db.add(axcelis)
        db.commit()
        db.refresh(axcelis)
    
    # Check if engineer E232 exists across any company
    eng = db.scalars(select(Engineer).where(func.lower(Engineer.orbit_id) == "e232")).first()
    if not eng:
        eng = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=axcelis.company_id,
            engineer_name="Esakkimuthu Rengana",
            orbit_id="E232",
            email=f"esakki_{uuid.uuid4().hex[:4]}@axcelis.com",
            created_at=datetime.utcnow()
        )
        db.add(eng)
        db.commit()
        db.refresh(eng)
    else:
        if eng.company_id != axcelis.company_id:
            eng.company_id = axcelis.company_id
            db.commit()
            db.refresh(eng)
        
    admin_user = db.scalars(select(User).where(User.role == "Main Admin")).first()
    if not admin_user:
        admin_user = User(
            user_id=uuid.uuid4(),
            email=f"admin_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Main Admin User",
            role="Main Admin",
            password_hash=get_password_hash("admin123"),
            company_id=axcelis.company_id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    elif not admin_user.company_id:
        admin_user.company_id = axcelis.company_id
        db.commit()
        db.refresh(admin_user)

    token = create_access_token({"sub": str(admin_user.user_id)})
    headers_auth = {"Authorization": f"Bearer {token}"}

    headers_sc = ["Full Name", "Short Name", "Orbit ID", "Region", "Country", "Start Date", "End Date", "Support Type"]
    rows_sc = [["Esakkimuthu Rengana", "Esakki", "E232", "APAC", "India", "01/05/2026", "01/30/2026", "PTO"]]
    
    excel_bytes = create_test_excel_bytes("Schedule", headers_sc, rows_sc)
    
    res = client.post(
        "/api/upload",
        data={"module_id": "up-schedule", "company_id": str(axcelis.company_id)},
        files={"file": ("axcelis_schedule.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers_auth
    )
    
    assert res.status_code == 200, f"Axcelis upload failed with status {res.status_code}: {res.text}"
    body = res.json()
    print("\nUpload Response:", body)
    assert body["success"] is True, f"Upload returned error: {body}"
    assert body["inserted"] >= 1 or body["valid_rows"] >= 1, f"Row should be successfully processed: {body}"
    
    # Check created Schedule record in DB
    db.expire_all()
    sched = db.scalars(
        select(Schedule).where(
            Schedule.engineer_id == eng.engineer_id,
            Schedule.support_type == "PTO"
        ).order_by(Schedule.created_at.desc())
    ).first()
    assert sched is not None, "Schedule record should be saved in DB"
    assert sched.start_date == date(2026, 1, 5), f"Expected 2026-01-05, got {sched.start_date}"
    assert sched.end_date == date(2026, 1, 30), f"Expected 2026-01-30, got {sched.end_date}"
    print("\n==========================================================================")
    print("[PASS] Axcelis Bulk Upload test with dates 01/05/2026 and 01/30/2026 PASSED CLEANLY!")
    print(f"Ingested Schedule: start_date={sched.start_date}, end_date={sched.end_date}, support_type={sched.support_type}")
    print("==========================================================================")

if __name__ == "__main__":
    test_axcelis_date_upload()
