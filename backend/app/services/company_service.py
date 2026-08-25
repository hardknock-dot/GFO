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

from sqlalchemy import text

def delete_company(db: Session, company_id: UUID) -> None:
    comp = db.get(Company, company_id)
    if not comp:
        return

    cid_param = {"cid": company_id}

    # Drop NOT NULL constraint on users.company_id if present
    try:
        db.execute(text("ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;"))
        db.commit()
    except Exception:
        db.rollback()

    # Safe cascade deletion queries in dependency order:
    cascade_queries = [
        # 1. Performance evaluations & missed schedules
        ("DELETE FROM performance_evaluations WHERE schedule_id IN (SELECT schedule_id FROM schedules WHERE company_id = :cid) OR engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        ("DELETE FROM missed_schedules WHERE schedule_id IN (SELECT schedule_id FROM schedules WHERE company_id = :cid)", cid_param),
        
        # 2. Engineer skills
        ("DELETE FROM engineer_skills WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        
        # 3. Operational entities by company_id
        ("DELETE FROM schedules WHERE company_id = :cid", cid_param),
        ("DELETE FROM visa_details WHERE company_id = :cid", cid_param),
        ("DELETE FROM travel_details WHERE company_id = :cid", cid_param),
        ("DELETE FROM leaves WHERE company_id = :cid", cid_param),
        ("DELETE FROM bulk_uploads WHERE company_id = :cid", cid_param),
        ("DELETE FROM general_delete_requests WHERE company_id = :cid", cid_param),
        ("DELETE FROM user_company_access WHERE company_id = :cid", cid_param),
        
        # 4. Engineers
        ("UPDATE users SET engineer_id = NULL WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        ("DELETE FROM engineers WHERE company_id = :cid", cid_param),
        
        # 5. Users associated with company (Delete non-admins, set company_id=NULL for admins)
        ("DELETE FROM users WHERE company_id = :cid AND role NOT IN ('Main Admin', 'Global Admin')", cid_param),
        ("UPDATE users SET company_id = NULL WHERE company_id = :cid", cid_param),
    ]

    for stmt, params in cascade_queries:
        try:
            db.execute(text(stmt), params)
            db.commit()
        except Exception:
            db.rollback()

    # 6. Hard delete the company record itself
    comp = db.get(Company, company_id)
    if comp:
        db.delete(comp)
        db.commit()

