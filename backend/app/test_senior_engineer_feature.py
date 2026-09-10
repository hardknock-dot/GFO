import sys
import os
import uuid
from datetime import date, datetime
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate
from app.services import schedule_service
from fastapi import HTTPException

def test_senior_engineer_feature():
    db = SessionLocal()
    print("=== TESTING SENIOR ENGINEER FEATURE IN SCHEDULE MODULE ===")

    u_suffix = uuid.uuid4().hex[:6]

    try:
        # Setup Company A and Company B
        comp_a = Company(company_id=uuid.uuid4(), company_name=f"Comp A {u_suffix}", short_name=f"CA{u_suffix}", is_active=True)
        comp_b = Company(company_id=uuid.uuid4(), company_name=f"Comp B {u_suffix}", short_name=f"CB{u_suffix}", is_active=True)
        db.add_all([comp_a, comp_b])
        db.commit()

        # Engineers in Company A
        eng1 = Engineer(engineer_id=uuid.uuid4(), company_id=comp_a.company_id, engineer_name="John Smith", orbit_id=f"ORB1_{u_suffix}", status="Active")
        eng2 = Engineer(engineer_id=uuid.uuid4(), company_id=comp_a.company_id, engineer_name="Raj Sharma", orbit_id=f"ORB2_{u_suffix}", status="Active")
        eng3 = Engineer(engineer_id=uuid.uuid4(), company_id=comp_a.company_id, engineer_name="Amit Kumar", orbit_id=f"ORB3_{u_suffix}", status="Active")
        
        # Engineer in Company B
        eng_other = Engineer(engineer_id=uuid.uuid4(), company_id=comp_b.company_id, engineer_name="Other Company Eng", orbit_id=f"ORBO_{u_suffix}", status="Active")

        db.add_all([eng1, eng2, eng3, eng_other])
        db.commit()

        print("[1] Test: Create schedule without Senior Engineer")
        sch1_data = ScheduleCreate(
            support_type="Customer Support",
            country="Taiwan",
            start_date=date.today(),
            senior_engineer_id=None
        )
        sch1 = schedule_service.create_schedule(db, eng1.engineer_id, sch1_data)
        assert sch1.senior_engineer_id is None, "senior_engineer_id should be None"
        print("  -> Passed! senior_engineer_id = NULL")

        print("[2] Test: Create schedule with Senior Engineer")
        sch2_data = ScheduleCreate(
            support_type="Install",
            country="Taiwan",
            start_date=date.today(),
            senior_engineer_id=eng2.engineer_id
        )
        sch2 = schedule_service.create_schedule(db, eng1.engineer_id, sch2_data)
        assert sch2.senior_engineer_id == eng2.engineer_id, "senior_engineer_id should equal eng2.engineer_id"
        print("  -> Passed! senior_engineer_id = Raj Sharma's ID")

        print("[3] Test: Edit schedule - change Senior Engineer")
        update_data = ScheduleUpdate(senior_engineer_id=eng3.engineer_id)
        sch2_updated = schedule_service.update_schedule(db, sch2.schedule_id, update_data)
        assert sch2_updated.senior_engineer_id == eng3.engineer_id, "senior_engineer_id should be updated to eng3"
        print("  -> Passed! senior_engineer_id updated to Amit Kumar's ID")

        print("[4] Test: Edit schedule - remove Senior Engineer (set to NULL)")
        update_null = ScheduleUpdate(senior_engineer_id=None)
        sch2_cleared = schedule_service.update_schedule(db, sch2.schedule_id, update_null)
        assert sch2_cleared.senior_engineer_id is None, "senior_engineer_id should become None"
        print("  -> Passed! senior_engineer_id set back to NULL")

        print("[5] Test: Cross-company Senior Engineer selection rejection")
        sch_cross_data = ScheduleCreate(
            support_type="Support",
            country="Taiwan",
            start_date=date.today(),
            senior_engineer_id=eng_other.engineer_id
        )
        try:
            schedule_service.create_schedule(db, eng1.engineer_id, sch_cross_data)
            assert False, "Should have raised HTTPException 400 for cross-company senior engineer"
        except HTTPException as e:
            assert e.status_code == 400
            print("  -> Passed! Rejected cross-company Senior Engineer with HTTP 400")

        print("[6] Test: Self Senior Engineer selection rejection")
        sch_self_data = ScheduleCreate(
            support_type="Support",
            country="Taiwan",
            start_date=date.today(),
            senior_engineer_id=eng1.engineer_id
        )
        try:
            schedule_service.create_schedule(db, eng1.engineer_id, sch_self_data)
            assert False, "Should have raised HTTPException 400 for self-assignment"
        except HTTPException as e:
            assert e.status_code == 400
            print("  -> Passed! Rejected self-assignment with HTTP 400")

        print("[7] Test: Paginated schedules list returns joined Senior Engineer info")
        res = schedule_service.get_schedules_paginated(db, company_id=comp_a.company_id)
        assert len(res["items"]) >= 2, "Should return at least 2 schedules"
        for item in res["items"]:
            if item.schedule_id == sch2.schedule_id:
                # sch2 was cleared back to None in test 4
                assert item.senior_engineer_name is None
        print("  -> Passed! Paginated schedule query returns senior engineer fields properly.")

        print("[8] Test: Multiple schedules with different Senior Engineers per schedule")
        # Schedule 1: Taiwan -> Raj (eng2)
        s_taiwan = schedule_service.create_schedule(db, eng1.engineer_id, ScheduleCreate(
            support_type="Customer Support", country="Taiwan", start_date=date(2026, 9, 15), end_date=date(2026, 10, 15), senior_engineer_id=eng2.engineer_id
        ))
        # Schedule 2: Korea -> Amit (eng3)
        s_korea = schedule_service.create_schedule(db, eng1.engineer_id, ScheduleCreate(
            support_type="Customer Support", country="Korea", start_date=date(2026, 11, 1), end_date=date(2026, 12, 15), senior_engineer_id=eng3.engineer_id
        ))
        # Schedule 3: USA -> Raj (eng2)
        s_usa = schedule_service.create_schedule(db, eng1.engineer_id, ScheduleCreate(
            support_type="Customer Support", country="USA", start_date=date(2027, 1, 10), end_date=date(2027, 2, 20), senior_engineer_id=eng2.engineer_id
        ))

        eng1_schedules = schedule_service.get_engineer_schedules(db, eng1.engineer_id)
        # Check s_taiwan senior_engineer
        st_db = [s for s in eng1_schedules if s.schedule_id == s_taiwan.schedule_id][0]
        sk_db = [s for s in eng1_schedules if s.schedule_id == s_korea.schedule_id][0]
        su_db = [s for s in eng1_schedules if s.schedule_id == s_usa.schedule_id][0]

        assert st_db.senior_engineer_name == "Raj Sharma"
        assert sk_db.senior_engineer_name == "Amit Kumar"
        assert su_db.senior_engineer_name == "Raj Sharma"
        print("  -> Passed! Taiwan -> Raj, Korea -> Amit, USA -> Raj properly derived from schedules!")

        print("\nALL SENIOR ENGINEER TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_senior_engineer_feature()
