import uuid
import logging
from datetime import datetime
from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.company_theme import CompanyThemeSettings
from app.models.company import Company
from app.models.user import User
from app.schemas.company_theme import CompanyThemeUpdate, CompanyThemeResponse, ALLOWED_THEME_KEYS
from app.services.audit_service import log_audit, object_to_dict

logger = logging.getLogger(__name__)

INITIAL_COMPANY_THEME_MAP = {
    UUID("11b9d863-b83c-4af3-8db5-b6e773f78235"): "lam",
    UUID("f81bd16c-2f63-4818-a653-7486fe3f45ec"): "axcelis",
    UUID("34d51cd0-fb63-4684-96a3-662477298678"): "vishay",
}

def build_company_theme_response(theme: CompanyThemeSettings) -> CompanyThemeResponse:
    """
    Serialize CompanyThemeSettings into CompanyThemeResponse.
    """
    key = theme.theme_key if theme.theme_key in ALLOWED_THEME_KEYS else "default"
    return CompanyThemeResponse(
        company_theme_id=theme.company_theme_id,
        company_id=theme.company_id,
        theme_key=key,
        created_at=theme.created_at,
        updated_at=theme.updated_at,
    )

def get_or_create_company_theme(db: Session, company_id: UUID) -> CompanyThemeSettings:
    """
    Retrieve or create default CompanyThemeSettings for a target company_id.
    Auto-seeds preset company theme key if no database row exists.
    """
    theme = db.scalar(
        select(CompanyThemeSettings).where(CompanyThemeSettings.company_id == company_id)
    )

    if not theme:
        initial_key = INITIAL_COMPANY_THEME_MAP.get(company_id, "default")
        theme = CompanyThemeSettings(
            company_theme_id=uuid.uuid4(),
            company_id=company_id,
            theme_key=initial_key,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(theme)
        db.commit()
        db.refresh(theme)
    elif not theme.theme_key or theme.theme_key not in ALLOWED_THEME_KEYS:
        # Fallback invalid/empty theme_key to default or initial preset
        initial_key = INITIAL_COMPANY_THEME_MAP.get(company_id, "default")
        theme.theme_key = initial_key
        theme.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(theme)

    return theme

def update_company_theme(
    db: Session,
    company_id: UUID,
    req: CompanyThemeUpdate,
    current_user: User
) -> CompanyThemeSettings:
    """
    Update theme settings for target company context and record audit trail.
    """
    comp = db.get(Company, company_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company context not found."
        )

    theme = get_or_create_company_theme(db, company_id)
    old_theme_key = theme.theme_key

    new_key = req.theme_key.strip().lower() if req.theme_key else "default"
    if new_key not in ALLOWED_THEME_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid theme_key '{req.theme_key}'. Allowed values are: 'lam', 'axcelis', 'vishay', 'default'."
        )

    theme.theme_key = new_key
    theme.updated_at = datetime.utcnow()
    
    db.add(theme)
    db.commit()
    db.refresh(theme)

    # Record Audit Log
    log_audit(
        db=db,
        user_id=current_user.user_id,
        company_id=company_id,
        action="UPDATE_COMPANY_THEME",
        entity_type="CompanyThemeSettings",
        entity_id=theme.company_theme_id,
        description=f"Company theme updated to '{new_key}' for {comp.company_name}",
        old_values={"theme_key": old_theme_key},
        new_values={"theme_key": new_key}
    )

    return theme

