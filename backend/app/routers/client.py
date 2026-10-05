import logging
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services import client_service
from app.schemas.client import (
    ClientOverviewResponse,
    ClientCompanyShowcaseItem,
    ClientWorkforceResponse,
    ClientExpertiseResponse,
    ClientDeploymentsResponse,
    ClientGeographyResponse,
    ClientCompanyDetailResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client", tags=["client"], dependencies=[Depends(get_current_user)])


@router.get("/overview", response_model=ClientOverviewResponse)
def get_client_overview(
    company_id: Optional[UUID] = Query(None, description="Filter by single company UUID"),
    company_ids: Optional[List[UUID]] = Query(None, description="Filter by list of company UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve executive high-level capability overview and KPI metrics for authorized client companies.
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    return client_service.get_client_overview(db, current_user, company_ids=target_cids)


@router.get("/companies", response_model=List[ClientCompanyShowcaseItem])
def get_client_companies(
    company_id: Optional[UUID] = Query(None, description="Filter by single company UUID"),
    company_ids: Optional[List[UUID]] = Query(None, description="Filter by list of company UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve showcase cards of authorized client companies.
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    return client_service.get_client_companies(db, current_user, company_ids=target_cids)


@router.get("/companies/{company_id}", response_model=ClientCompanyDetailResponse)
def get_client_company_detail(
    company_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve deep-dive presentation overview for a specific authorized company.
    """
    return client_service.get_client_company_detail(db, current_user, company_id=company_id)


@router.get("/workforce", response_model=ClientWorkforceResponse)
def get_client_workforce(
    company_id: Optional[UUID] = Query(None, description="Filter by single company UUID"),
    company_ids: Optional[List[UUID]] = Query(None, description="Filter by list of company UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve aggregate workforce distribution metrics without exposing PII.
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    return client_service.get_client_workforce(db, current_user, company_ids=target_cids)


@router.get("/expertise", response_model=ClientExpertiseResponse)
def get_client_expertise(
    company_id: Optional[UUID] = Query(None, description="Filter by single company UUID"),
    company_ids: Optional[List[UUID]] = Query(None, description="Filter by list of company UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve technology & tool expertise taxonomy breakdown (LAM Process/Family/Product & Axcelis ION tools).
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    return client_service.get_client_expertise(db, current_user, company_ids=target_cids)


@router.get("/deployments", response_model=ClientDeploymentsResponse)
def get_client_deployments(
    company_id: Optional[UUID] = Query(None, description="Filter by single company UUID"),
    company_ids: Optional[List[UUID]] = Query(None, description="Filter by list of company UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve aggregate deployment experience, duration buckets, and yearly trends.
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    return client_service.get_client_deployments(db, current_user, company_ids=target_cids)


@router.get("/geography", response_model=ClientGeographyResponse)
def get_client_geography(
    company_id: Optional[UUID] = Query(None, description="Filter by single company UUID"),
    company_ids: Optional[List[UUID]] = Query(None, description="Filter by list of company UUIDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve aggregate country distribution data for the global presence map.
    """
    target_cids = company_ids
    if target_cids is None and company_id is not None:
        target_cids = [company_id]

    return client_service.get_client_geography(db, current_user, company_ids=target_cids)
