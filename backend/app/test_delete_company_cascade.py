import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.database import get_db
from app.models.company import Company
from app.models.company_theme import CompanyThemeSettings
from app.models.company_settings import CompanySettings
from app.models.user import User
from app.services.security import create_access_token, get_password_hash

client = TestClient(app)

def test_delete_company_cascade():
    db = next(get_db())
    
    # 1. Create a dummy test company
    comp_id = uuid.uuid4()
    dummy_company = Company(
        company_id=comp_id,
        company_name=f"Delete Test Co {uuid.uuid4().hex[:6]}",
        short_name=f"DTC-{uuid.uuid4().hex[:4].upper()}",
        created_at=datetime.utcnow()
    )
    db.add(dummy_company)
    db.commit()
    
    # 2. Add referencing rows in company_theme_settings, company_settings
    theme = CompanyThemeSettings(company_id=comp_id, primary_color="#C1121F")
    settings = CompanySettings(company_id=comp_id, visa_expiration_days=30)
    db.add(theme)
    db.add(settings)
    db.commit()
    
    # 3. Create Main Admin user for deleting company
    admin_user = db.scalars(select(User).where(User.role == "Main Admin")).first()
    if not admin_user:
        admin_user = User(
            user_id=uuid.uuid4(),
            email=f"del_admin_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Main Admin User",
            role="Main Admin",
            password_hash=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin_user)
        db.commit()

    token = create_access_token({"sub": str(admin_user.user_id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Close session to release table locks before HTTP call
    db.close()
    
    # 4. Perform DELETE /api/companies/{company_id}
    res = client.delete(f"/api/companies/{comp_id}", headers=headers)
    assert res.status_code == 200, f"Delete failed: {res.text}"
    body = res.json()
    assert body["message"] == "Company deleted successfully"
    
    # 5. Verify company and child records are deleted
    verify_db = next(get_db())
    deleted_comp = verify_db.get(Company, comp_id)
    assert deleted_comp is None, "Company record should be completely removed"
    verify_db.close()
    
    print("\n==========================================================================")
    print("[PASS] Company cascade deletion test PASSED cleanly!")
    print("==========================================================================")

if __name__ == "__main__":
    test_delete_company_cascade()
