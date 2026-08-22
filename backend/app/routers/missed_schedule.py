import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.schemas.missed_schedule import MissedScheduleResponse, MissedScheduleUpdate
from app.services import missed_schedule_service
from app.services.auth_service import get_current_user, get_missed_schedule_and_verify, enforce_write_permission, enforce_delete_permission
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/missed-schedules", tags=["missed-schedules"], dependencies=[Depends(get_current_user)])

@router.put("/{missed_schedule_id}", response_model=MissedScheduleResponse)
def update_existing_missed_schedule(
    missed_schedule_id: UUID,
    missed_schedule_data: MissedScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        ms = get_missed_schedule_and_verify(db, missed_schedule_id, current_user)
        old_dict = object_to_dict(ms)
        updated = missed_schedule_service.update_missed_schedule(db, missed_schedule_id, missed_schedule_data)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="UPDATE",
            entity_type="MissedSchedule",
            entity_id=missed_schedule_id,
            description=f"Missed schedule updated ({missed_schedule_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated)
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating missed schedule record %s: %s", str(missed_schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update missed schedule record in database"
        )

@router.delete("/{missed_schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_missed_schedule(
    missed_schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
        ms = get_missed_schedule_and_verify(db, missed_schedule_id, current_user)
        old_dict = object_to_dict(ms)
        missed_schedule_service.delete_missed_schedule(db, missed_schedule_id)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="MissedSchedule",
            entity_id=missed_schedule_id,
            description=f"Missed schedule deleted ({missed_schedule_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting missed schedule record %s: %s", str(missed_schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete missed schedule record from database"
        )
