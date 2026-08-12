import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.leave import LeaveResponse, LeaveUpdate
from app.services import leave_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leaves", tags=["leaves"])

@router.put("/{leave_id}", response_model=LeaveResponse)
def update_existing_leave(leave_id: UUID, leave_data: LeaveUpdate, db: Session = Depends(get_db)):
    """
    Update an existing leave record.
    """
    try:
        return leave_service.update_leave(db, leave_id, leave_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating leave record %s: %s", str(leave_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update leave record in database"
        )

@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_leave(leave_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing leave record.
    """
    try:
        leave_service.delete_leave(db, leave_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting leave record %s: %s", str(leave_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete leave record from database"
        )
