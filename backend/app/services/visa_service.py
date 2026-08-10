from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.models.visa import Visa

def get_engineer_visa(db: Session, engineer_id: UUID) -> List[Visa]:
    """
    Retrieve all visa records associated with one engineer from PostgreSQL.
    """
    stmt = select(Visa).where(Visa.engineer_id == engineer_id)
    result = db.scalars(stmt).all()
    return list(result)
