import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.engineer import EngineerResponse, EngineerCreate, EngineerUpdate
from app.schemas.skill import SkillResponse, SkillCreate
from app.schemas.schedule import ScheduleResponse, ScheduleCreate
from app.schemas.visa import VisaResponse, VisaCreate
from app.schemas.travel import TravelResponse
from app.schemas.performance import PerformanceResponse
from app.schemas.leave import LeaveResponse, LeaveCreate
from app.schemas.missed_schedule import MissedScheduleResponse
from app.services import (
    engineer_service,
    skill_service,
    schedule_service,
    visa_service,
    travel_service,
    performance_service,
    leave_service,
    missed_schedule_service,
    company_service
)
from app.services.auth_service import (
    get_current_user,
    enforce_company_isolation,
    get_engineer_and_verify,
    enforce_write_permission,
    enforce_delete_permission,
    is_main_admin,
    is_manager
)
from app.models.user import User
from datetime import date
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engineers", tags=["engineers"], dependencies=[Depends(get_current_user)])

from app.schemas.pagination import PaginatedResponse

@router.get("", response_model=PaginatedResponse[EngineerResponse])
def read_engineers(
    company_id: Optional[UUID] = Query(None),
    company_ids: Optional[List[UUID]] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    primary_tool: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve paginated engineers from the database with optional search and filters.
    """
    try:
        target_cids = company_ids if company_ids is not None else ([company_id] if company_id else None)
        validated_cids = enforce_company_isolation(db, current_user, target_cids)
        res = engineer_service.get_engineers_paginated(
            db=db,
            company_id=validated_cids,
            search=search,
            status_filter=status,
            level_filter=level,
            primary_tool_filter=primary_tool,
            country_filter=country,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse[EngineerResponse](
            items=[EngineerResponse.model_validate(item) for item in res["items"]],
            page=res["page"],
            page_size=res["page_size"],
            total=res["total"],
            total_pages=res["total_pages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving engineers from database: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve engineers from database"
        )

@router.post("", response_model=EngineerResponse, status_code=status.HTTP_201_CREATED)
def create_engineer(
    engineer_data: EngineerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new engineer record in PostgreSQL.
    """
    try:
        enforce_write_permission(current_user)
        enforce_company_isolation(current_user, engineer_data.company_id)
        db_company = company_service.get_company_by_id(db, engineer_data.company_id)
        if db_company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified company does not exist"
            )
        return engineer_service.create_engineer(db, engineer_data, current_user_id=current_user.user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating engineer in database: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create engineer record in database"
        )

@router.get("/{engineer_id}", response_model=EngineerResponse)
def read_engineer(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a single engineer by UUID.
    """
    try:
        db_engineer = get_engineer_and_verify(db, engineer_id, current_user)
        return db_engineer
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving engineer %s from database: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve engineer from database"
        )

@router.get("/{engineer_id}/report")
def read_engineer_report(
    engineer_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve individual engineer historical report filtered by date range.
    """
    get_engineer_and_verify(db, engineer_id, current_user)
    return engineer_service.get_engineer_report_data(db, engineer_id, start_date=start_date, end_date=end_date)

@router.put("/{engineer_id}", response_model=EngineerResponse)
def update_existing_engineer(
    engineer_id: UUID,
    engineer_data: EngineerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing engineer record.
    """
    try:
        enforce_write_permission(current_user)
        get_engineer_and_verify(db, engineer_id, current_user)
        if engineer_data.company_id:
            enforce_company_isolation(current_user, engineer_data.company_id)
        return engineer_service.update_engineer(db, engineer_id, engineer_data, current_user_id=current_user.user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{engineer_id}")
def delete_existing_engineer(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an engineer record and all associated child records.
    Requires Main Admin or Manager role. Ops Executive receives HTTP 403.
    """
    enforce_write_permission(current_user)
    enforce_delete_permission(current_user)
    eng = get_engineer_and_verify(db, engineer_id, current_user)

    engineer_service.delete_engineer(db, engineer_id, current_user_id=current_user.user_id)
    return {"message": f"Engineer {eng.engineer_name} and all associated child records deleted successfully."}



@router.get("/{engineer_id}/skills", response_model=List[SkillResponse])
def read_engineer_skills(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all skill-matrix records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return skill_service.get_engineer_skills(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving skills for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve skills from database"
        )

@router.post("/{engineer_id}/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_engineer_skill(
    engineer_id: UUID,
    skill_data: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new skill record associated with one engineer.
    """
    try:
        enforce_write_permission(current_user)
        get_engineer_and_verify(db, engineer_id, current_user)
        return skill_service.create_skill(db, engineer_id, skill_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating skill for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create skill in database"
        )

@router.get("/{engineer_id}/schedules", response_model=List[ScheduleResponse])
def read_engineer_schedules(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all schedule records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return schedule_service.get_engineer_schedules(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving schedules for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve schedules from database"
        )

@router.post("/{engineer_id}/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_engineer_schedule(
    engineer_id: UUID,
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new schedule record associated with one engineer.
    """
    try:
        enforce_write_permission(current_user)
        get_engineer_and_verify(db, engineer_id, current_user)
        return schedule_service.create_schedule(db, engineer_id, schedule_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating schedule for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create schedule in database"
        )

@router.get("/{engineer_id}/visa", response_model=List[VisaResponse])
def read_engineer_visa(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all visa records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return visa_service.get_engineer_visa(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving visa for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve visa details from database"
        )

@router.post("/{engineer_id}/visa", response_model=VisaResponse, status_code=status.HTTP_201_CREATED)
def create_engineer_visa(
    engineer_id: UUID,
    visa_data: VisaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new visa record associated with one engineer.
    """
    try:
        enforce_write_permission(current_user)
        get_engineer_and_verify(db, engineer_id, current_user)
        # Derive owner_id from current_user
        return visa_service.create_visa(db, engineer_id, visa_data, owner_id=current_user.user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating visa for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create visa details in database"
        )

@router.get("/{engineer_id}/travel", response_model=List[TravelResponse])
def read_engineer_travel(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all travel arrangement records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return travel_service.get_engineer_travel(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving travel for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve travel arrangements from database"
        )

@router.get("/{engineer_id}/performance", response_model=List[PerformanceResponse])
def read_engineer_performance(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all performance records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return performance_service.get_engineer_performance(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving performance for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance details from database"
        )

@router.get("/{engineer_id}/leaves", response_model=List[LeaveResponse])
def read_engineer_leaves(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all leave records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return leave_service.get_engineer_leaves(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving leaves for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave details from database"
        )

@router.post("/{engineer_id}/leaves", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_engineer_leave(
    engineer_id: UUID,
    leave_data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new leave record associated with an engineer.
    """
    try:
        enforce_write_permission(current_user)
        get_engineer_and_verify(db, engineer_id, current_user)
        # Derive owner_id from current_user
        return leave_service.create_leave(db, engineer_id, leave_data, owner_id=current_user.user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating leave for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create leave record in database"
        )

@router.get("/{engineer_id}/missed-schedules", response_model=List[MissedScheduleResponse])
def read_engineer_missed_schedules(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all missed schedule records associated with one engineer.
    """
    try:
        get_engineer_and_verify(db, engineer_id, current_user)
        return missed_schedule_service.get_engineer_missed_schedules(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving missed schedules for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve missed schedule details from database"
        )

@router.get("/{engineer_id}/reports/summary")
def read_engineer_reports_summary(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve isolated KPI reports summary for a specific engineer profile.
    """
    try:
        db_engineer = get_engineer_and_verify(db, engineer_id, current_user)
        from app.routers.engineer_me import generate_engineer_report_summary
        return generate_engineer_report_summary(db, db_engineer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating reports summary for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate engineer reports summary"
        )

