import sys
import os
from sqlalchemy import text

# Add parent directory to sys.path so app module can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

def migrate():
    with engine.begin() as conn:
        print("Running database migrations for Engineer Self-Service Portal...")
        
        # 1. users.engineer_id
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS engineer_id UUID NULL REFERENCES engineers(engineer_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_engineer_id ON users(engineer_id);
        """))
        print("Migrated users.engineer_id")

        # 2. schedules.owner_id
        conn.execute(text("""
            ALTER TABLE schedules 
            ADD COLUMN IF NOT EXISTS owner_id UUID NULL REFERENCES users(user_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_schedules_owner_id ON schedules(owner_id);
        """))
        print("Migrated schedules.owner_id")

        # 3. visa_details.owner_id & comments
        conn.execute(text("""
            ALTER TABLE visa_details 
            ADD COLUMN IF NOT EXISTS owner_id UUID NULL REFERENCES users(user_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_visa_details_owner_id ON visa_details(owner_id);
        """))
        conn.execute(text("""
            ALTER TABLE visa_details 
            ADD COLUMN IF NOT EXISTS comments TEXT NULL;
        """))
        print("Migrated visa_details.owner_id and visa_details.comments")

    print("All migrations completed successfully!")

if __name__ == "__main__":
    migrate()
