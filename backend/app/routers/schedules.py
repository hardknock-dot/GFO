import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.database import get_db
from app.schemas.schedule import ScheduleResponse, ScheduleUpdate
from app.schemas.travel import TravelResponse, TravelCreate
from app.schemas.performance import PerformanceResponse, PerformanceCreate
from app.schemas.missed_schedule import MissedScheduleResponse, MissedScheduleCreate
from app.services import schedule_service, travel_service, performance_service, missed_schedule_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schedules", tags=["schedules"])

@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_existing_schedule(schedule_id: UUID, schedule_data: ScheduleUpdate, db: Session = Depends(get_db)):
    """
    Update an existing schedule record.
    """
    try:
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
def delete_existing_schedule(schedule_id: UUID, db: Session = Depends(get_db)):
    """
    Delete an existing schedule record.
    """
    try:
        schedule_service.delete_schedule(db, schedule_id)
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
def read_schedule_travel(schedule_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all travel records associated with a schedule.
    """
    try:
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
def create_schedule_travel(schedule_id: UUID, travel_data: TravelCreate, db: Session = Depends(get_db)):
    """
    Create a new travel record associated with a schedule.
    """
    try:
        return travel_service.create_travel(db, schedule_id, travel_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating travel for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create travel record in database"
        )

@router.get("/{schedule_id}/performance", response_model=List[PerformanceResponse])
def read_schedule_performance(schedule_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all performance records associated with a schedule.
    """
    try:
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
def create_schedule_performance(schedule_id: UUID, performance_data: PerformanceCreate, db: Session = Depends(get_db)):
    """
    Create a new performance record associated with a schedule.
    """
    try:
        return performance_service.create_performance(db, schedule_id, performance_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating performance for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create performance record in database"
        )

@router.get("/{schedule_id}/missed-schedules", response_model=List[MissedScheduleResponse])
def read_schedule_missed_schedules(schedule_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve all missed schedule records associated with a schedule.
    """
    try:
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
def create_schedule_missed_schedule(schedule_id: UUID, missed_schedule_data: MissedScheduleCreate, db: Session = Depends(get_db)):
    """
    Create a new missed schedule record associated with a schedule.
    """
    try:
        return missed_schedule_service.create_missed_schedule(db, schedule_id, missed_schedule_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating missed schedule for schedule %s: %s", str(schedule_id), str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create missed schedule record in database"
        )
