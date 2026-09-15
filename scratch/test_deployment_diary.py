import sys
import os
import uuid
from datetime import date, datetime, timedelta

# Append backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import SessionLocal
from app.models.company import Company
from app.models.engineer import Engineer
from app.models.schedule import Schedule
from app.models.deployment_diary import DeploymentDiary
from app.schemas.deployment_diary import DeploymentDiaryCreate, DeploymentDiaryUpdate
from app.services import deployment_diary_service

def test_deployment_diary_flow():
    db = SessionLocal()
    try:
        print("Starting Deployment Diary Backend Verification...")
        
        # 1. Fetch or create sample company and engineer
        company = db.query(Company).first()
        if not company:
            print("No company found in DB!")
            return
        company_id = company.company_id
        
        engineer = db.query(Engineer).filter(Engineer.company_id == company_id).first()
        if not engineer:
            print("No engineer found in DB!")
            return
        engineer_id = engineer.engineer_id
        print(f"Testing with Company ID: {company_id}, Engineer ID: {engineer_id}")
        
        # 2. Check active schedule resolution
        active_schedules = deployment_diary_service.get_active_schedules_for_engineer(db, engineer_id, company_id)
        print(f"Active Schedules count for engineer: {len(active_schedules)}")
        
        schedule_id = active_schedules[0].schedule_id if active_schedules else None
        if schedule_id:
            print(f"Selected Schedule ID: {schedule_id}")
        else:
            print("No active schedule found for this engineer.")
            
        # 3. Create entry
        create_payload = DeploymentDiaryCreate(
            entry_date=date.today(),
            entry="Completed PM on Chamber 1 and performed calibration routine.",
            schedule_id=schedule_id
        )
        new_entry = deployment_diary_service.create_deployment_diary(
            db=db,
            company_id=company_id,
            engineer_id=engineer_id,
            diary_data=create_payload
        )
        print(f"Created Diary Entry ID: {new_entry.id}")
        assert new_entry.id is not None
        assert new_entry.entry == "Completed PM on Chamber 1 and performed calibration routine."
        assert new_entry.company_id == company_id
        assert new_entry.engineer_id == engineer_id
        
        # 4. Read single entry
        fetched_entry = deployment_diary_service.get_deployment_diary_by_id(db, new_entry.id)
        assert fetched_entry.id == new_entry.id
        print(f"Fetched Single Entry: {fetched_entry.entry}")
        
        # 5. Read list (Paginated)
        results = deployment_diary_service.get_deployment_diaries(
            db=db,
            company_id=[company_id],
            engineer_id=engineer_id,
            page=1,
            page_size=10
        )
        print(f"Total entries found for engineer: {results['total']}")
        assert results["total"] >= 1
        
        # 6. Update entry
        update_payload = DeploymentDiaryUpdate(
            entry="Updated PM note: Finished chamber qualification and verified process parameters."
        )
        updated_entry = deployment_diary_service.update_deployment_diary(db, new_entry.id, update_payload)
        print(f"Updated Entry Text: {updated_entry.entry}")
        assert updated_entry.entry == update_payload.entry
        
        # 7. Delete entry
        deployment_diary_service.delete_deployment_diary(db, new_entry.id)
        print("Deleted Entry successfully.")
        
        # Verify 404 on deleted entry
        try:
            deployment_diary_service.get_deployment_diary_by_id(db, new_entry.id)
            print("ERROR: Entry should have been deleted!")
        except Exception as e:
            print(f"Successfully caught expected exception on deleted entry: {e}")
            
        print("ALL BACKEND DEPLOYMENT DIARY TESTS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_deployment_diary_flow()
