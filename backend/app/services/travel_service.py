from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.travel import Travel
from app.models.schedule import Schedule

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
