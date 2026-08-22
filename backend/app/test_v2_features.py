import sys
import os
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from app.models.schedule import Schedule
from app.models.skill import Skill
from app.models.leave import Leave
from app.models.visa import Visa
from app.models.engineer_deletion_request import EngineerDeletionRequest
from app.services.security import get_password_hash, create_access_token

client = TestClient(app)

def run_v2_security_tests():
    print("=== STARTING ORMP v2.0 AUTOMATED SECURITY & INTEGRATION TEST SUITE ===")
    
    # Initialize DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    suffix = uuid.uuid4().hex[:6]

    try:
        # Create Company A and Company B
        comp_a = Company(
            company_id=uuid.uuid4(),
            company_name=f"Company A-{suffix}",
            short_name=f"CA{suffix}",
            is_active=True
        )
        comp_b = Company(
            company_id=uuid.uuid4(),
            company_name=f"Company B-{suffix}",
            short_name=f"CB{suffix}",
            is_active=True
        )

        db.add_all([comp_a, comp_b])
        db.commit()

        # Create Users
        # 1. Global Admin
        gadmin_user = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            full_name=f"Global Admin-{suffix}",
            email=f"gadmin.{suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Global Admin",
            is_active=True
        )

        # 2. Manager A (Company A)
        manager_a = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            full_name=f"Manager A-{suffix}",
            email=f"manager.a.{suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Manager",
            is_active=True
        )

        # 3. Manager B (Company B)
        manager_b = User(
            user_id=uuid.uuid4(),
            company_id=comp_b.company_id,
            full_name=f"Manager B-{suffix}",
            email=f"manager.b.{suffix}@test.com",
            password_hash=get_password_hash("pass123"),
            role="Manager",
            is_active=True
        )

        # 4. Engineer A1 (Company A)
        eng_a1_id = uuid.uuid4()
        eng_a1 = Engineer(
            engineer_id=eng_a1_id,
            company_id=comp_a.company_id,
            engineer_name=f"Engineer A1-{suffix}",
            orbit_id=f"ORB-A1-{suffix}",
            status="Active",
            email=f"eng.a1.{suffix}@test.com"
        )

        # 5. Engineer A2 (Company A)
        eng_a2_id = uuid.uuid4()
        eng_a2 = Engineer(
            engineer_id=eng_a2_id,
            company_id=comp_a.company_id,
            engineer_name=f"Engineer A2-{suffix}",
            orbit_id=f"ORB-A2-{suffix}",
            status="Active",
            email=f"eng.a2.{suffix}@test.com"
        )

        # 6. Engineer B1 (Company B)
        eng_b1_id = uuid.uuid4()
        eng_b1 = Engineer(
            engineer_id=eng_b1_id,
            company_id=comp_b.company_id,
            engineer_name=f"Engineer B1-{suffix}",
            orbit_id=f"ORB-B1-{suffix}",
            status="Active",
            email=f"eng.b1.{suffix}@test.com"
        )

        db.add_all([gadmin_user, manager_a, manager_b, eng_a1, eng_a2, eng_b1])
        db.commit()

        # Engineer Users
        user_eng_a1 = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_id=eng_a1_id,
            full_name=eng_a1.engineer_name,
            email=eng_a1.email,
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )
        user_eng_a2 = User(
            user_id=uuid.uuid4(),
            company_id=comp_a.company_id,
            engineer_id=eng_a2_id,
            full_name=eng_a2.engineer_name,
            email=eng_a2.email,
            password_hash=get_password_hash("pass123"),
            role="Field Engineer",
            is_active=True
        )
        db.add_all([user_eng_a1, user_eng_a2])
        db.commit()

        # Tokens
        token_gadmin = create_access_token({"sub": str(gadmin_user.user_id), "role": gadmin_user.role})
        token_mgr_a = create_access_token({"sub": str(manager_a.user_id), "role": manager_a.role})
        token_mgr_b = create_access_token({"sub": str(manager_b.user_id), "role": manager_b.role})
        token_eng_a1 = create_access_token({"sub": str(user_eng_a1.user_id), "role": user_eng_a1.role})
        token_eng_a2 = create_access_token({"sub": str(user_eng_a2.user_id), "role": user_eng_a2.role})

        headers_gadmin = {"Authorization": f"Bearer {token_gadmin}"}
        headers_mgr_a = {"Authorization": f"Bearer {token_mgr_a}"}
        headers_mgr_b = {"Authorization": f"Bearer {token_mgr_b}"}
        headers_eng_a1 = {"Authorization": f"Bearer {token_eng_a1}"}
        headers_eng_a2 = {"Authorization": f"Bearer {token_eng_a2}"}

        # -------------------------------------------------------------
        # TEST M — AUTHENTICATION
        # -------------------------------------------------------------
        print("\n--- TEST M: AUTHENTICATION ---")
        res_m = client.get("/api/engineer/me")
        assert res_m.status_code == 401, f"Expected 401, got {res_m.status_code}"
        print("[OK] Unauthenticated request correctly rejected with 401.")

        # -------------------------------------------------------------
        # TEST A — ENGINEER PTO REQUEST
        # -------------------------------------------------------------
        print("\n--- TEST A: ENGINEER PTO REQUEST ---")
        pto_payload = {
            "leave_type": "Annual PTO",
            "requested_date": str(date.today() + timedelta(days=10))
        }
        res_a = client.post("/api/engineer/me/leaves", json=pto_payload, headers=headers_eng_a1)
        assert res_a.status_code == 201, f"Expected 201, got {res_a.status_code}: {res_a.text}"
        leave_a1 = res_a.json()
        assert leave_a1["approval_status"] == "PTO Requested", f"Expected 'PTO Requested', got {leave_a1['approval_status']}"
        assert leave_a1["engineer_id"] == str(eng_a1_id), "PTO not bound to authenticated engineer"
        leave_a1_id = leave_a1["leave_id"]
        print("[OK] Engineer A1 successfully requested PTO with status 'PTO Requested'.")

        # -------------------------------------------------------------
        # TEST B — PTO APPROVAL & ROLE CHECKS
        # -------------------------------------------------------------
        print("\n--- TEST B: PTO APPROVAL ---")
        # Engineer attempts to approve own PTO
        res_b_eng = client.put(f"/api/leaves/{leave_a1_id}", json={"approval_status": "Approved"}, headers=headers_eng_a1)
        assert res_b_eng.status_code == 403, f"Expected 403 when engineer approves own PTO, got {res_b_eng.status_code}"
        print("[OK] Engineer blocked from approving own PTO (403 Forbidden).")

        # Manager A approves PTO
        res_b_mgr = client.put(f"/api/leaves/{leave_a1_id}", json={"approval_status": "Approved"}, headers=headers_mgr_a)
        assert res_b_mgr.status_code == 200, f"Expected 200 when Manager approves PTO, got {res_b_mgr.status_code}"
        assert res_b_mgr.json()["approval_status"] == "Approved", "Status did not change to Approved"
        print("[OK] Manager A successfully approved PTO request.")

        # -------------------------------------------------------------
        # TEST C & D — SAME COUNTRY ALERT & COMPANY ISOLATION
        # -------------------------------------------------------------
        print("\n--- TEST C & D: SAME COUNTRY ALERT & COMPANY ISOLATION ---")
        # Assign schedules in USA to Eng A1 and Eng A2
        sch_a1 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a1_id,
            support_type="Install",
            country="USA",
            start_date=date.today(),
            schedule_status="Active"
        )
        sch_a2 = Schedule(
            schedule_id=uuid.uuid4(),
            engineer_id=eng_a2_id,
            support_type="Install",
            country="USA",
            start_date=date.today(),
            schedule_status="Active"
        )
        db.add_all([sch_a1, sch_a2])
        db.commit()

        # Submit 2 pending PTO requests in USA for Company A
        res_pto1 = client.post("/api/engineer/me/leaves", json={"leave_type": "PTO", "requested_date": str(date.today() + timedelta(days=15))}, headers=headers_eng_a1)
        res_pto2 = client.post("/api/engineer/me/leaves", json={"leave_type": "PTO", "requested_date": str(date.today() + timedelta(days=16))}, headers=headers_eng_a2)
        assert res_pto1.status_code == 201 and res_pto2.status_code == 201

        # Check Manager A alerts (Company A)
        res_alerts_a = client.get(f"/api/dashboard/operational-alerts?company_id={comp_a.company_id}", headers=headers_mgr_a)
        assert res_alerts_a.status_code == 200
        alerts_a = res_alerts_a.json()
        pto_conflicts_a = [a for a in alerts_a if a["type"] == "pto_conflict"]
        assert len(pto_conflicts_a) >= 1, "Expected PTO conflict alert for Company A"
        print(f"[OK] Company A generated same-country PTO conflict alert: {pto_conflicts_a[0]['message']}")

        # Check Manager B alerts (Company B) — Company Isolation
        res_alerts_b = client.get(f"/api/dashboard/operational-alerts?company_id={comp_b.company_id}", headers=headers_mgr_b)
        assert res_alerts_b.status_code == 200
        alerts_b = res_alerts_b.json()
        pto_conflicts_b = [a for a in alerts_b if a["type"] == "pto_conflict"]
        assert len(pto_conflicts_b) == 0, "Company B should NOT see Company A's PTO conflict alert"
        print("[OK] Company B isolated from Company A's PTO conflict alert.")

        # Change Eng A2's schedule to India
        sch_a2.country = "India"
        db.commit()
        res_alerts_a2 = client.get(f"/api/dashboard/operational-alerts?company_id={comp_a.company_id}", headers=headers_mgr_a)
        alerts_a2 = res_alerts_a2.json()
        pto_conflicts_a2 = [a for a in alerts_a2 if a["type"] == "pto_conflict" and "USA" in a["message"]]
        assert len(pto_conflicts_a2) == 0, "USA alert should clear when Eng A2 is changed to India"
        print("[OK] PTO conflict alert updated dynamically when country changed.")

        # Revert Eng A2 schedule back to USA for cleanliness
        sch_a2.country = "USA"
        db.commit()

        # -------------------------------------------------------------
        # TEST E & I — NON-GLOBAL ADMIN DELETE REQUEST & DUPLICATE CONFLICT
        # -------------------------------------------------------------
        print("\n--- TEST E & I: NON-GLOBAL ADMIN DELETE REQUEST & DUPLICATE CHECK ---")
        # Manager A attempts to delete Eng A2
        res_del_mgr = client.delete(f"/api/engineers/{eng_a2_id}", headers=headers_mgr_a)
        assert res_del_mgr.status_code == 200, f"Expected 200, got {res_del_mgr.status_code}"
        assert res_del_mgr.json()["status"] == "PENDING"
        
        # Verify Eng A2 still exists in DB
        assert db.get(Engineer, eng_a2_id) is not None, "Engineer should remain in DB when requested by Manager"
        print("[OK] Non-Global Admin delete created a PENDING Deletion Request without deleting engineer.")

        # Attempt duplicate request (TEST I)
        res_del_dup = client.delete(f"/api/engineers/{eng_a2_id}", headers=headers_mgr_a)
        assert res_del_dup.status_code == 409, f"Expected 409 duplicate conflict, got {res_del_dup.status_code}"
        print("[OK] Duplicate deletion request correctly rejected with 409 Conflict.")

        # -------------------------------------------------------------
        # TEST L — DELETION REQUEST IDOR
        # -------------------------------------------------------------
        print("\n--- TEST L: DELETION REQUEST IDOR ---")
        # Manager B attempts to list Company A deletion requests with tenant override
        res_idor_del = client.get(f"/api/engineer-deletion-requests?company_id={comp_a.company_id}", headers=headers_mgr_b)
        assert res_idor_del.status_code == 403, f"Expected 403 IDOR block, got {res_idor_del.status_code}"
        print("[OK] Manager B blocked from Company A deletion requests (403 Forbidden).")

        # -------------------------------------------------------------
        # TEST G — GLOBAL ADMIN APPROVE DELETE WITH CHILD RECORDS
        # -------------------------------------------------------------
        print("\n--- TEST G: DELETE APPROVAL WITH CHILD RECORDS ---")
        # Get request ID for Eng A2
        del_reqs = client.get("/api/engineer-deletion-requests", headers=headers_gadmin).json()
        req_a2 = next(r for r in del_reqs if r["engineer_id"] == str(eng_a2_id))
        req_a2_id = req_a2["request_id"]

        # Eng A2 has schedule sch_a2 attached. Global Admin attempts to approve
        res_app_g = client.post(f"/api/engineer-deletion-requests/{req_a2_id}/approve", headers=headers_gadmin)
        assert res_app_g.status_code == 409, f"Expected 409 child records safety block, got {res_app_g.status_code}: {res_app_g.text}"
        assert db.get(Engineer, eng_a2_id) is not None, "Engineer must remain"
        assert db.get(EngineerDeletionRequest, uuid.UUID(req_a2_id)).status == "PENDING", "Request must remain PENDING"
        print("[OK] Deletion approval blocked with 409 Conflict when child records exist.")

        # -------------------------------------------------------------
        # TEST H — REJECT DELETE REQUEST
        # -------------------------------------------------------------
        print("\n--- TEST H: REJECT DELETE REQUEST ---")
        res_rej = client.post(f"/api/engineer-deletion-requests/{req_a2_id}/reject", json={"review_comment": "Keep active for project"}, headers=headers_gadmin)
        assert res_rej.status_code == 200, f"Expected 200, got {res_rej.status_code}"
        assert res_rej.json()["status"] == "REJECTED"
        assert db.get(Engineer, eng_a2_id) is not None, "Engineer remains untouched"
        print("[OK] Global Admin rejected deletion request; Engineer remains active.")

        # -------------------------------------------------------------
        # TEST F — CLEAN DELETE WITHOUT CHILD RECORDS
        # -------------------------------------------------------------
        print("\n--- TEST F: CLEAN DELETE WITHOUT CHILD RECORDS ---")
        # Create isolated Engineer A3 with NO child records
        eng_a3_id = uuid.uuid4()
        eng_a3 = Engineer(
            engineer_id=eng_a3_id,
            company_id=comp_a.company_id,
            engineer_name=f"Engineer A3-{suffix}",
            orbit_id=f"ORB-A3-{suffix}",
            status="Active"
        )
        db.add(eng_a3)
        db.commit()

        # Manager A requests deletion for Eng A3
        res_del_a3 = client.delete(f"/api/engineers/{eng_a3_id}", headers=headers_mgr_a)
        assert res_del_a3.status_code == 200
        req_a3_id = res_del_a3.json()["request_id"]

        # Global Admin approves Eng A3 deletion
        res_app_a3 = client.post(f"/api/engineer-deletion-requests/{req_a3_id}/approve", headers=headers_gadmin)
        assert res_app_a3.status_code == 200, f"Expected 200, got {res_app_a3.status_code}: {res_app_a3.text}"
        assert res_app_a3.json()["status"] == "APPROVED"
        assert db.get(Engineer, eng_a3_id) is None, "Engineer A3 should be cleanly deleted from DB"
        print("[OK] Global Admin approved clean deletion request; Engineer deleted successfully.")

        # -------------------------------------------------------------
        # TEST J & K — FIELD ENGINEER COMMENTS & COMMENT STATUS IDOR
        # -------------------------------------------------------------
        print("\n--- TEST J & K: COMMENT STATUS & IDOR ---")
        # Eng A1 updates schedule remarks
        res_rem = client.patch(f"/api/engineer/me/schedules/{sch_a1.schedule_id}/comments", json={"remarks": "Awaiting travel visa approval"}, headers=headers_eng_a1)
        assert res_rem.status_code == 200
        assert res_rem.json()["comment_status"] == "UNADDRESSED"
        print("[OK] Engineer comment created with status UNADDRESSED.")

        # Eng A2 attempts to change Eng A1 schedule comment status (TEST K)
        res_rem_idor = client.patch(f"/api/schedules/{sch_a1.schedule_id}/comments/status", json={"comment_status": "ADDRESSED"}, headers=headers_eng_a2)
        assert res_rem_idor.status_code == 403, f"Expected 403 Forbidden, got {res_rem_idor.status_code}"
        print("[OK] Engineer A2 blocked from changing Engineer A1 comment status (403 Forbidden).")

        # Manager A marks comment ADDRESSED (TEST J)
        res_rem_mgr = client.patch(f"/api/schedules/{sch_a1.schedule_id}/comments/status", json={"comment_status": "ADDRESSED"}, headers=headers_mgr_a)
        assert res_rem_mgr.status_code == 200
        assert res_rem_mgr.json()["comment_status"] == "ADDRESSED"
        print("[OK] Manager A marked comment status as ADDRESSED.")

        print("\n=============================================================")
        print("ALL ORMP v2.0 INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY!")
        print("=============================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_v2_security_tests()
