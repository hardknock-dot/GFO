from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.travel import Travel
from app.models.schedule import Schedule
from app.models.engineer import Engineer
from app.schemas.travel import TravelCreate, TravelUpdate
from fastapi import HTTPException, status

def get_travel_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    schedule_id: Optional[UUID] = None,
    engineer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = (
        select(Travel)
        .join(Schedule, Travel.schedule_id == Schedule.schedule_id)
        .join(Engineer, Schedule.engineer_id == Engineer.engineer_id)
    )
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if schedule_id:
        conditions.append(Travel.schedule_id == schedule_id)

    if engineer_id:
        conditions.append(Schedule.engineer_id == engineer_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Travel.purpose.ilike(search_pattern),
                Travel.comments.ilike(search_pattern),
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
    stmt = stmt.order_by(Travel.created_at.desc()).offset(offset).limit(page_size)

    items = list(db.scalars(stmt).all())

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_travel(db: Session, engineer_id: UUID) -> List[Travel]:
    """
    Retrieve all travel arrangement records associated with one engineer from PostgreSQL.
    """
    stmt = (
        select(Travel)
        .join(Schedule, Travel.schedule_id == Schedule.schedule_id)
        .where(Schedule.engineer_id == engineer_id)
    )
    result = db.scalars(stmt).all()
    return list(result)

def get_schedule_travel(db: Session, schedule_id: UUID) -> List[Travel]:
    """
    Retrieve all travel records associated with a schedule.
    """
    # 1. Verify schedule exists
    sch = db.get(Schedule, schedule_id)
    if sch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    stmt = select(Travel).where(Travel.schedule_id == schedule_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_travel(db: Session, schedule_id: UUID, travel_data: TravelCreate, owner_id: Optional[UUID] = None) -> Travel:
    """
    Create a new travel record associated with a schedule.
    """
    # 1. Verify schedule exists
    sch = db.get(Schedule, schedule_id)
    if sch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # 2. Create Travel
    db_travel = Travel(
        travel_id=uuid.uuid4(),
        schedule_id=schedule_id,
        owner_id=owner_id,
        booking_date=travel_data.booking_date,
        travel_date=travel_data.travel_date,
        purpose=travel_data.purpose,
        comments=travel_data.comments,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_travel)
    db.commit()
    db.refresh(db_travel)
    return db_travel

def update_travel(db: Session, travel_id: UUID, travel_data: TravelUpdate) -> Travel:
    """
    Update an existing travel record.
    """
    # 1. Find Travel
    db_travel = db.get(Travel, travel_id)
    if db_travel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel arrangement not found"
        )

    # 2. Validate merged dates
    new_booking = travel_data.booking_date if travel_data.booking_date is not None else db_travel.booking_date
    new_travel = travel_data.travel_date if travel_data.travel_date is not None else db_travel.travel_date
    if new_booking is not None and new_travel is not None:
        if new_travel < new_booking:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="travel_date should not be earlier than booking_date"
            )

    # 3. Update fields
    if travel_data.booking_date is not None:
        db_travel.booking_date = travel_data.booking_date
    if travel_data.travel_date is not None:
        db_travel.travel_date = travel_data.travel_date
    if travel_data.purpose is not None:
        db_travel.purpose = travel_data.purpose
    if travel_data.comments is not None:
        db_travel.comments = travel_data.comments

    db_travel.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_travel)
    return db_travel

def delete_travel(db: Session, travel_id: UUID) -> None:
    """
    Delete an existing travel record.
    """
    # 1. Find Travel
    db_travel = db.get(Travel, travel_id)
    if db_travel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel arrangement not found"
        )

    # 2. Delete Travel
    db.delete(db_travel)
    db.commit()
