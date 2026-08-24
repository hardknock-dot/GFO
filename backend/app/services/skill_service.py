from sqlalchemy import select, and_, or_, func
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import uuid
import math
from datetime import datetime

from app.models.skill import Skill
from app.models.engineer import Engineer
from app.schemas.skill import SkillCreate, SkillUpdate
from fastapi import HTTPException, status

def get_skills_paginated(
    db: Session,
    company_id: Optional[Union[UUID, List[UUID]]] = None,
    engineer_id: Optional[UUID] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    stmt = select(Skill).join(Engineer, Skill.engineer_id == Engineer.engineer_id)
    
    conditions = []
    if company_id is not None:
        if isinstance(company_id, (list, set, tuple)):
            conditions.append(Engineer.company_id.in_(company_id))
        else:
            conditions.append(Engineer.company_id == company_id)

    if engineer_id:
        conditions.append(Skill.engineer_id == engineer_id)

    if category:
        conditions.append(Skill.tool_type.ilike(f"%{category}%"))

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                Skill.tool_type.ilike(search_pattern),
                Skill.country.ilike(search_pattern),
                Skill.fab.ilike(search_pattern),
                Skill.role.ilike(search_pattern),
                Skill.comments.ilike(search_pattern),
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
    stmt = stmt.order_by(Skill.created_at.desc()).offset(offset).limit(page_size)

    items = list(db.scalars(stmt).all())

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }

def get_engineer_skills(db: Session, engineer_id: UUID) -> List[Skill]:
    """
    Retrieve skill-matrix records associated with one engineer from PostgreSQL.
    """
    stmt = select(Skill).where(Skill.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)

def create_skill(db: Session, engineer_id: UUID, skill_data: SkillCreate) -> Skill:
    """
    Create a new skill record associated with one engineer.
    """
    # 1. Verify the engineer exists
    engineer = db.get(Engineer, engineer_id)
    if engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )

    # 2. Create the skill
    db_skill = Skill(
        skill_id=uuid.uuid4(),
        engineer_id=engineer_id,
        country=skill_data.country,
        fab=skill_data.fab,
        wafer_size=skill_data.wafer_size,
        tool_type=skill_data.tool_type,
        start_date=skill_data.start_date,
        end_date=skill_data.end_date,
        number_of_tools=skill_data.number_of_tools,
        role=skill_data.role,
        previous_process_startup=skill_data.previous_process_startup,
        previous_cm_pm=skill_data.previous_cm_pm,
        ready_for_primary_role=skill_data.ready_for_primary_role,
        comments=skill_data.comments,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

def update_skill(db: Session, skill_id: UUID, skill_data: SkillUpdate) -> Skill:
    """
    Update an existing skill record.
    """
    # 1. Find the skill
    db_skill = db.get(Skill, skill_id)
    if db_skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )

    # 2. Update allowed fields
    if skill_data.country is not None:
        db_skill.country = skill_data.country
    if skill_data.fab is not None:
        db_skill.fab = skill_data.fab
    if skill_data.wafer_size is not None:
        db_skill.wafer_size = skill_data.wafer_size
    if skill_data.tool_type is not None:
        db_skill.tool_type = skill_data.tool_type
    if skill_data.start_date is not None:
        db_skill.start_date = skill_data.start_date
    if skill_data.end_date is not None:
        db_skill.end_date = skill_data.end_date
    if skill_data.number_of_tools is not None:
        db_skill.number_of_tools = skill_data.number_of_tools
    if skill_data.role is not None:
        db_skill.role = skill_data.role
    if skill_data.previous_process_startup is not None:
        db_skill.previous_process_startup = skill_data.previous_process_startup
    if skill_data.previous_cm_pm is not None:
        db_skill.previous_cm_pm = skill_data.previous_cm_pm
    if skill_data.ready_for_primary_role is not None:
        db_skill.ready_for_primary_role = skill_data.ready_for_primary_role
    if skill_data.comments is not None:
        db_skill.comments = skill_data.comments

    db_skill.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_skill)
    return db_skill

def delete_skill(db: Session, skill_id: UUID) -> None:
    """
    Delete a skill record.
    """
    # 1. Find the skill
    db_skill = db.get(Skill, skill_id)
    if db_skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )

    # 2. Delete the skill
    db.delete(db_skill)
    db.commit()
