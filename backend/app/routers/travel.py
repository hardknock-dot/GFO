import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.travel import TravelResponse, TravelUpdate
from app.services import travel_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/travel", tags=["travel"])

@router.put("/{travel_id}", response_model=TravelResponse)
def update_existing_travel(travel_id: UUID, travel_data: TravelUpdate, db: Session = Depends(get_db)):
    """
    Update an existing travel record.
    """
    try:
        return travel_service.update_travel(db, travel_id, travel_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating travel %s: %s", str(travel_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update travel arrangement in database"
        )

@router.delete("/{travel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_travel(travel_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing travel record.
    """
    try:
        travel_service.delete_travel(db, travel_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting travel %s: %s", str(travel_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete travel arrangement from database"
        )
