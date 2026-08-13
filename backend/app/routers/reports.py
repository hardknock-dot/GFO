import logging
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.schemas.reports import ReportsSummaryResponse, CategoryReportResponse
from app.services import report_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reports"])

@router.get("/reports/summary", response_model=ReportsSummaryResponse)
def read_reports_summary(
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant scoping"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    db: Session = Depends(get_db)
):
    """
    Retrieve executive management reporting summary metrics across all 9 operational modules.
    """
    return report_service.get_reports_summary(db, company_id=company_id, start_date=start_date, end_date=end_date)

@router.get("/reports/category/{category_name}", response_model=CategoryReportResponse)
def read_category_report(
    category_name: str,
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant scoping"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    db: Session = Depends(get_db)
):
    """
    Retrieve detailed category breakdown report with chart distributions and data tables.
    """
    return report_service.get_category_report(db, category=category_name, company_id=company_id, start_date=start_date, end_date=end_date)

@router.get("/reports/export/csv")
def export_report_csv(
    category: str = Query("workforce", description="Category to export"),
    company_id: Optional[UUID] = Query(None, description="Optional Company UUID for tenant scoping"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    db: Session = Depends(get_db)
):
    """
    Export tenant-isolated operational report as downloadable CSV.
    """
    csv_content = report_service.export_report_csv(db, category=category, company_id=company_id, start_date=start_date, end_date=end_date)
    filename = f"ORMP_Report_{category.title()}_{date.today()}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
