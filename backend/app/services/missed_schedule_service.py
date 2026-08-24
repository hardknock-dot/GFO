from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.missed_schedule import MissedSchedule
from app.models.schedule import Schedule
from app.models.engineer import Engineer
from app.schemas.missed_schedule import MissedScheduleCreate, MissedScheduleUpdate
from fastapi import HTTPException, status

def get_missed_schedules_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    schedule_id: Optional[UUID] = None,
    engineer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = (
        select(MissedSchedule)
        .join(Schedule, MissedSchedule.schedule_id == Schedule.schedule_id)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    )
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if schedule_id:
        conditions.append(MissedSchedule.schedule_id == schedule_id)

    if engineer_id:
        conditions.append(Schedule.engineer_id == engineer_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                MissedSchedule.reason.ilike(search_pattern),
                MissedSchedule.evidence.ilike(search_pattern),
                Engineer.engineer_name.ilike(search_pattern),
                Engineer.orbit_id.ilike(search_pattern)
            )
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    total_pages = math.ceil(total / page_size) if page_size > 0 else (1 if total > 0 else 0)
    offset = (page - 1) * page_size
    stmt = stmt.order_by(MissedSchedule.created_at.desc()).offset(offset).limit(page_size)

    items = list(db.scalars(stmt).all())

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_missed_schedules(db: Session, engineer_id: UUID) -> List[MissedSchedule]:
    """
    Retrieve all missed schedule records associated with one engineer from PostgreSQL.
    """
    stmt = (
        select(MissedSchedule)
        .join(Schedule, MissedSchedule.schedule_id == Schedule.schedule_id)
        .where(Schedule.engineer_id == engineer_id)
    )
    result = db.scalars(stmt).all()
    return list(result)

def get_schedule_missed_schedules(db: Session, schedule_id: UUID) -> List[MissedSchedule]:
    """
    Retrieve all missed schedule records associated with one schedule from PostgreSQL.
    """
    sched = db.get(Schedule, schedule_id)
    if sched is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    stmt = select(MissedSchedule).where(MissedSchedule.schedule_id == schedule_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_missed_schedule(db: Session, schedule_id: UUID, missed_schedule_data: MissedScheduleCreate, owner_id: Optional[UUID] = None) -> MissedSchedule:
    """
    Create a new missed schedule record associated with a schedule.
    """
    sched = db.get(Schedule, schedule_id)
    if sched is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    db_ms = MissedSchedule(
        missed_schedule_id=uuid.uuid4(),
        schedule_id=schedule_id,
        owner_id=owner_id,
        requested_start_date=missed_schedule_data.requested_start_date,
        requested_end_date=missed_schedule_data.requested_end_date,
        actual_start_date=missed_schedule_data.actual_start_date,
        actual_end_date=missed_schedule_data.actual_end_date,
        reason=missed_schedule_data.reason,
        evidence=missed_schedule_data.evidence,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_ms)
    db.commit()
    db.refresh(db_ms)
    return db_ms

def update_missed_schedule(db: Session, missed_schedule_id: UUID, missed_schedule_data: MissedScheduleUpdate) -> MissedSchedule:
    """
    Update an existing missed schedule record.
    """
    db_ms = db.get(MissedSchedule, missed_schedule_id)
    if db_ms is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Missed schedule record not found"
        )

    req_start = missed_schedule_data.requested_start_date if missed_schedule_data.requested_start_date is not None else db_ms.requested_start_date
    req_end = missed_schedule_data.requested_end_date if missed_schedule_data.requested_end_date is not None else db_ms.requested_end_date
    if req_start is not None and req_end is not None:
        if req_end < req_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="requested_end_date cannot be earlier than requested_start_date"
            )

    act_start = missed_schedule_data.actual_start_date if missed_schedule_data.actual_start_date is not None else db_ms.actual_start_date
    act_end = missed_schedule_data.actual_end_date if missed_schedule_data.actual_end_date is not None else db_ms.actual_end_date
    if act_start is not None and act_end is not None:
        if act_end < act_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="actual_end_date cannot be earlier than actual_start_date"
            )

    if missed_schedule_data.requested_start_date is not None:
        db_ms.requested_start_date = missed_schedule_data.requested_start_date
    if missed_schedule_data.requested_end_date is not None:
        db_ms.requested_end_date = missed_schedule_data.requested_end_date
    if missed_schedule_data.actual_start_date is not None:
        db_ms.actual_start_date = missed_schedule_data.actual_start_date
    if missed_schedule_data.actual_end_date is not None:
        db_ms.actual_end_date = missed_schedule_data.actual_end_date
    if missed_schedule_data.reason is not None:
        db_ms.reason = missed_schedule_data.reason
    if missed_schedule_data.evidence is not None:
        db_ms.evidence = missed_schedule_data.evidence

    db_ms.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_ms)
    return db_ms

def delete_missed_schedule(db: Session, missed_schedule_id: UUID) -> None:
    """
    Delete an existing missed schedule record.
    """
    db_ms = db.get(MissedSchedule, missed_schedule_id)
    if db_ms is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Missed schedule record not found"
        )

    db.delete(db_ms)
    db.commit()
