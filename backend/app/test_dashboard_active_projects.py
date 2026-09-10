import sys
import os
import uuid
from datetime import date, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.services.dashboard_service import get_dashboard_metrics

def test_active_projects_count_no_pto():
    db = SessionLocal()
    u_suffix = uuid.uuid4().hex[:6]
    try:
        comp = Company(company_id=uuid.uuid4(), company_name=f"Test PTO {u_suffix}", short_name=f"TPTO{u_suffix}", is_active=True)
        db.add(comp)
        db.commit()

        eng = Engineer(engineer_id=uuid.uuid4(), company_id=comp.company_id, engineer_name="PTO Test Eng", orbit_id=f"ORBPTO{u_suffix}", status="Active")
        db.add(eng)
        db.commit()

        today = date.today()

        # 1. Normal project schedule (active)
        s_project = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng.engineer_id,
            support_type="Customer Support",
            country="Taiwan",
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=5),
            schedule_status="Active"
        )

        # 2. PTO schedule (active date range)
        s_pto = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng.engineer_id,
            support_type="PTO - Annual Leave",
            country="Taiwan",
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=2),
            schedule_status="Active"
        )

        db.add_all([s_project, s_pto])
        db.commit()

        res = get_dashboard_metrics(db, company_ids=[comp.company_id])
        print(f"Active projects count calculated: {res.kpi.active_projects_count}")
        assert res.kpi.active_projects_count == 1, f"Expected active_projects_count to be 1 (excluding PTO), got {res.kpi.active_projects_count}"
        print("TEST PASSED: PTO schedule was NOT counted in active_projects_count!")
    finally:
        db.close()

if __name__ == "__main__":
    test_active_projects_count_no_pto()
