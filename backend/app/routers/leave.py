import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.schemas.leave import LeaveResponse, LeaveUpdate
from app.services import leave_service
from app.services.auth_service import get_current_user, get_leave_and_verify, enforce_write_permission, enforce_delete_permission
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leaves", tags=["leaves"], dependencies=[Depends(get_current_user)])

@router.put("/{leave_id}", response_model=LeaveResponse)
def update_existing_leave(
    leave_id: UUID,
    leave_data: LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        lv = get_leave_and_verify(db, leave_id, current_user)
        old_dict = object_to_dict(lv)
        updated = leave_service.update_leave(db, leave_id, leave_data)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="UPDATE",
            entity_type="Leave",
            entity_id=leave_id,
            description=f"Leave record updated ({leave_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated)
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating leave record %s: %s", str(leave_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update leave record in database"
        )

@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_leave(
    leave_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
        lv = get_leave_and_verify(db, leave_id, current_user)
        old_dict = object_to_dict(lv)
        leave_service.delete_leave(db, leave_id)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="Leave",
            entity_id=leave_id,
            description=f"Leave record deleted ({leave_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting leave record %s: %s", str(leave_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete leave record from database"
        )
