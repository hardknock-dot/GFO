import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from datetime import datetime
from app.database import get_db
from app.schemas.schedule import ScheduleResponse, ScheduleUpdate, ScheduleCommentStatusUpdate
from app.schemas.travel import TravelResponse, TravelCreate
from app.schemas.performance import PerformanceResponse, PerformanceCreate
from app.schemas.missed_schedule import MissedScheduleResponse, MissedScheduleCreate
from app.services import schedule_service, travel_service, performance_service, missed_schedule_service
from app.services.auth_service import get_current_user, get_schedule_and_verify, enforce_write_permission, enforce_delete_permission, is_engineer_user
from app.services.audit_service import log_audit, object_to_dict
from app.models.user import User


logger = logging.getLogger(__name__)

from typing import Optional
from fastapi import Query
from app.schemas.pagination import PaginatedResponse
from app.services.auth_service import enforce_company_isolation

router = APIRouter(prefix="/schedules", tags=["schedules"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=PaginatedResponse[ScheduleResponse])
def read_schedules(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    engineer_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    schedule_status: Optional[str] = Query(None),
    comment_status: Optional[str] = Query(None),
    has_comments: Optional[bool] = Query(None),
    comment_adressal: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated schedule records with tenant isolation and optional filters.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)
        res = schedule_service.get_schedules_paginated(
            db=db,
            company_id=validated_cids,
            engineer_id=engineer_id,
            search=search,
            schedule_status=schedule_status,
            comment_status=comment_status,
            has_comments=has_comments,
            comment_adressal=comment_adressal,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse[ScheduleResponse](
            items=[ScheduleResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving schedules: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedules from database"
        )

@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_existing_schedule(
    schedule_id: UUID,
    schedule_data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing schedule record. Strictly restricted to Manager and Admin roles.
    """
    try:
        if is_engineer_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Engineers are not permitted to edit schedule assignment details."
            )
        enforce_write_permission(current_user)
        get_schedule_and_verify(db, schedule_id, current_user)
        return schedule_service.update_schedule(db, schedule_id, schedule_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update schedule record in database"
        )

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_schedule(
    schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an existing schedule record. Requires Main Admin or Manager role.
    """
    try:
        enforce_write_permission(current_user)
        enforce_delete_permission(current_user)
        sch = get_schedule_and_verify(db, schedule_id, current_user)
        from app.services.audit_service import log_audit, object_to_dict
        old_dict = object_to_dict(sch)
        
        schedule_service.delete_schedule(db, schedule_id)
        
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="DELETE",
            entity_type="Schedule",
            entity_id=schedule_id,
            description=f"Schedule deleted ({schedule_id})",
            old_values=old_dict,
            new_values=None
        )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete schedule record from database"
        )


@router.get("/{schedule_id}/travel", response_model=List[TravelResponse])
def read_schedule_travel(
    schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all travel records associated with a schedule.
    """
    try:
        get_schedule_and_verify(db, schedule_id, current_user)
        return travel_service.get_schedule_travel(db, schedule_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving travel for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve travel details from database"
        )

@router.post("/{schedule_id}/travel", response_model=TravelResponse, status_code=status.HTTP_201_CREATED)
def create_schedule_travel(
    schedule_id: UUID,
    travel_data: TravelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new travel record associated with a schedule.
    """
    try:
        enforce_write_permission(current_user)
        get_schedule_and_verify(db, schedule_id, current_user)
        # Derive owner_id from current_user
        return travel_service.create_travel(db, schedule_id, travel_data, owner_id=current_user.user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating travel for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create travel record in database"
        )

@router.get("/{schedule_id}/performance", response_model=List[PerformanceResponse])
def read_schedule_performance(
    schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all performance records associated with a schedule.
    """
    try:
        get_schedule_and_verify(db, schedule_id, current_user)
        return performance_service.get_schedule_performance(db, schedule_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving performance for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance details from database"
        )

@router.post("/{schedule_id}/performance", response_model=PerformanceResponse, status_code=status.HTTP_201_CREATED)
def create_schedule_performance(
    schedule_id: UUID,
    performance_data: PerformanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new performance record associated with a schedule.
    """
    try:
        enforce_write_permission(current_user)
        get_schedule_and_verify(db, schedule_id, current_user)
        created = performance_service.create_performance(
            db,
            schedule_id,
            performance_data,
            owner_id=current_user.user_id,
            orbit_id=performance_data.orbit_id
        )
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="CREATE",
            entity_type="Performance",
            entity_id=created.performance_id,
            description=f"Created Performance evaluation for schedule {schedule_id}",
            new_values=object_to_dict(created)
        )
        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating performance for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create performance record in database"
        )

@router.get("/{schedule_id}/missed-schedules", response_model=List[MissedScheduleResponse])
def read_schedule_missed_schedules(
    schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all missed schedule records associated with a schedule.
    """
    try:
        get_schedule_and_verify(db, schedule_id, current_user)
        return missed_schedule_service.get_schedule_missed_schedules(db, schedule_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving missed schedules for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve missed schedule details from database"
        )

@router.post("/{schedule_id}/missed-schedules", response_model=MissedScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule_missed_schedule(
    schedule_id: UUID,
    missed_schedule_data: MissedScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new missed schedule record associated with a schedule.
    """
    try:
        get_schedule_and_verify(db, schedule_id, current_user)
        # Derive owner_id from current_user
        return missed_schedule_service.create_missed_schedule(db, schedule_id, missed_schedule_data, owner_id=current_user.user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating missed schedule for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create missed schedule record in database"
        )

@router.patch("/{schedule_id}/comments/status", response_model=ScheduleResponse)
@router.put("/{schedule_id}/comments/status", response_model=ScheduleResponse)
def update_schedule_comment_status(
    schedule_id: UUID,
    payload: ScheduleCommentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update comment status (e.g. mark as ADDRESSED). Only accessible to Managers / Admins.
    Field Engineers are forbidden (403).
    """
    if is_engineer_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Engineers cannot mark comments as addressed."
        )
    enforce_write_permission(current_user)
    sch = get_schedule_and_verify(db, schedule_id, current_user)
    if payload.comment_adressal is False:
        sch.comment_adressal = False
        sch.comment_status = "UNADDRESSED"
    elif payload.comment_adressal is True or payload.comment_adressal is None:
        sch.comment_adressal = None
        sch.comment_status = "ADDRESSED"
    elif payload.comment_status:
        st = str(payload.comment_status).upper().strip()
        if st in ("ADDRESSED", "APPROVED", "TRUE"):
            sch.comment_adressal = None
            sch.comment_status = "ADDRESSED"
        elif st in ("UNADDRESSED", "FALSE", "PENDING"):
            sch.comment_adressal = False
            sch.comment_status = "UNADDRESSED"
        else:
            sch.comment_status = payload.comment_status
    else:
        sch.comment_adressal = None
        sch.comment_status = "ADDRESSED"
    sch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sch)
    return sch

