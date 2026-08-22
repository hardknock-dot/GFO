from sqlalchemy import text
from app.database import SessionLocal

ALLOWED_COMPANY_IDS = [
    '11b9d863-b83c-4af3-8db5-b6e773f78235', # LAM Research
    'f81bd16c-2f63-4818-a653-7486fe3f45ec', # Axcelis Technologies
    '34d51cd0-fb63-4684-96a3-662477298678', # Vishay Semiconductor
]

DEFAULT_COMPANY_ID = '11b9d863-b83c-4af3-8db5-b6e773f78235' # LAM Research

def clean_database():
    db = SessionLocal()
    try:
        print("Starting tenant cleanup to restrict companies to ONLY LAM, Axcelis, and Vishay...")
        
        # 1. Reassign Engineers
        res_eng = db.execute(
            text("UPDATE engineers SET company_id = :def_id WHERE company_id NOT IN (:c1, :c2, :c3)"),
            {"def_id": DEFAULT_COMPANY_ID, "c1": ALLOWED_COMPANY_IDS[0], "c2": ALLOWED_COMPANY_IDS[1], "c3": ALLOWED_COMPANY_IDS[2]}
        )
        print(f"Reassigned {res_eng.rowcount} engineers to default company.")

        # 2. Reassign Users
        res_usr = db.execute(
            text("UPDATE users SET company_id = :def_id WHERE company_id NOT IN (:c1, :c2, :c3)"),
            {"def_id": DEFAULT_COMPANY_ID, "c1": ALLOWED_COMPANY_IDS[0], "c2": ALLOWED_COMPANY_IDS[1], "c3": ALLOWED_COMPANY_IDS[2]}
        )
        print(f"Reassigned {res_usr.rowcount} users to default company.")

        # 3. Reassign Bulk Uploads
        res_bu = db.execute(
            text("UPDATE bulk_uploads SET company_id = :def_id WHERE company_id NOT IN (:c1, :c2, :c3)"),
            {"def_id": DEFAULT_COMPANY_ID, "c1": ALLOWED_COMPANY_IDS[0], "c2": ALLOWED_COMPANY_IDS[1], "c3": ALLOWED_COMPANY_IDS[2]}
        )
        print(f"Reassigned {res_bu.rowcount} bulk upload records.")

        # 4. Reassign Delete Requests
        res_dr = db.execute(
            text("UPDATE delete_requests SET company_id = :def_id WHERE company_id NOT IN (:c1, :c2, :c3)"),
            {"def_id": DEFAULT_COMPANY_ID, "c1": ALLOWED_COMPANY_IDS[0], "c2": ALLOWED_COMPANY_IDS[1], "c3": ALLOWED_COMPANY_IDS[2]}
        )
        print(f"Reassigned {res_dr.rowcount} delete request records.")

        # 5. Reassign Audit Logs
        res_al = db.execute(
            text("UPDATE audit_logs SET company_id = :def_id WHERE company_id IS NOT NULL AND company_id NOT IN (:c1, :c2, :c3)"),
            {"def_id": DEFAULT_COMPANY_ID, "c1": ALLOWED_COMPANY_IDS[0], "c2": ALLOWED_COMPANY_IDS[1], "c3": ALLOWED_COMPANY_IDS[2]}
        )
        print(f"Reassigned {res_al.rowcount} audit log records.")

        # 6. Delete extraneous companies from companies table
        res_comp = db.execute(
            text("DELETE FROM companies WHERE company_id NOT IN (:c1, :c2, :c3)"),
            {"c1": ALLOWED_COMPANY_IDS[0], "c2": ALLOWED_COMPANY_IDS[1], "c3": ALLOWED_COMPANY_IDS[2]}
        )
        print(f"Deleted {res_comp.rowcount} non-target companies from database.")

        db.commit()
        print("Tenant cleanup completed successfully! Remaining active companies:")
        rows = db.execute(text("SELECT company_id, company_name, short_name FROM companies")).all()
        for r in rows:
            print(f" - {r[0]} | {r[1]} ({r[2]})")

    except Exception as e:
        db.rollback()
        print(f"Error cleaning tenants: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
