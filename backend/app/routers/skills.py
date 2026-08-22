import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.skill import SkillResponse, SkillUpdate
from app.services import skill_service
from app.services.auth_service import get_current_user, get_skill_and_verify, enforce_write_permission, enforce_delete_permission, is_engineer_user
from app.models.user import User
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/skills", tags=["skills"], dependencies=[Depends(get_current_user)])

@router.put("/{skill_id}", response_model=SkillResponse)
def update_existing_skill(
    skill_id: UUID,
    skill_data: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if not is_engineer_user(current_user):
            enforce_write_permission(current_user)
        skill = get_skill_and_verify(db, skill_id, current_user)
        old_dict = object_to_dict(skill)
        updated_skill = skill_service.update_skill(db, skill_id, skill_data)
        
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="UPDATE",
            entity_type="Skill",
            entity_id=skill_id,
            description=f"Skill updated for engineer ({skill.engineer_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated_skill)
        )
        return updated_skill
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating skill %s: %s", str(skill_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update skill in database"
        )

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_skill(
    skill_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if not is_engineer_user(current_user):
            enforce_write_permission(current_user)
            enforce_delete_permission(current_user)
        skill = get_skill_and_verify(db, skill_id, current_user)
        old_dict = object_to_dict(skill)
        
        skill_service.delete_skill(db, skill_id)
        
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="Skill",
            entity_id=skill_id,
            description=f"Skill deleted for engineer ({skill.engineer_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting skill %s: %s", str(skill_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete skill from database"
        )
