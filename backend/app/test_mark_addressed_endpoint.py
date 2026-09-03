import sys
import os
import uuid
from datetime import date
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.schedule import Schedule
from app.services.security import get_password_hash, create_access_token

client = TestClient(app)

def test_mark_addressed_lifecycle():
    print("=== RUNNING MARK ADDRESSED ENDPOINT AUTOMATED TEST ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]

    try:
        # 1. Create Companies A and B
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"CompA-{suffix}",
            short_name=f"CA{suffix}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"CompB-{suffix}",
            short_name=f"CB{suffix}",
            is_active=True
        )
        db.add_all([comp_a, comp_b])
        db.commit()

        # 2. Create Users (Manager A, Manager B, Engineer A)
        mgr_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            full_name=f"Manager A-{suffix}",
            email=f"mgr.a.{suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Manager",
            is_active=True
        )
        mgr_b = User(
            user_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            full_name=f"Manager B-{suffix}",
            email=f"mgr.b.{suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Manager",
            is_active=True
        )
        eng_user_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            full_name=f"Engineer User A-{suffix}",
            email=f"eng.a.{suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )
        db.add_all([mgr_a, mgr_b, eng_user_a])
        db.commit()

        headers_mgr_a = {"Authorization": f"Bearer {create_access_token({'sub': str(mgr_a.user_id)})}"}
        headers_mgr_b = {"Authorization": f"Bearer {create_access_token({'sub': str(mgr_b.user_id)})}"}
        headers_eng_a = {"Authorization": f"Bearer {create_access_token({'sub': str(eng_user_a.user_id)})}"}

        # 3. Create Engineer in Company A
        eng_a = Engineer(
            engineer_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_name=f"Engineer A-{suffix}",
            orbit_id=f"ORB-{suffix}",
            status="Active"
        )
        db.add(eng_a)
        db.commit()

        # 4. Create Schedule with comment_adressal=False and pending remark
        sch_id = uuid.uuid4()
        original_remarks = "Need visa extension for high priority project"
        original_support_type = "Commissioning"
        original_country = "USA"
        original_fab_city = "Austin"
        original_fab_site = "Samsung Fab 2"
        original_start_date = date(2026, 9, 1)
        original_end_date = date(2026, 9, 30)

        sch = Schedule(
            schedule_id=sch_id,
            engineer_id=eng_a.engineer_id,
            support_type=original_support_type,
            country=original_country,
            fab_city=original_fab_city,
            fab_site=original_fab_site,
            start_date=original_start_date,
            end_date=original_end_date,
            schedule_status="Active",
            remarks=original_remarks,
            comment_adressal=False,
            comment_status="UNADDRESSED"
        )
        db.add(sch)
        db.commit()

        # Verify initial DB state
        db.refresh(sch)
        assert sch.comment_adressal is False, "Initial comment_adressal should be False"
        print("[OK] Created test schedule with comment_adressal = False")

        # 5. TEST: Nonexistent schedule returns 404
        non_existent_id = uuid.uuid4()
        res_404 = client.post(f"/api/schedules/{non_existent_id}/mark-addressed", headers=headers_mgr_a)
        assert res_404.status_code == 404, f"Expected 404 for nonexistent schedule, got {res_404.status_code}"
        print("[OK] Nonexistent schedule correctly returned 404 Not Found")

        # 6. TEST: Cross-company unauthorized access returns 403 / 404 IDOR block
        res_cross = client.post(f"/api/schedules/{sch_id}/mark-addressed", headers=headers_mgr_b)
        assert res_cross.status_code in (403, 404), f"Expected 403/404 for cross-company access, got {res_cross.status_code}"
        print("[OK] Cross-company access correctly blocked")

        # 7. TEST: Field Engineer role forbidden returns 403
        res_eng_forbidden = client.post(f"/api/schedules/{sch_id}/mark-addressed", headers=headers_eng_a)
        assert res_eng_forbidden.status_code == 403, f"Expected 403 for Field Engineer role, got {res_eng_forbidden.status_code}"
        print("[OK] Field Engineer role correctly forbidden with 403")

        # 8. TEST: Authorized Manager A calls POST /api/schedules/{schedule_id}/mark-addressed
        res_success = client.post(f"/api/schedules/{sch_id}/mark-addressed", headers=headers_mgr_a)
        assert res_success.status_code == 200, f"Expected 200 OK, got {res_success.status_code}: {res_success.text}"
        res_json = res_success.json()
        assert res_json.get("comment_adressal") is None, f"Response comment_adressal should be null, got {res_json.get('comment_adressal')}"
        assert str(res_json.get("schedule_id")) == str(sch_id), "Response schedule_id mismatch"
        assert "message" in res_json, "Response must include message"
        print(f"[OK] POST /api/schedules/{sch_id}/mark-addressed returned 200 with: {res_json}")

        # 9. Query PostgreSQL directly and verify:
        # a) comment_adressal IS NULL (None)
        # b) no other fields were modified
        db.expire_all()
        sch_in_db = db.get(Schedule, sch_id)
        assert sch_in_db is not None, "Schedule must exist in DB"
        assert sch_in_db.comment_adressal is None, f"comment_adressal in DB must be None (NULL), got {sch_in_db.comment_adressal}"
        assert sch_in_db.engineer_id == eng_a.engineer_id, "engineer_id must not change"
        assert sch_in_db.remarks == original_remarks, "remarks must not change"
        assert sch_in_db.support_type == original_support_type, "support_type must not change"
        assert sch_in_db.country == original_country, "country must not change"
        assert sch_in_db.fab_city == original_fab_city, "fab_city must not change"
        assert sch_in_db.fab_site == original_fab_site, "fab_site must not change"
        assert sch_in_db.start_date == original_start_date, "start_date must not change"
        assert sch_in_db.end_date == original_end_date, "end_date must not change"
        print("[OK] Verified in DB: schedules.comment_adressal IS NULL and all other schedule fields are unchanged!")

        # 10. Query schedules with comment_adressal=false and verify this schedule is no longer returned
        res_pending_query = client.get(f"/api/schedules?company_id={comp_a.company_id}&comment_adressal=false", headers=headers_mgr_a)
        assert res_pending_query.status_code == 200
        pending_items = res_pending_query.json().get("items", [])
        addressed_in_pending = [item for item in pending_items if str(item["schedule_id"]) == str(sch_id)]
        assert len(addressed_in_pending) == 0, "Schedule with comment_adressal=NULL must NOT appear in comment_adressal=false query"
        print("[OK] Confirmed: Addressed schedule is completely excluded from comment_adressal=false query!")

        print("\n=============================================================")
        print("ALL MARK-ADDRESSED BACKEND SPECIFICATION TESTS PASSED (100%)!")
        print("=============================================================")

    finally:
        # Cleanup test records
        try:
            db.query(Schedule).filter(Schedule.schedule_id == sch_id).delete()
            db.query(Engineer).filter(Engineer.engineer_id == eng_a.engineer_id).delete()
            db.query(User).filter(User.user_id.in_([mgr_a.user_id, mgr_b.user_id, eng_user_a.user_id])).delete()
            db.query(Company).filter(Company.company_id.in_([comp_a.company_id, comp_b.company_id])).delete()
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

if __name__ == "__main__":
    test_mark_addressed_lifecycle()
