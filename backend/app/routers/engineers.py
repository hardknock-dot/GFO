import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.engineer import EngineerResponse
from app.schemas.skill import SkillResponse
from app.schemas.schedule import ScheduleResponse
from app.schemas.visa import VisaResponse
from app.schemas.travel import TravelResponse
from app.schemas.performance import PerformanceResponse
from app.schemas.leave import LeaveResponse
from app.schemas.missed_schedule import MissedScheduleResponse
from app.services import engineer_service, skill_service, schedule_service, visa_service, travel_service, performance_service, leave_service, missed_schedule_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engineers", tags=["engineers"])

@router.get("", response_model=List[EngineerResponse])
def read_engineers(db: Session = Depends(get_db)):
    """
    Retrieve all engineers from the database.
    """
    try:
        return engineer_service.get_engineers(db)
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








