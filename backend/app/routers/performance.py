import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.performance import PerformanceResponse, PerformanceUpdate
from app.services import performance_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/performance", tags=["performance"])

@router.put("/{performance_id}", response_model=PerformanceResponse)
def update_existing_performance(performance_id: UUID, performance_data: PerformanceUpdate, db: Session = Depends(get_db)):
    """
    Update an existing performance record.
    """
    try:
        return performance_service.update_performance(db, performance_id, performance_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating performance record %s: %s", str(performance_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update performance record in database"
        )

@router.delete("/{performance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_performance(performance_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing performance record.
    """
    try:
        performance_service.delete_performance(db, performance_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting performance record %s: %s", str(performance_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete performance record from database"
        )
