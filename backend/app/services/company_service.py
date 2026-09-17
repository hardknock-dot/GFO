import logging
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from app.models.company import Company
from app.models.company_theme import CompanyThemeSettings

import uuid
from datetime import datetime
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.services.company_theme_service import get_or_create_company_theme

logger = logging.getLogger(__name__)

def get_companies(db: Session, include_inactive: bool = False) -> List[Company]:
    """
    Retrieve companies from PostgreSQL and populate theme_key.
    """
    if include_inactive:
        stmt = select(Company)
    else:
        stmt = select(Company).where(Company.is_active == True)
    companies = list(db.scalars(stmt).all())
    for comp in companies:
        theme = get_or_create_company_theme(db, comp.company_id)
        setattr(comp, "theme_key", theme.theme_key if theme else "default")
    return companies

def get_company_by_id(db: Session, company_id: UUID) -> Optional[Company]:
    """
    Retrieve a single company by UUID from PostgreSQL and populate theme_key.
    """
    comp = db.get(Company, company_id)
    if comp:
        theme = get_or_create_company_theme(db, comp.company_id)
        setattr(comp, "theme_key", theme.theme_key if theme else "default")
    return comp

from app.schemas.company_theme import ALLOWED_THEME_KEYS

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

    # Create associated company_theme_settings row
    tk = str(data.theme_key).strip().lower() if data.theme_key else "default"
    if tk not in ALLOWED_THEME_KEYS:
        tk = "default"

    theme = CompanyThemeSettings(
        company_theme_id=uuid.uuid4(),
        company_id=comp.company_id,
        theme_key=tk,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(theme)
    db.commit()

    setattr(comp, "theme_key", tk)
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

    if data.theme_key is not None:
        tk = str(data.theme_key).strip().lower()
        if tk in ALLOWED_THEME_KEYS:
            theme = get_or_create_company_theme(db, company_id)
            theme.theme_key = tk
            theme.updated_at = datetime.utcnow()
            db.add(theme)

    db.commit()
    db.refresh(comp)


    theme = get_or_create_company_theme(db, company_id)
    setattr(comp, "theme_key", theme.theme_key if theme else "default")
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
        # 1. Performance evaluations & missed schedules (via schedule_id)
        ("DELETE FROM performances WHERE schedule_id IN (SELECT schedule_id FROM schedules WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid))", cid_param),
        ("DELETE FROM missed_schedules WHERE schedule_id IN (SELECT schedule_id FROM schedules WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid))", cid_param),
        
        # 2. Engineer skills
        ("DELETE FROM skills WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        
        # 3. Operational entities by engineer_id or company_id
        ("DELETE FROM travel_arrangements WHERE schedule_id IN (SELECT schedule_id FROM schedules WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid))", cid_param),
        ("DELETE FROM schedules WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        ("DELETE FROM visa_details WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        ("DELETE FROM leaves WHERE engineer_id IN (SELECT engineer_id FROM engineers WHERE company_id = :cid)", cid_param),
        ("DELETE FROM bulk_uploads WHERE company_id = :cid", cid_param),
        ("DELETE FROM delete_requests WHERE company_id = :cid", cid_param),
        ("DELETE FROM engineer_deletion_requests WHERE company_id = :cid", cid_param),
        ("DELETE FROM user_companies WHERE company_id = :cid", cid_param),
        ("DELETE FROM company_theme_settings WHERE company_id = :cid", cid_param),
        ("DELETE FROM company_settings WHERE company_id = :cid", cid_param),
        
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
        except Exception as err:
            logger.warning("Cascade delete query failed (%s): %s", stmt, str(err))
            db.rollback()

    # 6. Hard delete the company record itself
    comp = db.get(Company, company_id)
    if comp:
        db.delete(comp)
        db.commit()


