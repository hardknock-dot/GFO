import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.database import get_db
from app.schemas.operational import OperationalAlert
from app.services import operational_service
from app.services.auth_service import get_current_user, enforce_company_isolation, get_engineer_and_verify, get_schedule_and_verify
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["operational"], dependencies=[Depends(get_current_user)])

@router.get("/dashboard/operational-alerts", response_model=List[OperationalAlert])
def read_company_operational_alerts(
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant filtering"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve operational warnings, exception alerts, and validation insights.
    If company_id is provided, returns alerts filtered for that tenant.
    If company_id is omitted, returns global alerts across all companies.
    """
    company_id = enforce_company_isolation(db, current_user, company_id)
    return operational_service.get_company_operational_alerts(db, company_id=company_id)

@router.get("/engineers/{engineer_id}/operational-alerts", response_model=List[OperationalAlert])
def read_engineer_operational_alerts(
    engineer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve operational alerts for a specific field engineer.
    """
    get_engineer_and_verify(db, engineer_id, current_user)
    return operational_service.get_engineer_operational_alerts(db, engineer_id=engineer_id)

@router.get("/schedules/{schedule_id}/operational-alerts", response_model=List[OperationalAlert])
def read_schedule_operational_alerts(
    schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve operational alerts for a specific schedule assignment.
    """
    get_schedule_and_verify(db, schedule_id, current_user)
    return operational_service.get_schedule_operational_alerts(db, schedule_id=schedule_id)
