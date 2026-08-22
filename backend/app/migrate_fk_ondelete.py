import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

def fix_fk_constraints():
    with engine.begin() as conn:
        print("Updating foreign key constraints to ON DELETE SET NULL...")
        
        # 1. Schedules
        conn.execute(text("""
            ALTER TABLE schedules 
            DROP CONSTRAINT IF EXISTS schedules_owner_id_fkey;
        """))
        conn.execute(text("""
            ALTER TABLE schedules 
            ADD CONSTRAINT schedules_owner_id_fkey 
            FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE SET NULL;
        """))
        print("Updated schedules_owner_id_fkey constraint.")

        # 2. Visa Details
        conn.execute(text("""
            ALTER TABLE visa_details 
            DROP CONSTRAINT IF EXISTS visa_details_owner_id_fkey;
        """))
        conn.execute(text("""
            ALTER TABLE visa_details 
            ADD CONSTRAINT visa_details_owner_id_fkey 
            FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE SET NULL;
        """))
        print("Updated visa_details_owner_id_fkey constraint.")

    print("Foreign key constraints updated successfully!")

if __name__ == "__main__":
    fix_fk_constraints()
