import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.visa import VisaResponse, VisaUpdate
from app.services import visa_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visa", tags=["visa"])

@router.put("/{visa_id}", response_model=VisaResponse)
def update_existing_visa(visa_id: UUID, visa_data: VisaUpdate, db: Session = Depends(get_db)):
    """
    Update an existing visa record.
    """
    try:
        return visa_service.update_visa(db, visa_id, visa_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating visa %s: %s", str(visa_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update visa details in database"
        )

@router.delete("/{visa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_visa(visa_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing visa record.
    """
    try:
        visa_service.delete_visa(db, visa_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting visa %s: %s", str(visa_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete visa details from database"
        )
