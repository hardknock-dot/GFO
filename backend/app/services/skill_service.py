from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.skill import Skill

def get_engineer_skills(db: Session, engineer_id: UUID) -> List[Skill]:
    """
    Retrieve skill-matrix records associated with one engineer from PostgreSQL.
    """
    stmt = select(Skill).where(Skill.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)
