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

from typing import Optional, List
from fastapi import Query
from app.schemas.pagination import PaginatedResponse
from app.services.auth_service import enforce_company_isolation

router = APIRouter(prefix="/leaves", tags=["leaves"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=PaginatedResponse[LeaveResponse])
def read_leaves(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    engineer_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated leave records with tenant isolation and optional filters.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)
        res = leave_service.get_leaves_paginated(
            db=db,
            company_id=validated_cids,
            engineer_id=engineer_id,
            status_filter=status_filter,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse[LeaveResponse](
            items=[LeaveResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving leaves: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave records from database"
        )

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
