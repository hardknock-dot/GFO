from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
import uuid
from datetime import datetime

from app.models.engineer import Engineer
from app.models.company import Company
from app.models.skill import Skill
from app.models.schedule import Schedule
from app.models.visa import Visa
from app.models.leave import Leave
from app.schemas.engineer import EngineerCreate, EngineerUpdate
from fastapi import HTTPException, status

def get_engineers(db: Session, company_id: Optional[UUID] = None) -> List[Engineer]:
    """
    Retrieve engineer records from PostgreSQL, optionally filtered by company_id.
    """
    stmt = select(Engineer)
    if company_id is not None:
        stmt = stmt.where(Engineer.company_id == company_id)
    result = db.scalars(stmt).all()
    return list(result)

def get_engineer_by_id(db: Session, engineer_id: UUID) -> Optional[Engineer]:
    """
    Retrieve a single engineer by UUID from PostgreSQL.
    """
    return db.get(Engineer, engineer_id)

def create_engineer(db: Session, engineer_data: EngineerCreate) -> Engineer:
    """
    Create a new field engineer record in PostgreSQL with validations.
    """
    # 1. Validate company exists
    company = db.get(Company, engineer_data.company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # 2. Validate orbit_id uniqueness
    existing = db.scalars(
        select(Engineer).where(Engineer.orbit_id == engineer_data.orbit_id)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An engineer with this Orbit ID already exists."
        )

    # 3. Create engineer
    db_engineer = Engineer(
        engineer_id=uuid.uuid4(),
        company_id=engineer_data.company_id,
        engineer_name=engineer_data.engineer_name,
        goes_by=engineer_data.goes_by,
        lam_id=engineer_data.employee_id,
        orbit_id=engineer_data.orbit_id,
        level=engineer_data.level,
        date_of_joining=engineer_data.date_of_joining,
        primary_tool_type=engineer_data.primary_tool,
        lam_experience=engineer_data.customer_experience,
        industry_experience=engineer_data.industry_experience,
        status=engineer_data.status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_engineer)
    db.commit()
    db.refresh(db_engineer)
    return db_engineer

def update_engineer(db: Session, engineer_id: UUID, engineer_data: EngineerUpdate) -> Engineer:
    """
    Update an existing field engineer record in PostgreSQL with validations.
    """
    # 1. Find engineer
    db_engineer = db.get(Engineer, engineer_id)
    if db_engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # 2. Validate orbit_id uniqueness if changed
    if engineer_data.orbit_id is not None and engineer_data.orbit_id != db_engineer.orbit_id:
        existing = db.scalars(
            select(Engineer).where(Engineer.orbit_id == engineer_data.orbit_id)
        ).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An engineer with this Orbit ID already exists."
            )

    # 3. Update allowed fields
    if engineer_data.engineer_name is not None:
        db_engineer.engineer_name = engineer_data.engineer_name
    if engineer_data.goes_by is not None:
        db_engineer.goes_by = engineer_data.goes_by
    if engineer_data.employee_id is not None:
        db_engineer.lam_id = engineer_data.employee_id
    if engineer_data.orbit_id is not None:
        db_engineer.orbit_id = engineer_data.orbit_id
    if engineer_data.level is not None:
        db_engineer.level = engineer_data.level
    if engineer_data.date_of_joining is not None:
        db_engineer.date_of_joining = engineer_data.date_of_joining
    if engineer_data.primary_tool is not None:
        db_engineer.primary_tool_type = engineer_data.primary_tool
    if engineer_data.customer_experience is not None:
        db_engineer.lam_experience = engineer_data.customer_experience
    if engineer_data.industry_experience is not None:
        db_engineer.industry_experience = engineer_data.industry_experience
    if engineer_data.status is not None:
        db_engineer.status = engineer_data.status

    db_engineer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_engineer)
    return db_engineer

def delete_engineer(db: Session, engineer_id: UUID) -> None:
    """
    Delete a field engineer record in PostgreSQL if no child records exist.
    """
    # 1. Find engineer
    db_engineer = db.get(Engineer, engineer_id)
    if db_engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # 2. Check related records in child tables
    has_skills = db.scalar(select(Skill).where(Skill.engineer_id == engineer_id).limit(1)) is not None
    has_schedules = db.scalar(select(Schedule).where(Schedule.engineer_id == engineer_id).limit(1)) is not None
    has_visas = db.scalar(select(Visa).where(Visa.engineer_id == engineer_id).limit(1)) is not None
    has_leaves = db.scalar(select(Leave).where(Leave.engineer_id == engineer_id).limit(1)) is not None

    if has_skills or has_schedules or has_visas or has_leaves:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Engineer cannot be deleted because related records exist."
        )

    # 3. Delete the engineer
    db.delete(db_engineer)
    db.commit()

