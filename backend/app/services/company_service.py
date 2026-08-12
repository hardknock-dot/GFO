from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from app.models.company import Company

def get_companies(db: Session) -> List[Company]:
    """
    Retrieve active companies from PostgreSQL.
    """
    stmt = select(Company).where(Company.is_active == True)
    result = db.scalars(stmt).all()
    return list(result)

def get_company_by_id(db: Session, company_id: UUID) -> Optional[Company]:
    """
    Retrieve a single company by UUID from PostgreSQL.
    """
    return db.get(Company, company_id)

