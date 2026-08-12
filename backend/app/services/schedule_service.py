from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
import uuid
from datetime import datetime

from app.models.schedule import Schedule
from app.models.engineer import Engineer
from app.models.travel import Travel
from app.models.performance import Performance
from app.models.missed_schedule import MissedSchedule
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate
from fastapi import HTTPException, status

def get_engineer_schedules(db: Session, engineer_id: UUID) -> List[Schedule]:
    """
    Retrieve all schedule records associated with one engineer from PostgreSQL.
    """
    stmt = select(Schedule).where(Schedule.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_schedule(db: Session, engineer_id: UUID, schedule_data: ScheduleCreate) -> Schedule:
    """
    Create a new schedule record associated with one engineer.
    """
    # 1. Verify engineer exists
    engineer = db.get(Engineer, engineer_id)
    if engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # 2. Create schedule
    db_schedule = Schedule(
        schedule_id=uuid.uuid4(),
        engineer_id=engineer_id,
        support_type=schedule_data.support_type,
        country=schedule_data.country,
        fab_city=schedule_data.fab_city,
        fab_site=schedule_data.fab_site,
        start_date=schedule_data.start_date,
        end_date=schedule_data.end_date,
        schedule_status=schedule_data.schedule_status or "Upcoming",
        remarks=schedule_data.remarks,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def update_schedule(db: Session, schedule_id: UUID, schedule_data: ScheduleUpdate) -> Schedule:
    """
    Update an existing schedule record.
    """
    # 1. Find schedule
    db_schedule = db.get(Schedule, schedule_id)
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # 2. Validate dates if either start_date or end_date is updated
    new_start_date = schedule_data.start_date if schedule_data.start_date is not None else db_schedule.start_date
    new_end_date = schedule_data.end_date if schedule_data.end_date is not None else db_schedule.end_date
    if new_start_date is not None and new_end_date is not None:
        if new_end_date < new_start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="end_date should not be earlier than start_date"
            )

    # 3. Update permitted fields
    if schedule_data.support_type is not None:
        db_schedule.support_type = schedule_data.support_type
    if schedule_data.country is not None:
        db_schedule.country = schedule_data.country
    if schedule_data.fab_city is not None:
        db_schedule.fab_city = schedule_data.fab_city
    if schedule_data.fab_site is not None:
        db_schedule.fab_site = schedule_data.fab_site
    if schedule_data.start_date is not None:
        db_schedule.start_date = schedule_data.start_date
    if schedule_data.end_date is not None:
        db_schedule.end_date = schedule_data.end_date
    if schedule_data.schedule_status is not None:
        db_schedule.schedule_status = schedule_data.schedule_status
    if schedule_data.remarks is not None:
        db_schedule.remarks = schedule_data.remarks

    db_schedule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def delete_schedule(db: Session, schedule_id: UUID) -> None:
    """
    Delete a schedule record after verifying no related records exist.
    """
    # 1. Find schedule
    db_schedule = db.get(Schedule, schedule_id)
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # 2. Check for child records in travel_arrangements, performances, missed_schedules
    has_travel = db.scalar(select(Travel).where(Travel.schedule_id == schedule_id).limit(1)) is not None
    has_perf = db.scalar(select(Performance).where(Performance.schedule_id == schedule_id).limit(1)) is not None
    has_missed = db.scalar(select(MissedSchedule).where(MissedSchedule.schedule_id == schedule_id).limit(1)) is not None

    if has_travel or has_perf or has_missed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Schedule cannot be deleted because related records exist."
        )

    # 3. Delete schedule
    db.delete(db_schedule)
    db.commit()
