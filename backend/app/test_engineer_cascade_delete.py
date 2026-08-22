import sys
import os
import uuid
from datetime import date, timedelta
from sqlalchemy import select, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.skill import Skill
from app.models.leave import Leave
from app.models.travel import Travel
from app.models.performance import Performance
from app.models.missed_schedule import MissedSchedule
from app.services.engineer_service import delete_engineer
from app.services.security import get_password_hash

def test_cascade_delete_engineer():
    db = SessionLocal()
    print("=== TESTING CASCADE DELETE ENGINEER AND ALL RELATED RECORDS ===")
    
    unique_suffix = uuid.uuid4().hex[:8]
    
    try:
        # 1. Company
        comp = db.scalar(select(Company).limit(1))
        if not comp:
            comp = Company(
                company_id=uuid.uuid4(),
                company_name="Cascade Test Corp",
                company_code="CTC",
                is_active=True
            )
            db.add(comp)
            db.commit()
            db.refresh(comp)

        company_id = comp.company_id

        # 2. Engineer
        eng_id = uuid.uuid4()
        eng = Engineer(
            engineer_id=eng_id,
            company_id=company_id,
            engineer_name="Cascade Test Engineer",
            orbit_id=f"ORB-DEL-{unique_suffix}",
            lam_id=f"LAM-DEL-{unique_suffix}",
            level="L3 Senior",
            status="Active"
        )
        db.add(eng)
        db.commit()

        # 3. User linked to Engineer
        usr_id = uuid.uuid4()
        usr = User(
            user_id=usr_id,
            company_id=company_id,
            engineer_id=eng_id,
            full_name="Cascade User",
            email=f"cascade.{unique_suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )
        db.add(usr)
        db.commit()

        # 4. Schedule
        sch_id = uuid.uuid4()
        sch = Schedule(
            schedule_id=sch_id,
            engineer_id=eng_id,
            owner_id=usr_id,
            support_type="Install",
            country="Korea",
            start_date=date.today(),
            schedule_status="Active"
        )
        db.add(sch)
        db.commit()

        # 5. Direct child records (skill, visa, leave)
        sk_id = uuid.uuid4()
        sk = Skill(
            skill_id=sk_id,
            engineer_id=eng_id,
            tool_type="Lam Kiyo",
            country="Korea"
        )

        v_id = uuid.uuid4()
        v = Visa(
            visa_id=v_id,
            engineer_id=eng_id,
            owner_id=usr_id,
            country="Korea",
            visa_type="C-3"
        )

        lv_id = uuid.uuid4()
        lv = Leave(
            leave_id=lv_id,
            engineer_id=eng_id,
            owner_id=usr_id,
            leave_type="Annual",
            approval_status="Approved"
        )

        db.add_all([sk, v, lv])
        db.commit()

        # 6. Schedule sub-dependent records (travel, perf, missed schedule)
        trv_id = uuid.uuid4()
        trv = Travel(
            travel_id=trv_id,
            schedule_id=sch_id,
            owner_id=usr_id,
            purpose="Tool Install"
        )

        prf_id = uuid.uuid4()
        prf = Performance(
            performance_id=prf_id,
            schedule_id=sch_id,
            owner_id=usr_id,
            score=98.0,
            feedback="Top tier performance"
        )

        ms_id = uuid.uuid4()
        ms = MissedSchedule(
            missed_schedule_id=ms_id,
            schedule_id=sch_id,
            owner_id=usr_id,
            reason="Flight delay"
        )

        db.add_all([trv, prf, ms])
        db.commit()

        print("[OK] Created test engineer with all child records (skills, schedules, visas, leaves, travel, performance, missed_schedules, user link).")

        # 7. Call delete_engineer
        delete_engineer(db, eng_id)
        print("[OK] Executed delete_engineer().")

        # 8. Verify all tables are clean for this engineer
        assert db.get(Engineer, eng_id) is None, "Engineer record still exists"
        assert db.get(Skill, sk_id) is None, "Skill record still exists"
        assert db.get(Visa, v_id) is None, "Visa record still exists"
        assert db.get(Leave, lv_id) is None, "Leave record still exists"
        assert db.get(Schedule, sch_id) is None, "Schedule record still exists"
        assert db.get(Travel, trv_id) is None, "Travel record still exists"
        assert db.get(Performance, prf_id) is None, "Performance record still exists"
        assert db.get(MissedSchedule, ms_id) is None, "MissedSchedule record still exists"

        # Verify linked Field Engineer user account is deleted
        updated_usr = db.get(User, usr_id)
        assert updated_usr is None, "Field Engineer user account should be deleted"


        print("\nALL CASCADE DELETION CHECKS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_cascade_delete_engineer()
