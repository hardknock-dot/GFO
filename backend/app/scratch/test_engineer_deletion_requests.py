import sys
import uuid
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.engineer import Engineer
from app.models.engineer_deletion_request import EngineerDeletionRequest
from app.services.security import create_access_token

def test_engineer_deletion_requests_flow():
    client = TestClient(app)
    db = SessionLocal()

    try:
        print("\n=== STARTING ENGINEER DELETION REQUESTS TEST SUITE ===")
        
        # 1. Setup Test Companies & Users
        company_id_1 = uuid.UUID("11b9d863-b83c-4af3-8db5-b6e773f78235")
        company_1 = db.get(Company, company_id_1)
        if not company_1:
            company_1 = Company(
                company_id=company_id_1,
                company_name="Test Target Company",
            short_name=f"TTC_{uuid.uuid4().hex[:4]}",
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(company_1)
            db.commit()

        company_id_2 = uuid.uuid4()
        company_2 = Company(
            company_id=company_id_2,
            company_name="Other Company",
            short_name=f"OTH_{uuid.uuid4().hex[:4]}",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(company_2)
        db.commit()

        # Admin user for Company 1
        admin_user_1 = User(
            user_id=uuid.uuid4(),
            email=f"admin1_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Admin Comp1",
            password_hash="testpass",
            role="Main Admin",
            company_id=company_id_1,
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(admin_user_1)

        # Manager for Company 2
        mgr_user_2 = User(
            user_id=uuid.uuid4(),
            email=f"mgr2_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Manager Comp2",
            password_hash="testpass",
            role="Manager",
            company_id=company_id_2,
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(mgr_user_2)
        db.commit()

        headers_comp1 = {"Authorization": f"Bearer {create_access_token({'sub': str(admin_user_1.user_id)})}"}
        headers_comp2 = {"Authorization": f"Bearer {create_access_token({'sub': str(mgr_user_2.user_id)})}"}

        # 2. Setup Test Engineers for Company 1
        eng1_id = uuid.uuid4()
        eng1 = Engineer(
            engineer_id=eng1_id,
            company_id=company_id_1,
            engineer_name="Active Eng 1",
            orbit_id=f"ORB-{uuid.uuid4().hex[:6]}",
            status="Active"
        )
        db.add(eng1)

        eng2_id = uuid.uuid4()
        eng2 = Engineer(
            engineer_id=eng2_id,
            company_id=company_id_1,
            engineer_name="Eng To Delete 2",
            orbit_id=f"ORB-{uuid.uuid4().hex[:6]}",
            status="Active"
        )
        db.add(eng2)

        # Pre-existing deletion request with NULL engineer_id (simulating historical/deleted engineer request)
        null_eng_req_id = uuid.uuid4()
        null_eng_req = EngineerDeletionRequest(
            request_id=null_eng_req_id,
            engineer_id=None,
            requested_by=admin_user_1.user_id,
            company_id=company_id_1,
            reason="Historical approved request",
            status="APPROVED",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(null_eng_req)
        db.commit()

        print("[OK] Test database fixtures seeded.")

        # 3. TEST: GET /api/engineer-deletion-requests for Company 1
        print("\n--- TEST 1: GET /api/engineer-deletion-requests with NULL engineer_id in DB ---")
        res1 = client.get(f"/api/engineer-deletion-requests?company_id={company_id_1}", headers=headers_comp1)
        assert res1.status_code == 200, f"Expected 200 OK, got {res1.status_code}: {res1.text}"
        data1 = res1.json()
        print(f"[OK] GET endpoint returned HTTP 200 OK with {len(data1)} records.")
        
        # Verify the record with NULL engineer_id is present and formatted safely
        null_rec = next((r for r in data1 if r["request_id"] == str(null_eng_req_id)), None)
        assert null_rec is not None, "NULL engineer_id request must be present in response"
        assert null_rec["engineer_id"] is None, "engineer_id must safely be None"
        assert null_rec["engineer_name"] == "Deleted Engineer", f"Expected 'Deleted Engineer', got {null_rec['engineer_name']}"
        assert null_rec["orbit_id"] == "N/A", f"Expected 'N/A', got {null_rec['orbit_id']}"
        print("[OK] Historical record with NULL engineer_id handled safely without 500 error.")

        # 4. TEST: Create deletion request for eng1
        print("\n--- TEST 2: CREATE DELETION REQUEST ---")
        res_create = client.post("/api/engineer-deletion-requests", json={
            "engineer_id": str(eng1_id),
            "reason": "Test deletion request for Eng 1"
        }, headers=headers_comp1)
        assert res_create.status_code == 201, f"Expected 201 Created, got {res_create.status_code}: {res_create.text}"
        req1_data = res_create.json()
        assert req1_data["engineer_id"] == str(eng1_id)
        assert req1_data["status"] == "PENDING"
        assert req1_data["engineer_name"] == "Active Eng 1"
        req1_id = req1_data["request_id"]
        print("[OK] Valid deletion request created with non-null engineer_id.")

        # 5. TEST: Company Isolation / IDOR
        print("\n--- TEST 3: COMPANY ISOLATION (IDOR PROTECTION) ---")
        res_idor = client.get(f"/api/engineer-deletion-requests?company_id={company_id_1}", headers=headers_comp2)
        assert res_idor.status_code == 403, f"Expected 403 Forbidden for Manager from Comp2, got {res_idor.status_code}"
        print("[OK] Multi-tenant isolation verified: Manager from Company 2 cannot view Company 1 deletion requests.")

        # 6. TEST: Deletion approval workflow & transition of engineer_id to NULL
        print("\n--- TEST 4: APPROVE DELETION REQUEST & NULL ENGINEER_ID HANDLING ---")
        res_approve = client.post(f"/api/engineer-deletion-requests/{req1_id}/approve", headers=headers_comp1)
        assert res_approve.status_code == 200, f"Expected 200 OK on approval, got {res_approve.status_code}: {res_approve.text}"
        app_data = res_approve.json()
        assert app_data["status"] == "APPROVED"
        print("[OK] Deletion request approved successfully.")

        # Check DB to confirm engineer row was deleted and request engineer_id is now NULL
        db.expire_all()
        assert db.get(Engineer, eng1_id) is None, "Engineer record should be deleted from DB"
        approved_req = db.get(EngineerDeletionRequest, uuid.UUID(req1_id))
        assert approved_req.engineer_id is None, "Approved request engineer_id should be NULL"
        print("[OK] Engineer deleted and deletion request engineer_id safely set to NULL in DB.")

        # Fetch deletion requests again to ensure HTTP 200 OK
        res_list_after = client.get(f"/api/engineer-deletion-requests?company_id={company_id_1}", headers=headers_comp1)
        assert res_list_after.status_code == 200, f"Expected 200 OK, got {res_list_after.status_code}"
        list_after_data = res_list_after.json()
        approved_in_list = next((r for r in list_after_data if r["request_id"] == req1_id), None)
        assert approved_in_list is not None
        assert approved_in_list["engineer_id"] is None
        assert approved_in_list["engineer_name"] == "Deleted Engineer"
        print("[OK] Listing API returned 200 OK after request approval.")

        # 7. TEST: Rejection workflow
        print("\n--- TEST 5: REJECT DELETION REQUEST WORKFLOW ---")
        # Create deletion request for eng2
        res_create2 = client.post("/api/engineer-deletion-requests", json={
            "engineer_id": str(eng2_id),
            "reason": "Test deletion request for Eng 2"
        }, headers=headers_comp1)
        assert res_create2.status_code == 201
        req2_id = res_create2.json()["request_id"]

        # Reject it
        res_reject = client.post(f"/api/engineer-deletion-requests/{req2_id}/reject", json={
            "review_comment": "Rejecting for testing"
        }, headers=headers_comp1)
        assert res_reject.status_code == 200
        rej_data = res_reject.json()
        assert rej_data["status"] == "REJECTED"
        assert rej_data["engineer_id"] == str(eng2_id)
        assert db.get(Engineer, eng2_id) is not None, "Engineer 2 must remain in DB after rejection"
        print("[OK] Deletion request rejection workflow verified.")

        print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

    finally:
        db.close()

if __name__ == "__main__":
    test_engineer_deletion_requests_flow()
