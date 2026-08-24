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

from typing import Optional, List
from fastapi import Query
from app.schemas.pagination import PaginatedResponse
from app.services.auth_service import enforce_company_isolation

router = APIRouter(prefix="/travel", tags=["travel"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=PaginatedResponse[TravelResponse])
def read_travel_arrangements(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    schedule_id: Optional[UUID] = Query(None),
    engineer_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated travel arrangement records with tenant isolation and optional filters.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)
        res = travel_service.get_travel_paginated(
            db=db,
            company_id=validated_cids,
            schedule_id=schedule_id,
            engineer_id=engineer_id,
            search=search,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse[TravelResponse](
            items=[TravelResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving travel arrangements: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve travel arrangements from database"
        )

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
