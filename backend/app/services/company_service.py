from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from app.models.company import Company

import uuid
from datetime import datetime
from app.schemas.company import CompanyCreate, CompanyUpdate

def get_companies(db: Session, include_inactive: bool = False) -> List[Company]:
    """
    Retrieve companies from PostgreSQL.
    """
    if include_inactive:
        stmt = select(Company)
    else:
        stmt = select(Company).where(Company.is_active == True)
    result = db.scalars(stmt).all()
    return list(result)

def get_company_by_id(db: Session, company_id: UUID) -> Optional[Company]:
    """
    Retrieve a single company by UUID from PostgreSQL.
    """
    return db.get(Company, company_id)

def create_company(db: Session, data: CompanyCreate) -> Company:
    comp = Company(
        company_id=uuid.uuid4(),
        company_name=data.company_name,
        short_name=data.short_name,
        logo=data.logo,
        is_active=data.is_active,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

def update_company(db: Session, company_id: UUID, data: CompanyUpdate) -> Company:
    comp = db.get(Company, company_id)
    if not comp:
        raise ValueError("Company not found")
    if data.company_name is not None:
        comp.company_name = data.company_name
    if data.short_name is not None:
        comp.short_name = data.short_name
    if data.logo is not None:
        comp.logo = data.logo
    if data.is_active is not None:
        comp.is_active = data.is_active
    comp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comp)
    return comp

def delete_company(db: Session, company_id: UUID) -> None:
    comp = db.get(Company, company_id)
    if comp:
        db.delete(comp)
        db.commit()

