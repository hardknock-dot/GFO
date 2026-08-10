from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.missed_schedule import MissedSchedule
from app.models.schedule import Schedule

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
