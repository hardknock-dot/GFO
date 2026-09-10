import logging
import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.company_settings import CompanySettings
from app.models.company import Company
from app.models.user import User
from app.schemas.company_settings import CompanySettingsUpdateRequest
from app.services.audit_service import log_audit

logger = logging.getLogger(__name__)

def get_or_create_company_settings(db: Session, company_id: UUID) -> CompanySettings:
    """
    Retrieve company settings for a given company_id.
    If no record exists, dynamically create a safe default configuration.
    """
    settings = db.scalar(select(CompanySettings).where(CompanySettings.company_id == company_id))
    if not settings:
        settings = CompanySettings(
            setting_id=uuid.uuid4(),
            company_id=company_id,
            visa_expiration_days=30,
            visa_alerts_enabled=True,
            deployment_alerts_enabled=True,
            travel_alerts_enabled=True,
            leave_alerts_enabled=True,
            missed_schedule_alerts_enabled=True,
            operational_remark_alerts_enabled=True,
            performance_alerts_enabled=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_company_settings(
    db: Session,
    company_id: UUID,
    req: CompanySettingsUpdateRequest,
    current_user: User
) -> CompanySettings:
    """
    Update company configuration and log all changed threshold/alert values in audit_logs.
    """
    settings = get_or_create_company_settings(db, company_id)

    old_values: Dict[str, Any] = {
        "visa_expiration_days": settings.visa_expiration_days,
        "visa_alerts_enabled": settings.visa_alerts_enabled,
        "deployment_alerts_enabled": settings.deployment_alerts_enabled,
        "travel_alerts_enabled": settings.travel_alerts_enabled,
        "leave_alerts_enabled": settings.leave_alerts_enabled,
        "missed_schedule_alerts_enabled": settings.missed_schedule_alerts_enabled,
        "operational_remark_alerts_enabled": settings.operational_remark_alerts_enabled,
        "performance_alerts_enabled": settings.performance_alerts_enabled,
    }

    new_values: Dict[str, Any] = {}
    changes_desc = []

    if req.visa_expiration_days is not None and req.visa_expiration_days != settings.visa_expiration_days:
        changes_desc.append(f"visa_expiration_days: {settings.visa_expiration_days} -> {req.visa_expiration_days}")
        settings.visa_expiration_days = req.visa_expiration_days
        new_values["visa_expiration_days"] = req.visa_expiration_days

    if req.visa_alerts_enabled is not None and req.visa_alerts_enabled != settings.visa_alerts_enabled:
        changes_desc.append(f"visa_alerts_enabled: {settings.visa_alerts_enabled} -> {req.visa_alerts_enabled}")
        settings.visa_alerts_enabled = req.visa_alerts_enabled
        new_values["visa_alerts_enabled"] = req.visa_alerts_enabled

    if req.deployment_alerts_enabled is not None and req.deployment_alerts_enabled != settings.deployment_alerts_enabled:
        changes_desc.append(f"deployment_alerts_enabled: {settings.deployment_alerts_enabled} -> {req.deployment_alerts_enabled}")
        settings.deployment_alerts_enabled = req.deployment_alerts_enabled
        new_values["deployment_alerts_enabled"] = req.deployment_alerts_enabled

    if req.travel_alerts_enabled is not None and req.travel_alerts_enabled != settings.travel_alerts_enabled:
        changes_desc.append(f"travel_alerts_enabled: {settings.travel_alerts_enabled} -> {req.travel_alerts_enabled}")
        settings.travel_alerts_enabled = req.travel_alerts_enabled
        new_values["travel_alerts_enabled"] = req.travel_alerts_enabled

    if req.leave_alerts_enabled is not None and req.leave_alerts_enabled != settings.leave_alerts_enabled:
        changes_desc.append(f"leave_alerts_enabled: {settings.leave_alerts_enabled} -> {req.leave_alerts_enabled}")
        settings.leave_alerts_enabled = req.leave_alerts_enabled
        new_values["leave_alerts_enabled"] = req.leave_alerts_enabled

    if req.missed_schedule_alerts_enabled is not None and req.missed_schedule_alerts_enabled != settings.missed_schedule_alerts_enabled:
        changes_desc.append(f"missed_schedule_alerts_enabled: {settings.missed_schedule_alerts_enabled} -> {req.missed_schedule_alerts_enabled}")
        settings.missed_schedule_alerts_enabled = req.missed_schedule_alerts_enabled
        new_values["missed_schedule_alerts_enabled"] = req.missed_schedule_alerts_enabled

    if req.operational_remark_alerts_enabled is not None and req.operational_remark_alerts_enabled != settings.operational_remark_alerts_enabled:
        changes_desc.append(f"operational_remark_alerts_enabled: {settings.operational_remark_alerts_enabled} -> {req.operational_remark_alerts_enabled}")
        settings.operational_remark_alerts_enabled = req.operational_remark_alerts_enabled
        new_values["operational_remark_alerts_enabled"] = req.operational_remark_alerts_enabled

    if req.performance_alerts_enabled is not None and req.performance_alerts_enabled != settings.performance_alerts_enabled:
        changes_desc.append(f"performance_alerts_enabled: {settings.performance_alerts_enabled} -> {req.performance_alerts_enabled}")
        settings.performance_alerts_enabled = req.performance_alerts_enabled
        new_values["performance_alerts_enabled"] = req.performance_alerts_enabled

    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)

    if changes_desc:
        comp = db.get(Company, company_id)
        comp_name = comp.company_name if comp else str(company_id)
        filtered_old = {k: old_values[k] for k in new_values.keys()}
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=company_id,
            action="SETTINGS_CHANGED",
            entity_type="CompanySettings",
            entity_id=settings.setting_id,
            description=f"Admin {current_user.full_name} updated settings for {comp_name}: {', '.join(changes_desc)}",
            old_values=filtered_old,
            new_values=new_values
        )

    return settings
