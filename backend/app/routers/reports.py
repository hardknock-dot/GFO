import logging
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.schemas.reports import ReportsSummaryResponse, CategoryReportResponse
from app.services import report_service
from app.services.auth_service import get_current_user, enforce_company_isolation, is_engineer_user
from app.models.user import User
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reports"], dependencies=[Depends(get_current_user)])

def check_not_engineer(user: User):
    if is_engineer_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Engineers cannot access global company reports."
        )

@router.get("/reports/summary", response_model=ReportsSummaryResponse)
def read_reports_summary(
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant scoping"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve executive management reporting summary metrics across all 9 operational modules.
    """
    check_not_engineer(current_user)
    company_id = enforce_company_isolation(current_user, company_id)
    return report_service.get_reports_summary(db, company_id=company_id, start_date=start_date, end_date=end_date)

@router.get("/reports/category/{category_name}", response_model=CategoryReportResponse)
def read_category_report(
    category_name: str,
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant scoping"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve detailed category breakdown report with chart distributions and data tables.
    """
    check_not_engineer(current_user)
    company_id = enforce_company_isolation(current_user, company_id)
    return report_service.get_category_report(db, category=category_name, company_id=company_id, start_date=start_date, end_date=end_date)

@router.get("/reports/export/csv")
def export_report_csv(
    category: str = Query("workforce", description="Category to export"),
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant scoping"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export tenant-isolated operational report as downloadable CSV.
    """
    check_not_engineer(current_user)
    company_id = enforce_company_isolation(current_user, company_id)
@router.get("/reports/feedback")
def read_feedback_report(
    company_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_not_engineer(current_user)
    company_id = enforce_company_isolation(current_user, company_id)
    return report_service.get_feedback_report(db, company_id=company_id, start_date=start_date, end_date=end_date)

@router.get("/reports/escalations")
def read_escalations_report(
    company_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_not_engineer(current_user)
    company_id = enforce_company_isolation(current_user, company_id)
    return report_service.get_escalations_report(db, company_id=company_id, start_date=start_date, end_date=end_date)

@router.get("/reports/deployments-by-country")
def read_deployments_by_country_report(
    company_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_not_engineer(current_user)
    company_id = enforce_company_isolation(current_user, company_id)
    return report_service.get_deployments_by_country_report(db, company_id=company_id, start_date=start_date, end_date=end_date)


