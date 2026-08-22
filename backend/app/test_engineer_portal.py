import sys
import os
import uuid
from datetime import date, datetime, timedelta
from sqlalchemy import select, text
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.engineer import Engineer
from app.models.company import Company
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.skill import Skill
from app.models.performance import Performance
from app.services.security import get_password_hash, create_access_token

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    print("=== STARTING ENGINEER PORTAL INTEGRATION & SECURITY TESTS ===")
    
    unique_suffix = uuid.uuid4().hex[:8]
    created_user_ids = []
    created_eng_ids = []
    created_sch_ids = []
    created_visa_ids = []
    created_skill_ids = []
    created_perf_ids = []

    try:
        # 0. Setup test company
        comp = db.scalar(select(Company).limit(1))
        if not comp:
            comp = Company(
                company_id=uuid.uuid4(),
                company_name="Test Semiconductor Corp",
                company_code="TSC",
                is_active=True
            )
            db.add(comp)
            db.commit()
            db.refresh(comp)

        company_id = comp.company_id

        # 1. Create Engineer A & Engineer B
        eng_a_id = uuid.uuid4()
        eng_a = Engineer(
            engineer_id=eng_a_id,
            company_id=company_id,
            engineer_name="Engineer Alpha",
            orbit_id=f"TEST-A-{unique_suffix}",
            lam_id=f"LAM-A-{unique_suffix}",
            level="L2 Specialist",
            primary_tool_type="Etch",
            status="Active",
            email=f"eng.alpha.{unique_suffix}@test.com"
        )

        eng_b_id = uuid.uuid4()
        eng_b = Engineer(
            engineer_id=eng_b_id,
            company_id=company_id,
            engineer_name="Engineer Beta",
            orbit_id=f"TEST-B-{unique_suffix}",
            lam_id=f"LAM-B-{unique_suffix}",
            level="L3 Senior",
            primary_tool_type="Deposition",
            status="Active",
            email=f"eng.beta.{unique_suffix}@test.com"
        )

        db.add_all([eng_a, eng_b])
        db.commit()
        created_eng_ids.extend([eng_a_id, eng_b_id])

        # 2. Create User accounts for Engineer A & B
        user_a_id = uuid.uuid4()
        user_a = User(
            user_id=user_a_id,
            company_id=company_id,
            engineer_id=eng_a_id,
            full_name="Engineer Alpha",
            email=f"user.alpha.{unique_suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )

        user_b_id = uuid.uuid4()
        user_b = User(
            user_id=user_b_id,
            company_id=company_id,
            engineer_id=eng_b_id,
            full_name="Engineer Beta",
            email=f"user.beta.{unique_suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )

        db.add_all([user_a, user_b])
        db.commit()
        created_user_ids.extend([user_a_id, user_b_id])


        # 3. Create Schedules, Visas, Skills, Performance for A and B
        sch_a_id = uuid.uuid4()
        today = date.today()
        sch_a_10 = Schedule(
            schedule_id=sch_a_id,
            engineer_id=eng_a_id,
            owner_id=user_a_id,
            support_type="Customer Support",
            country="Taiwan",
            fab_city="Hsinchu",
            fab_site="TSMC Fab 18",
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=30),
            schedule_status="Upcoming",
            remarks="Original Remarks A"
        )
        sch_a_60 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a_id,
            owner_id=user_a_id,
            support_type="Install Support",
            country="Japan",
            fab_city="Kumamoto",
            fab_site="JASM Fab 1",
            start_date=today + timedelta(days=60),
            end_date=today + timedelta(days=90),
            schedule_status="Upcoming",
            remarks="Far Schedule"
        )

        sch_b_id = uuid.uuid4()
        sch_b = Schedule(
            schedule_id=sch_b_id,
            engineer_id=eng_b_id,
            owner_id=user_b_id,
            support_type="Relocation",
            country="USA",
            fab_city="Phoenix",
            fab_site="Intel Fab 42",
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=45),
            schedule_status="Upcoming",
            remarks="Schedule B"
        )

        visa_a_id = uuid.uuid4()
        visa_a = Visa(
            visa_id=visa_a_id,
            engineer_id=eng_a_id,
            owner_id=user_a_id,
            country="Taiwan",
            visa_type="ARC Work Permit",
            applied_on=today - timedelta(days=30),
            visa_start_date=today - timedelta(days=20),
            visa_end_date=today + timedelta(days=340),
            comments="Original Visa Comment A"
        )

        visa_b_id = uuid.uuid4()
        visa_b = Visa(
            visa_id=visa_b_id,
            engineer_id=eng_b_id,
            owner_id=user_b_id,
            country="USA",
            visa_type="H1B",
            applied_on=today - timedelta(days=60),
            visa_start_date=today - timedelta(days=40),
            visa_end_date=today + timedelta(days=300),
            comments="Visa Comment B"
        )

        skill_a_id = uuid.uuid4()
        skill_a = Skill(
            skill_id=skill_a_id,
            engineer_id=eng_a_id,
            country="Taiwan",
            fab="Fab 18",
            wafer_size="300mm",
            tool_type="Lam Kiyo FX",
            role="Primary",
            number_of_tools=5,
            ready_for_primary_role=True,
            comments="Etch Expert"
        )

        skill_b_id = uuid.uuid4()
        skill_b = Skill(
            skill_id=skill_b_id,
            engineer_id=eng_b_id,
            country="USA",
            fab="Fab 42",
            wafer_size="300mm",
            tool_type="Lam Vector",
            role="Secondary",
            number_of_tools=2,
            ready_for_primary_role=False,
            comments="CVD Trainee"
        )


        db.add_all([sch_a_10, sch_a_60, sch_b, visa_a, visa_b, skill_a, skill_b])
        db.commit()

        created_sch_ids.extend([sch_a_id, sch_b_id])
        created_visa_ids.extend([visa_a_id, visa_b_id])
        created_skill_ids.extend([skill_a_id, skill_b_id])

        perf_a_id = uuid.uuid4()
        perf_a = Performance(
            performance_id=perf_a_id,
            schedule_id=sch_a_id,
            actual_start_date=today - timedelta(days=50),
            actual_end_date=today - timedelta(days=35),
            score=95.0,
            feedback="Exceeded customer SLAs",
            escalation=False
        )

        perf_b_id = uuid.uuid4()
        perf_b = Performance(
            performance_id=perf_b_id,
            schedule_id=sch_b_id,
            actual_start_date=today - timedelta(days=80),
            actual_end_date=today - timedelta(days=60),
            score=88.0,
            feedback="Good performance",
            escalation=False
        )

        db.add_all([perf_a, perf_b])
        db.commit()
        created_perf_ids.extend([perf_a_id, perf_b_id])


        # Generate JWT Tokens for A and B
        token_a = create_access_token({"sub": str(user_a_id)})
        token_b = create_access_token({"sub": str(user_b_id)})

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        print("\n--- TEST 1: GET /api/engineer/me ---")
        res_a = client.get("/api/engineer/me", headers=headers_a)
        assert res_a.status_code == 200, f"Expected 200, got {res_a.status_code}"
        assert res_a.json()["engineer_id"] == str(eng_a_id)
        print("[OK] Engineer A loaded own profile successfully.")

        res_b = client.get("/api/engineer/me", headers=headers_b)
        assert res_b.status_code == 200
        assert res_b.json()["engineer_id"] == str(eng_b_id)
        print("[OK] Engineer B loaded own profile successfully.")

        print("\n--- TEST 2: BACKEND IDOR PROTECTION (GET another engineer's endpoints) ---")
        # Engineer A trying to GET Engineer B directly
        res_idor_1 = client.get(f"/api/engineers/{eng_b_id}", headers=headers_a)
        assert res_idor_1.status_code == 403, f"IDOR check failed: got {res_idor_1.status_code}"
        print("[OK] Engineer A blocked from GET /api/engineers/{engineer_B_id} (403 Forbidden).")

        res_idor_2 = client.get(f"/api/engineers/{eng_b_id}/schedules", headers=headers_a)
        assert res_idor_2.status_code == 403
        print("[OK] Engineer A blocked from GET /api/engineers/{engineer_B_id}/schedules (403 Forbidden).")

        res_idor_3 = client.get(f"/api/engineers/{eng_b_id}/visa", headers=headers_a)
        assert res_idor_3.status_code == 403
        print("[OK] Engineer A blocked from GET /api/engineers/{engineer_B_id}/visa (403 Forbidden).")

        res_idor_4 = client.get(f"/api/engineers/{eng_b_id}/skills", headers=headers_a)
        assert res_idor_4.status_code == 403
        print("[OK] Engineer A blocked from GET /api/engineers/{engineer_B_id}/skills (403 Forbidden).")

        res_idor_5 = client.get(f"/api/engineers/{eng_b_id}/performance", headers=headers_a)
        assert res_idor_5.status_code == 403
        print("[OK] Engineer A blocked from GET /api/engineers/{engineer_B_id}/performance (403 Forbidden).")

        print("\n--- TEST 3: SKILL EDIT SECURITY ---")
        # Engineer A PUT own skill
        res_skill_own = client.put(f"/api/engineer/me/skills/{skill_a_id}", json={
            "tool_type": "Lam Kiyo FX-II",
            "ready_for_primary_role": True,
            "comments": "Updated self skill"
        }, headers=headers_a)
        assert res_skill_own.status_code == 200, f"Expected 200, got {res_skill_own.status_code}"
        print("[OK] Engineer A updated own skill successfully.")

        # Engineer A PUT Engineer B's skill
        res_skill_other = client.put(f"/api/engineer/me/skills/{skill_b_id}", json={
            "tool_type": "Hacked Tool"
        }, headers=headers_a)
        assert res_skill_other.status_code == 403, f"Expected 403, got {res_skill_other.status_code}"
        print("[OK] Engineer A blocked from updating Engineer B skill (403 Forbidden).")

        # Engineer A via global PUT /api/skills/{skill_b_id}
        res_skill_global = client.put(f"/api/skills/{skill_b_id}", json={
            "tool_type": "Hacked Tool"
        }, headers=headers_a)
        assert res_skill_global.status_code == 403
        print("[OK] Engineer A blocked from updating Engineer B skill via global endpoint (403 Forbidden).")

        print("\n--- TEST 4: SCHEDULE COMMENT SECURITY ---")
        # Engineer A PATCH own schedule comments
        res_sch_own = client.patch(f"/api/engineer/me/schedules/{sch_a_id}/comments", json={
            "remarks": "Self updated remarks for Schedule A"
        }, headers=headers_a)
        assert res_sch_own.status_code == 200
        assert res_sch_own.json()["remarks"] == "Self updated remarks for Schedule A"
        print("[OK] Engineer A updated own schedule remarks successfully.")

        # Engineer A PATCH Engineer B schedule comments
        res_sch_other = client.patch(f"/api/engineer/me/schedules/{sch_b_id}/comments", json={
            "remarks": "Tampered remarks"
        }, headers=headers_a)
        assert res_sch_other.status_code == 403
        print("[OK] Engineer A blocked from updating Engineer B schedule remarks (403 Forbidden).")

        print("\n--- TEST 5: VISA COMMENT SECURITY ---")
        # Engineer A PATCH own visa comments
        res_visa_own = client.patch(f"/api/engineer/me/visa/{visa_a_id}/comments", json={
            "comments": "Self updated visa remarks A"
        }, headers=headers_a)
        assert res_visa_own.status_code == 200
        assert res_visa_own.json()["comments"] == "Self updated visa remarks A"
        print("[OK] Engineer A updated own visa comments successfully.")

        # Engineer A PATCH Engineer B visa comments
        res_visa_other = client.patch(f"/api/engineer/me/visa/{visa_b_id}/comments", json={
            "comments": "Tampered visa comments"
        }, headers=headers_a)
        assert res_visa_other.status_code == 403
        print("[OK] Engineer A blocked from updating Engineer B visa comments (403 Forbidden).")

        print("\n--- TEST 6: NEXT SCHEDULE & 30-DAY ALERT ---")
        res_next = client.get("/api/engineer/me/schedules/next", headers=headers_a)
        assert res_next.status_code == 200
        next_data = res_next.json()
        assert next_data["schedule_id"] == str(sch_a_id)
        assert next_data["country"] == "Taiwan"
        print("[OK] Selected nearest upcoming schedule (10 days out).")

        print("\n--- TEST 7: NO SCHEDULE TEST ---")
        # Create Engineer C with no schedules
        eng_c_id = uuid.uuid4()
        eng_c = Engineer(
            engineer_id=eng_c_id,
            company_id=company_id,
            engineer_name="Engineer Charlie",
            orbit_id=f"TEST-C-{unique_suffix}",
            status="Active"
        )
        user_c_id = uuid.uuid4()
        user_c = User(
            user_id=user_c_id,
            company_id=company_id,
            engineer_id=eng_c_id,
            full_name="Engineer Charlie",
            email=f"user.charlie.{unique_suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )
        db.add_all([eng_c, user_c])
        db.commit()
        created_eng_ids.append(eng_c_id)
        created_user_ids.append(user_c_id)


        token_c = create_access_token({"sub": str(user_c_id)})
        headers_c = {"Authorization": f"Bearer {token_c}"}

        res_no_sch = client.get("/api/engineer/me/schedules/next", headers=headers_c)
        assert res_no_sch.status_code == 200
        assert res_no_sch.json() is None
        print("[OK] Engineer with no schedule returned null gracefully without error.")

        print("\n--- TEST 8: ENGINEER REPORTS SUMMARY ---")
        res_rep_a = client.get("/api/engineer/me/reports/summary", headers=headers_a)
        assert res_rep_a.status_code == 200
        rep_a_data = res_rep_a.json()
        assert rep_a_data["engineer_id"] == str(eng_a_id)
        assert rep_a_data["upcoming_schedules"] == 2
        assert rep_a_data["active_skills"] == 1

        res_rep_b = client.get("/api/engineer/me/reports/summary", headers=headers_b)
        assert res_rep_b.status_code == 200
        rep_b_data = res_rep_b.json()
        assert rep_b_data["engineer_id"] == str(eng_b_id)
        assert rep_b_data["upcoming_schedules"] == 1
        assert rep_b_data["active_skills"] == 1
        assert rep_a_data["engineer_id"] != rep_b_data["engineer_id"]
        print("[OK] Engineer self-service reports summary isolated per engineer.")

        print("\n--- TEST 9: GLOBAL REPORTS & ADMIN BLOCKED FOR ENGINEERS ---")
        res_glob_rep = client.get("/api/reports/summary", headers=headers_a)
        assert res_glob_rep.status_code == 403, f"Expected 403, got {res_glob_rep.status_code}"
        print("[OK] Engineer blocked from accessing global reports /api/reports/summary (403 Forbidden).")


        print("\n--- TEST 10: DATABASE VERIFICATION ---")
        with engine.connect() as conn:
            sch_rows = conn.execute(text("SELECT schedule_id, engineer_id, owner_id FROM schedules WHERE schedule_id = :sid"), {"sid": sch_a_id}).fetchall()
            assert len(sch_rows) == 1
            assert sch_rows[0][2] == user_a_id
            print("[OK] Verified schedules.owner_id in database.")

            visa_rows = conn.execute(text("SELECT visa_id, engineer_id, owner_id, comments FROM visa_details WHERE visa_id = :vid"), {"vid": visa_a_id}).fetchall()
            assert len(visa_rows) == 1
            assert visa_rows[0][2] == user_a_id
            assert visa_rows[0][3] == "Self updated visa remarks A"
            print("[OK] Verified visa_details.owner_id and visa_details.comments in database.")

        print("\nALL 10 ENGINEER PORTAL TEST SUITES PASSED SUCCESSFULLY!")


    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
