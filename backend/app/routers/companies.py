import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.company import CompanyResponse
from app.services import company_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["companies"])

@router.get("", response_model=List[CompanyResponse])
def read_companies(db: Session = Depends(get_db)):
    """
    Retrieve active companies.
    """
    try:
        return company_service.get_companies(db)
    except Exception as e:
        logger.error("Error retrieving companies from database: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve companies from database"
        )
