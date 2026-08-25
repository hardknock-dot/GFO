from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.user import User
from sqlalchemy import text

def run_cleanup():
    db = SessionLocal()

    core_ids = [
        '11b9d863-b83c-4af3-8db5-b6e773f78235',
        'f81bd16c-2f63-4818-a653-7486fe3f45ec',
        '34d51cd0-fb63-4684-96a3-662477298678'
    ]
    default_company_id = '11b9d863-b83c-4af3-8db5-b6e773f78235'

    engineers = db.query(Engineer).all()
    for eng in engineers:
        if str(eng.company_id) not in core_ids:
            eng.company_id = default_company_id

    users = db.query(User).all()
    for u in users:
        if str(u.company_id) not in core_ids:
            u.company_id = default_company_id

    db.commit()

    db.execute(text("UPDATE bulk_uploads SET company_id = '11b9d863-b83c-4af3-8db5-b6e773f78235' WHERE company_id NOT IN ('11b9d863-b83c-4af3-8db5-b6e773f78235', 'f81bd16c-2f63-4818-a653-7486fe3f45ec', '34d51cd0-fb63-4684-96a3-662477298678');"))
    db.execute(text("UPDATE audit_logs SET company_id = '11b9d863-b83c-4af3-8db5-b6e773f78235' WHERE company_id NOT IN ('11b9d863-b83c-4af3-8db5-b6e773f78235', 'f81bd16c-2f63-4818-a653-7486fe3f45ec', '34d51cd0-fb63-4684-96a3-662477298678');"))
    db.execute(text("DELETE FROM user_companies WHERE company_id NOT IN ('11b9d863-b83c-4af3-8db5-b6e773f78235', 'f81bd16c-2f63-4818-a653-7486fe3f45ec', '34d51cd0-fb63-4684-96a3-662477298678');"))
    db.execute(text("DELETE FROM companies WHERE company_id NOT IN ('11b9d863-b83c-4af3-8db5-b6e773f78235', 'f81bd16c-2f63-4818-a653-7486fe3f45ec', '34d51cd0-fb63-4684-96a3-662477298678');"))
    db.commit()

    remaining = db.query(Company).all()
    print('SUCCESS: Remaining Companies count:', len(remaining))
    for c in remaining:
        print(' -', c.company_id, c.company_name)

    db.close()

if __name__ == '__main__':
    run_cleanup()
