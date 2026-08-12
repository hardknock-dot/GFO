import logging
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.services import engineer_service, skill_service, schedule_service, visa_service, travel_service, performance_service, leave_service, missed_schedule_service, company_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engineers", tags=["engineers"])

@router.get("", response_model=List[EngineerResponse])
def read_engineers(company_id: UUID | None = None, db: Session = Depends(get_db)):
    """
    Retrieve all engineers from the database, optionally filtered by company_id.
    """
    try:
        if company_id is not None:
            db_company = company_service.get_company_by_id(db, company_id)
            if db_company is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Company not found"
                )
        return engineer_service.get_engineers(db, company_id=company_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving engineers from database: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve engineers from database"
        )

@router.get("/{engineer_id}", response_model=EngineerResponse)
def read_engineer(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve a single engineer by UUID.
    """
    try:
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
        return db_engineer
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving engineer %s from database: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve engineer from database"
        )

@router.get("/{engineer_id}/skills", response_model=List[SkillResponse])
def read_engineer_skills(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all skill-matrix records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
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
def create_engineer_skill(engineer_id: UUID, skill_data: SkillCreate, db: Session = Depends(get_db)):
    """
    Create a new skill record associated with one engineer.
    """
    try:
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
def read_engineer_schedules(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all schedule records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
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
def create_engineer_schedule(engineer_id: UUID, schedule_data: ScheduleCreate, db: Session = Depends(get_db)):
    """
    Create a new schedule record associated with one engineer.
    """
    try:
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
def read_engineer_visa(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all visa records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
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
def create_engineer_visa(engineer_id: UUID, visa_data: VisaCreate, db: Session = Depends(get_db)):
    """
    Create a new visa record associated with one engineer.
    """
    try:
        return visa_service.create_visa(db, engineer_id, visa_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating visa for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create visa details in database"
        )

@router.get("/{engineer_id}/travel", response_model=List[TravelResponse])
def read_engineer_travel(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all travel arrangement records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
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
def read_engineer_performance(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all performance records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
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
def read_engineer_leaves(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all leave records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
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
def create_engineer_leave(engineer_id: UUID, leave_data: LeaveCreate, db: Session = Depends(get_db)):
    """
    Create a new leave record associated with an engineer.
    """
    try:
        return leave_service.create_leave(db, engineer_id, leave_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating leave for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create leave record in database"
        )

@router.get("/{engineer_id}/missed-schedules", response_model=List[MissedScheduleResponse])
def read_engineer_missed_schedules(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all missed schedule records associated with one engineer.
    """
    try:
        # Check if engineer exists to return 404 if not found
        db_engineer = engineer_service.get_engineer_by_id(db, engineer_id)
        if db_engineer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
        return missed_schedule_service.get_engineer_missed_schedules(db, engineer_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving missed schedules for engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve missed schedule details from database"
        )

@router.post("", response_model=EngineerResponse, status_code=status.HTTP_201_CREATED)
def create_new_engineer(engineer_data: EngineerCreate, db: Session = Depends(get_db)):
    """
    Create a new field engineer.
    """
    try:
        return engineer_service.create_engineer(db, engineer_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating engineer: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create engineer"
        )

@router.put("/{engineer_id}", response_model=EngineerResponse)
def update_existing_engineer(engineer_id: UUID, engineer_data: EngineerUpdate, db: Session = Depends(get_db)):
    """
    Update an existing field engineer.
    """
    try:
        return engineer_service.update_engineer(db, engineer_id, engineer_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update engineer"
        )

@router.delete("/{engineer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_engineer(engineer_id: UUID, db: Session = Depends(get_db)):
    """
    Delete a field engineer.
    """
    try:
        engineer_service.delete_engineer(db, engineer_id)
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting engineer %s: %s", str(engineer_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete engineer"
        )








