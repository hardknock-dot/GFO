from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from app.models.company import Company

def get_companies(db: Session) -> List[Company]:
    """
    Retrieve active companies from PostgreSQL.
    """
    stmt = select(Company).where(Company.is_active == True)
    result = db.scalars(stmt).all()
    return list(result)
