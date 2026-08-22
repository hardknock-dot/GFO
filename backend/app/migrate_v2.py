import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
import app.models  # Ensures all models are registered with Base

def run_migrations():
    print("Running ORMP v2.0 database migrations...")
    Base.metadata.create_all(bind=engine)
    
    with engine.begin() as conn:
        # Create audit_logs table if not created by metadata
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                audit_id UUID PRIMARY KEY,
                user_id UUID NOT NULL,
                company_id UUID NULL,
                action VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id UUID NULL,
                description TEXT NULL,
                old_values JSONB NULL,
                new_values JSONB NULL,
                ip_address VARCHAR(45) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Create delete_requests table if not created by metadata
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS delete_requests (
                request_id UUID PRIMARY KEY,
                requested_by UUID NOT NULL,
                company_id UUID NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id UUID NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
                reviewed_by UUID NULL,
                reviewed_at TIMESTAMP NULL,
                review_comment TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Indexes for audit_logs
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);"))

        # Indexes for delete_requests
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_delete_requests_company_id ON delete_requests(company_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_delete_requests_status ON delete_requests(status);"))
        
        # Migrate role values in users table safely
        res_ga = conn.execute(text("UPDATE users SET role = 'Main Admin' WHERE role = 'Global Admin';"))
        res_ca = conn.execute(text("UPDATE users SET role = 'Manager' WHERE role = 'Company Admin';"))
        res_rm = conn.execute(text("UPDATE users SET role = 'Ops Executive' WHERE role = 'Resource Manager';"))
        res_fe = conn.execute(text("UPDATE users SET role = 'Engineer' WHERE role = 'Field Engineer';"))
        
        print(f"Role Migration Summary:")
        print(f" - Global Admin -> Main Admin: {res_ga.rowcount} rows updated")
        print(f" - Company Admin -> Manager: {res_ca.rowcount} rows updated")
        print(f" - Resource Manager -> Ops Executive: {res_rm.rowcount} rows updated")
        print(f" - Field Engineer -> Engineer: {res_fe.rowcount} rows updated")

    print("ORMP v2.0 database migration complete!")

if __name__ == "__main__":
    run_migrations()
