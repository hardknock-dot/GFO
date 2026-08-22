import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.schemas.travel import TravelResponse, TravelUpdate
from app.services import travel_service
from app.services.auth_service import get_current_user, get_travel_and_verify, enforce_write_permission, enforce_delete_permission
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/travel", tags=["travel"], dependencies=[Depends(get_current_user)])

@router.put("/{travel_id}", response_model=TravelResponse)
def update_existing_travel(
    travel_id: UUID,
    travel_data: TravelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        tr = get_travel_and_verify(db, travel_id, current_user)
        old_dict = object_to_dict(tr)
        updated = travel_service.update_travel(db, travel_id, travel_data)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="UPDATE",
            entity_type="Travel",
            entity_id=travel_id,
            description=f"Travel arrangement updated ({travel_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated)
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating travel arrangement %s: %s", str(travel_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update travel arrangement in database"
        )

@router.delete("/{travel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_travel(
    travel_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
        tr = get_travel_and_verify(db, travel_id, current_user)
        old_dict = object_to_dict(tr)
        travel_service.delete_travel(db, travel_id)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="Travel",
            entity_id=travel_id,
            description=f"Travel arrangement deleted ({travel_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting travel %s: %s", str(travel_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete travel arrangement from database"
        )
