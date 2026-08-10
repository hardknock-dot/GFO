from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from app.models.engineer import Engineer

def get_engineers(db: Session) -> List[Engineer]:
    """
    Retrieve engineer records from PostgreSQL.
    """
    stmt = select(Engineer)
    result = db.scalars(stmt).all()
    return list(result)

def get_engineer_by_id(db: Session, engineer_id: UUID) -> Optional[Engineer]:
    """
    Retrieve a single engineer by UUID from PostgreSQL.
    """
    return db.get(Engineer, engineer_id)

