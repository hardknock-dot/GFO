from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.performance import Performance
from app.models.schedule import Schedule
from app.models.engineer import Engineer
from app.schemas.performance import PerformanceCreate, PerformanceUpdate
from fastapi import HTTPException, status

def get_performance_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    schedule_id: Optional[UUID] = None,
    engineer_id: Optional[UUID] = None,
    escalation_filter: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = (
        select(Performance)
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    )
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if schedule_id:
        conditions.append(Performance.schedule_id == schedule_id)

    if engineer_id:
        conditions.append(Schedule.engineer_id == engineer_id)

    if escalation_filter is not None:
        conditions.append(Performance.escalation == escalation_filter)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Performance.feedback.ilike(search_pattern),
                Performance.escalation_reason.ilike(search_pattern),
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
    stmt = stmt.order_by(Performance.created_at.desc()).offset(offset).limit(page_size)

    items = list(db.scalars(stmt).all())

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_performance(db: Session, engineer_id: UUID) -> List[Performance]:
    """
    Retrieve all performance records associated with one engineer from PostgreSQL.
    """
    stmt = (
        select(Performance)
        .join(Schedule, Performance.schedule_id == Schedule.schedule_id)
        .where(Schedule.engineer_id == engineer_id)
    )
    result = db.scalars(stmt).all()
    return list(result)

def get_schedule_performance(db: Session, schedule_id: UUID) -> List[Performance]:
    """
    Retrieve all performance records associated with a schedule.
    """
    # 1. Verify schedule exists
    sch = db.get(Schedule, schedule_id)
    if sch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    stmt = select(Performance).where(Performance.schedule_id == schedule_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_performance(db: Session, schedule_id: UUID, performance_data: PerformanceCreate, owner_id: Optional[UUID] = None) -> Performance:
    """
    Create a new performance record associated with a schedule.
    """
    # 1. Verify schedule exists
    sch = db.get(Schedule, schedule_id)
    if sch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # 2. Create Performance
    db_perf = Performance(
        performance_id=uuid.uuid4(),
        schedule_id=schedule_id,
        owner_id=owner_id,
        actual_start_date=performance_data.actual_start_date,
        actual_end_date=performance_data.actual_end_date,
        escalation=performance_data.escalation if performance_data.escalation is not None else False,
        escalation_reason=performance_data.escalation_reason,
        feedback=performance_data.feedback,
        score=performance_data.score,
        attachment=performance_data.attachment,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_perf)
    db.commit()
    db.refresh(db_perf)
    return db_perf

def update_performance(db: Session, performance_id: UUID, performance_data: PerformanceUpdate) -> Performance:
    """
    Update an existing performance record.
    """
    # 1. Find Performance
    db_perf = db.get(Performance, performance_id)
    if db_perf is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance record not found"
        )

    # 2. Validate merged dates and escalation reason
    new_start = performance_data.actual_start_date if performance_data.actual_start_date is not None else db_perf.actual_start_date
    new_end = performance_data.actual_end_date if performance_data.actual_end_date is not None else db_perf.actual_end_date
    if new_start is not None and new_end is not None:
        if new_end < new_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="actual_end_date should not be earlier than actual_start_date"
            )

    new_escalation = performance_data.escalation if performance_data.escalation is not None else db_perf.escalation
    new_reason = performance_data.escalation_reason if performance_data.escalation_reason is not None else db_perf.escalation_reason
    if new_escalation is True and not new_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Escalation reason is required when escalation is enabled."
        )

    # 3. Update fields
    if performance_data.actual_start_date is not None:
        db_perf.actual_start_date = performance_data.actual_start_date
    if performance_data.actual_end_date is not None:
        db_perf.actual_end_date = performance_data.actual_end_date
    if performance_data.escalation is not None:
        db_perf.escalation = performance_data.escalation
    if performance_data.escalation_reason is not None:
        db_perf.escalation_reason = performance_data.escalation_reason
    if performance_data.feedback is not None:
        db_perf.feedback = performance_data.feedback
    if performance_data.score is not None:
        db_perf.score = performance_data.score
    if performance_data.attachment is not None:
        db_perf.attachment = performance_data.attachment

    db_perf.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_perf)
    return db_perf

def delete_performance(db: Session, performance_id: UUID) -> None:
    """
    Delete an existing performance record.
    """
    # 1. Find Performance
    db_perf = db.get(Performance, performance_id)
    if db_perf is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Performance record not found"
        )

    # 2. Delete Performance
    db.delete(db_perf)
    db.commit()
