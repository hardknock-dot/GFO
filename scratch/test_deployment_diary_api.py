import sys
import os
import uuid
from datetime import date, datetime

# Append backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.engineer import Engineer
from app.models.company import Company
from app.services.security import create_access_token

def test_api_endpoints():
    db = SessionLocal()
    try:
        # Find test engineer user
        eng_user = db.query(User).filter(User.role == 'Field Engineer').first()
        if not eng_user:
            eng_user = db.query(User).filter(User.engineer_id.isnot(None)).first()
            
        if not eng_user:
            print("No test engineer user found in DB!")
            return
            
        print(f"Testing API with User Email: {eng_user.email}, Role: {eng_user.role}")
        
        token = create_access_token(data={"sub": str(eng_user.user_id)})
        headers = {"Authorization": f"Bearer {token}"}
        
        client = TestClient(app)
        
        # 1. GET /api/deployment-diary
        res = client.get("/api/deployment-diary", headers=headers)
        print(f"GET /api/deployment-diary status: {res.status_code}")
        assert res.status_code == 200, res.text
        data = res.json()
        assert "items text" not in data
        assert "total" in data
        
        # 2. POST /api/deployment-diary (Create Today's Entry)
        create_payload = {
            "entry_date": str(date.today()),
            "entry": "Integration Test Entry 1: Calibrated tool optics and performed baseline test."
        }
        res_post = client.post("/api/deployment-diary", json=create_payload, headers=headers)
        print(f"POST /api/deployment-diary status: {res_post.status_code}")
        assert res_post.status_code == 201, res_post.text
        created_entry = res_post.json()
        entry_id = created_entry["id"]
        assert created_entry["entry"] == create_payload["entry"]
        assert created_entry["company_id"] is not None
        assert created_entry["engineer_id"] is not None
        
        # 3. POST second entry on the same day (Verify multiple entries allowed)
        create_payload_2 = {
            "entry_date": str(date.today()),
            "entry": "Integration Test Entry 2: Customer requested secondary process check on Chamber B."
        }
        res_post_2 = client.post("/api/deployment-diary", json=create_payload_2, headers=headers)
        print(f"POST second entry status: {res_post_2.status_code}")
        assert res_post_2.status_code == 201, res_post_2.text
        entry_id_2 = res_post_2.json()["id"]
        
        # 4. GET /api/deployment-diary/{id}
        res_get_single = client.get(f"/api/deployment-diary/{entry_id}", headers=headers)
        print(f"GET /api/deployment-diary/{entry_id} status: {res_get_single.status_code}")
        assert res_get_single.status_code == 200, res_get_single.text
        assert res_get_single.json()["id"] == entry_id
        
        # 5. PUT /api/deployment-diary/{id}
        update_payload = {
            "entry": "Updated Entry 1: Calibrated tool optics, verified thermal stability and logged parameters."
        }
        res_put = client.put(f"/api/deployment-diary/{entry_id}", json=update_payload, headers=headers)
        print(f"PUT /api/deployment-diary/{entry_id} status: {res_put.status_code}")
        assert res_put.status_code == 200, res_put.text
        assert res_put.json()["entry"] == update_payload["entry"]
        
        # 6. Reject Empty Entry (422)
        res_empty = client.put(f"/api/deployment-diary/{entry_id}", json={"entry": "   "}, headers=headers)
        print(f"Empty entry PUT status: {res_empty.status_code}")
        assert res_empty.status_code in (400, 422), res_empty.text
        
        # 7. DELETE /api/deployment-diary/{id}
        res_del_1 = client.delete(f"/api/deployment-diary/{entry_id}", headers=headers)
        print(f"DELETE entry 1 status: {res_del_1.status_code}")
        assert res_del_1.status_code == 204
        
        res_del_2 = client.delete(f"/api/deployment-diary/{entry_id_2}", headers=headers)
        print(f"DELETE entry 2 status: {res_del_2.status_code}")
        assert res_del_2.status_code == 204
        
        # 8. Verify Nonexistent Entry 404
        res_404 = client.get(f"/api/deployment-diary/{entry_id}", headers=headers)
        print(f"GET deleted entry status: {res_404.status_code}")
        assert res_404.status_code == 404
        
        print("ALL FASTAPI API INTEGRATION TESTS PASSED CLEANLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_api_endpoints()
