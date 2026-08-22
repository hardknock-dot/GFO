import sys
import os
sys.path.insert(0, r'd:\GFO\backend')

import logging
from sqlalchemy import text
from app.database import Base, engine, SessionLocal
from app.models.user_company import UserCompany
from app.models.user import User

logger = logging.getLogger(__name__)

def migrate_multitenant():
    print("==================================================")
    print("MIGRATING MULTI-TENANT USER_COMPANIES JUNCTION TABLE")
    print("==================================================")

    # 1. Create user_companies table
    Base.metadata.create_all(bind=engine)
    print("[OK] user_companies table created or confirmed existing.")

    db = SessionLocal()
    try:
        # 2. Populate user_companies from existing users.company_id if not present
        users = db.query(User).all()
        added_count = 0
        for u in users:
            if u.company_id:
                existing = db.query(UserCompany).filter_by(user_id=u.user_id, company_id=u.company_id).first()
                if not existing:
                    uc = UserCompany(user_id=u.user_id, company_id=u.company_id)
                    db.add(uc)
                    added_count += 1
        db.commit()
        print(f"[OK] Migrated {added_count} initial user-company assignments into user_companies.")

        # Show summary
        uc_rows = db.query(UserCompany).all()
        print(f"[OK] Total user_companies relationships in database: {len(uc_rows)}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    migrate_multitenant()
