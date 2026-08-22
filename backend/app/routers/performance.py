import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.schemas.performance import PerformanceResponse, PerformanceUpdate
from app.services import performance_service
from app.services.auth_service import get_current_user, get_performance_and_verify, enforce_write_permission, enforce_delete_permission
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/performance", tags=["performance"], dependencies=[Depends(get_current_user)])

@router.put("/{performance_id}", response_model=PerformanceResponse)
def update_existing_performance(
    performance_id: UUID,
    performance_data: PerformanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        perf = get_performance_and_verify(db, performance_id, current_user)
        old_dict = object_to_dict(perf)
        updated = performance_service.update_performance(db, performance_id, performance_data)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="UPDATE",
            entity_type="Performance",
            entity_id=performance_id,
            description=f"Performance record updated ({performance_id})",
            old_values=old_dict,
            new_values=object_to_dict(updated)
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating performance %s: %s", str(performance_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update performance record in database"
        )

@router.delete("/{performance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_performance(
    performance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
        perf = get_performance_and_verify(db, performance_id, current_user)
        old_dict = object_to_dict(perf)
        performance_service.delete_performance(db, performance_id)
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="Performance",
            entity_id=performance_id,
            description=f"Performance record deleted ({performance_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting performance record %s: %s", str(performance_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete performance record from database"
        )
