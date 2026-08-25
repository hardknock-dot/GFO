import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.company import CompanyResponse
from app.services import company_service
from app.services.auth_service import get_current_user, is_main_admin
from app.models.user import User

logger = logging.getLogger(__name__)

from uuid import UUID
from app.schemas.company import CompanyResponse, CompanyCreate, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])

@router.get("", response_model=List[CompanyResponse])
def read_companies(include_inactive: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieve active companies.
    """
    try:
        companies = company_service.get_companies(db, include_inactive=include_inactive or is_main_admin(current_user))
        if is_main_admin(current_user):
            return companies
        
        accessible_ids = set()
        if getattr(current_user, 'accessible_company_ids', None):
            for cid in current_user.accessible_company_ids.split(','):
                cid_str = cid.strip()
                if cid_str:
                    accessible_ids.add(cid_str)
        if current_user.company_id:
            accessible_ids.add(str(current_user.company_id))

        return [c for c in companies if str(c.company_id) in accessible_ids]
    except Exception as e:
        logger.error("Error retrieving companies from database: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve companies from database"
        )

@router.post("", response_model=CompanyResponse)
def create_company_endpoint(data: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not is_main_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Main Admin can create companies")
    return company_service.create_company(db, data)

@router.put("/{company_id}", response_model=CompanyResponse)
def update_company_endpoint(company_id: UUID, data: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not is_main_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Main Admin can update companies")
    try:
        return company_service.update_company(db, company_id, data)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))

@router.delete("/{company_id}")
def delete_company_endpoint(company_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not is_main_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Main Admin can delete companies")
    company_service.delete_company(db, company_id)
    return {"message": "Company deleted successfully"}
