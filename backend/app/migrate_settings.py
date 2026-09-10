from datetime import datetime
import uuid
from sqlalchemy import text, select
from app.database import engine, SessionLocal
from app.models.company import Company
from app.models.company_settings import CompanySettings
from app.models.user import User

def run_migration():
    print("Running settings migration...")
    
    # 1. Create table and add columns
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS company_settings (
                setting_id UUID PRIMARY KEY,
                company_id UUID NOT NULL UNIQUE REFERENCES companies(company_id) ON DELETE CASCADE,
                visa_expiration_days INTEGER NOT NULL DEFAULT 30,
                visa_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                deployment_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                travel_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                leave_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                missed_schedule_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                operational_remark_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                performance_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
            );
        """))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS goes_by VARCHAR(100);"))
        print("Schema update completed successfully.")

    # 2. Seed defaults for any companies missing settings
    db = SessionLocal()
    try:
        companies = db.scalars(select(Company)).all()
        for comp in companies:
            existing = db.scalar(select(CompanySettings).where(CompanySettings.company_id == comp.company_id))
            if not existing:
                new_setting = CompanySettings(
                    setting_id=uuid.uuid4(),
                    company_id=comp.company_id,
                    visa_expiration_days=30,
                    visa_alerts_enabled=True,
                    deployment_alerts_enabled=True,
                    travel_alerts_enabled=True,
                    leave_alerts_enabled=True,
                    missed_schedule_alerts_enabled=True,
                    operational_remark_alerts_enabled=True,
                    performance_alerts_enabled=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(new_setting)
                print(f"Created default settings for company: {comp.company_name} ({comp.company_id})")
        db.commit()
        print("Default settings verified for all companies.")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
