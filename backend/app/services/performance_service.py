from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.performance import Performance
from app.models.schedule import Schedule

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
