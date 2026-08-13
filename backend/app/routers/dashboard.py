import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.schemas.dashboard import DashboardMetricsResponse
from app.services import dashboard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardMetricsResponse)
def get_dashboard(
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant filtering"),
    db: Session = Depends(get_db)
):
    """
    Retrieve operational dashboard metrics backed by real PostgreSQL data.
    If company_id is provided, returns metrics filtered for that company.
    If company_id is omitted, returns global (Master All Data) metrics.
    """
    return dashboard_service.get_dashboard_metrics(db, company_id=company_id)
