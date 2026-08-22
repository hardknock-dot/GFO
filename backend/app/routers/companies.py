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

router = APIRouter(prefix="/companies", tags=["companies"])

@router.get("", response_model=List[CompanyResponse])
def read_companies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieve active companies.
    """
    try:
        companies = company_service.get_companies(db)
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
