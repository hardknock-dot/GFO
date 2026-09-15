import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.services.security import create_access_token

def test_company_theme_api():
    db = SessionLocal()
    try:
        # Find Main Admin user
        admin_user = db.query(User).filter(User.role.in_(["Main Admin", "Global Admin", "Company Admin", "Manager"])).first()
        if not admin_user:
            admin_user = db.query(User).first()
            
        print(f"Testing with Admin User: {admin_user.email}, Role: {admin_user.role}")
        
        token = create_access_token(data={"sub": str(admin_user.user_id)})
        headers = {"Authorization": f"Bearer {token}"}
        
        client = TestClient(app)
        
        # 1. GET /api/company-theme
        res = client.get("/api/company-theme", headers=headers)
        print(f"GET /api/company-theme status: {res.status_code}")
        assert res.status_code == 200, res.text
        data = res.json()
        print("Fetched company theme:", data)
        assert "company_id" in data
        assert "company_theme_id" in data
        
        # 2. PUT /api/company-theme with valid hex values
        update_payload = {
            "primary_color": "#C1121F",
            "secondary_color": "#8DA7BE",
            "accent_color": "#741B21",
            "background_color": "#FDEDEE",
            "surface_color": "#2B3D41",
            "text_color": "#FFFFFF"
        }
        res_put = client.put("/api/company-theme", json=update_payload, headers=headers)
        print(f"PUT /api/company-theme status: {res_put.status_code}")
        assert res_put.status_code == 200, res_put.text
        put_data = res_put.json()
        print("Updated company theme response:", put_data)
        assert put_data["color_1"] == "#C1121F" or put_data["primary_color"] == "#C1121F"
        
        # 3. Reject Invalid Hex Values
        invalid_payload = {
            "primary_color": "#INVALID"
        }
        res_inv = client.put("/api/company-theme", json=invalid_payload, headers=headers)
        print(f"Invalid Hex PUT status: {res_inv.status_code}")
        assert res_inv.status_code in (400, 422), res_inv.text
        print("Successfully rejected invalid hex color format!")

        # 4. Non-admin User Authorization Rejection
        non_admin = db.query(User).filter(User.role.in_(["Field Engineer", "Engineer", "Viewer"])).first()
        if non_admin:
            non_admin_token = create_access_token(data={"sub": str(non_admin.user_id)})
            non_admin_headers = {"Authorization": f"Bearer {non_admin_token}"}
            
            res_no_auth = client.put("/api/company-theme", json=update_payload, headers=non_admin_headers)
            print(f"Non-admin PUT status: {res_no_auth.status_code}")
            assert res_no_auth.status_code == 403, res_no_auth.text
            print("Successfully enforced 403 Forbidden for non-admin update request!")
            
        print("ALL BACKEND COMPANY THEME API TESTS PASSED CLEANLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_company_theme_api()
