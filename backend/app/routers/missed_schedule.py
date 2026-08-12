import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.missed_schedule import MissedScheduleResponse, MissedScheduleUpdate
from app.services import missed_schedule_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/missed-schedules", tags=["missed-schedules"])

@router.put("/{missed_schedule_id}", response_model=MissedScheduleResponse)
def update_existing_missed_schedule(missed_schedule_id: UUID, missed_schedule_data: MissedScheduleUpdate, db: Session = Depends(get_db)):
    """
    Update an existing missed schedule record.
    """
    try:
        return missed_schedule_service.update_missed_schedule(db, missed_schedule_id, missed_schedule_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating missed schedule record %s: %s", str(missed_schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update missed schedule record in database"
        )

@router.delete("/{missed_schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_missed_schedule(missed_schedule_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing missed schedule record.
    """
    try:
        missed_schedule_service.delete_missed_schedule(db, missed_schedule_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting missed schedule record %s: %s", str(missed_schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete missed schedule record from database"
        )
