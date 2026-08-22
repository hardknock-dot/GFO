import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.database import get_db
from app.schemas.dashboard import DashboardMetricsResponse
from app.services import dashboard_service
from app.services.auth_service import get_current_user, enforce_company_isolation
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=DashboardMetricsResponse)
def get_dashboard(
    company_id: Optional[UUID] = Query(None, description="Single Company UUID for tenant filtering"),
    company_ids: Optional[List[UUID]] = Query(None, description="List of Company UUIDs for multi-tenant aggregation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve operational dashboard metrics backed by real PostgreSQL data.
    Supports single company_id or multiple company_ids[]=... parameters.
    Enforces strict backend authorization: returns 403 Forbidden if any requested company is unauthorized.
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    validated_cids = enforce_company_isolation(db, current_user, target_cids)
    return dashboard_service.get_dashboard_metrics(db, company_ids=validated_cids)
