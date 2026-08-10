from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.leave import Leave

def get_engineer_leaves(db: Session, engineer_id: UUID) -> List[Leave]:
    """
    Retrieve all leave records associated with one engineer from PostgreSQL.
    """
    stmt = select(Leave).where(Leave.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)
