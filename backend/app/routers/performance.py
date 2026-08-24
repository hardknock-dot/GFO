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

from typing import Optional, List
from fastapi import Query
from app.schemas.pagination import PaginatedResponse
from app.services.auth_service import enforce_company_isolation

router = APIRouter(prefix="/performance", tags=["performance"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=PaginatedResponse[PerformanceResponse])
def read_performances(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    schedule_id: Optional[UUID] = Query(None),
    engineer_id: Optional[UUID] = Query(None),
    escalation: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated performance records with tenant isolation and optional filters.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)
        res = performance_service.get_performance_paginated(
            db=db,
            company_id=validated_cids,
            schedule_id=schedule_id,
            engineer_id=engineer_id,
            escalation_filter=escalation,
            search=search,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse[PerformanceResponse](
            items=[PerformanceResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving performance records: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance records from database"
        )

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
