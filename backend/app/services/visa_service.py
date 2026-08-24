from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.visa import Visa
from app.models.engineer import Engineer
from app.schemas.visa import VisaCreate, VisaUpdate
from fastapi import HTTPException, status

def get_visa_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    engineer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    comment_status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = select(Visa).join(Engineer, Visa.engineer_id == Engineer.engineer_id)
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if engineer_id:
        conditions.append(Visa.engineer_id == engineer_id)

    if comment_status:
        conditions.append(Visa.comment_status == comment_status)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Visa.country.ilike(search_pattern),
                Visa.visa_type.ilike(search_pattern),
                Visa.comments.ilike(search_pattern),
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
    stmt = stmt.order_by(Visa.created_at.desc()).offset(offset).limit(page_size)

    items = list(db.scalars(stmt).all())

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_visa(db: Session, engineer_id: UUID) -> List[Visa]:
    """
    Retrieve all visa records associated with one engineer from PostgreSQL.
    """
    stmt = select(Visa).where(Visa.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_visa(db: Session, engineer_id: UUID, visa_data: VisaCreate, owner_id: Optional[UUID] = None) -> Visa:
    """
    Create a new visa record associated with one engineer.
    """
    # 1. Verify engineer exists
    engineer = db.get(Engineer, engineer_id)
    if engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # 2. Create Visa
    db_visa = Visa(
        visa_id=uuid.uuid4(),
        engineer_id=engineer_id,
        owner_id=owner_id,
        country=visa_data.country,
        visa_type=visa_data.visa_type,
        applied_on=visa_data.applied_on,
        visa_start_date=visa_data.visa_start_date,
        visa_end_date=visa_data.visa_end_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_visa)
    db.commit()
    db.refresh(db_visa)
    return db_visa

def update_visa(db: Session, visa_id: UUID, visa_data: VisaUpdate) -> Visa:
    """
    Update an existing visa record.
    """
    # 1. Find Visa
    db_visa = db.get(Visa, visa_id)
    if db_visa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visa record not found"
        )

    # 2. Validate merged dates
    new_start_date = visa_data.visa_start_date if visa_data.visa_start_date is not None else db_visa.visa_start_date
    new_end_date = visa_data.visa_end_date if visa_data.visa_end_date is not None else db_visa.visa_end_date
    if new_start_date is not None and new_end_date is not None:
        if new_end_date < new_start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="visa_end_date should not be earlier than visa_start_date"
            )

    # 3. Update fields
    if visa_data.country is not None:
        db_visa.country = visa_data.country
    if visa_data.visa_type is not None:
        db_visa.visa_type = visa_data.visa_type
    if visa_data.applied_on is not None:
        db_visa.applied_on = visa_data.applied_on
    if visa_data.visa_start_date is not None:
        db_visa.visa_start_date = visa_data.visa_start_date
    if visa_data.visa_end_date is not None:
        db_visa.visa_end_date = visa_data.visa_end_date

    db_visa.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_visa)
    return db_visa

def delete_visa(db: Session, visa_id: UUID) -> None:
    """
    Delete an existing visa record.
    """
    # 1. Find Visa
    db_visa = db.get(Visa, visa_id)
    if db_visa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visa record not found"
        )

    # 2. Delete Visa
    db.delete(db_visa)
    db.commit()
