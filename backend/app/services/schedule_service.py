from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.schedule import Schedule

def get_engineer_schedules(db: Session, engineer_id: UUID) -> List[Schedule]:
    """
    Retrieve all schedule records associated with one engineer from PostgreSQL.
    """
    stmt = select(Schedule).where(Schedule.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)
