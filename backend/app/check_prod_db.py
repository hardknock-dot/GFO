import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import httpx
from sqlalchemy import create_engine, text
from app.config import settings

def run_diagnostic():
    print("==================================================")
    print("CHECKING DATABASE CONFIGURATION & SUPABASE TARGET")
    print("==================================================")
    
    # Hide password from URL
    url = settings.DATABASE_URL
    safe_url = url
    if "@" in url:
        user_part, host_part = url.split("@", 1)
        scheme_user = user_part.split(":", 2)[0] if ":" in user_part else user_part
        safe_url = f"{scheme_user}:***@{host_part}"
    
    print(f"DATABASE_URL (Sanitized): {safe_url}")
    
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        row = conn.execute(text("SELECT inet_server_addr(), inet_server_port(), current_database(), current_user, version()")).fetchone()
        server_addr = row[0] if row else "N/A"
        server_port = row[1] if row else "N/A"
        db_name = row[2] if row else "N/A"
        db_user = row[3] if row else "N/A"
        version = row[4] if row else "N/A"
        
        print("\nLOCAL DATABASE CONNECTION DETAILS:")
        print(f"  Host / Server Address: {engine.url.host} ({server_addr}:{server_port})")
        print(f"  Database Name: {db_name}")
        print(f"  Database User: {db_user}")
        print(f"  PostgreSQL Version: {version}")
        print(f"  Is Supabase: {'supabase' in str(engine.url.host).lower() or 'supabase' in str(server_addr).lower()}")

        # Check existing records count in DB
        eng_count = conn.execute(text("SELECT COUNT(*) FROM engineers")).scalar()
        sch_count = conn.execute(text("SELECT COUNT(*) FROM schedules")).scalar()
        perf_count = conn.execute(text("SELECT COUNT(*) FROM performances")).scalar()
        
        print("\nDATABASE RECORD COUNTS:")
        print(f"  Engineers: {eng_count}")
        print(f"  Schedules: {sch_count}")
        print(f"  Performances: {perf_count}")

if __name__ == "__main__":
    run_diagnostic()
