import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.skill import SkillResponse, SkillUpdate
from app.services import skill_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/skills", tags=["skills"])

@router.put("/{skill_id}", response_model=SkillResponse)
def update_existing_skill(skill_id: UUID, skill_data: SkillUpdate, db: Session = Depends(get_db)):
    """
    Update an existing skill record.
    """
    try:
        return skill_service.update_skill(db, skill_id, skill_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating skill %s: %s", str(skill_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update skill in database"
        )

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_skill(skill_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing skill record.
    """
    try:
        skill_service.delete_skill(db, skill_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting skill %s: %s", str(skill_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete skill from database"
        )
