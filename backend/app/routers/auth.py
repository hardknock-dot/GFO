from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.schemas.user import UserLoginRequest, UserMeResponse, TokenResponse
from app.services.security import verify_password, create_access_token
from app.services.auth_service import get_current_user, is_main_admin, get_user_authorized_company_ids, get_user_company_summaries
from app.services.audit_service import log_audit

router = APIRouter(prefix="/auth", tags=["auth"])

def get_accessible_companies(db: Session, user: User) -> List[str]:
    cids = get_user_authorized_company_ids(db, user)
    res = [str(c) for c in cids]
    if is_main_admin(user):
        res.append("all-data")
    return res

@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    stmt = select(User).where(User.email == request.email)
    user = db.scalar(stmt)
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please verify your credentials."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Account is inactive."
        )

    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    log_audit(
        db=db,
        user_id=user.user_id,
        company_id=user.company_id,
        action="LOGIN",
        entity_type="User",
        entity_id=user.user_id,
        description=f"User logged in: {user.full_name} ({user.role})"
    )

    token = create_access_token({"sub": str(user.user_id)})
    accessible = get_accessible_companies(db, user)
    comp_summaries = get_user_company_summaries(db, user)
    
    user_me = UserMeResponse(
        id=user.user_id,
        name=user.full_name,
        email=user.email,
        role=user.role,
        currentCompanyId=user.company_id,
        engineer_id=user.engineer_id,
        engineerId=user.engineer_id,
        accessibleCompanies=accessible,
        companies=comp_summaries
    )
    
    return TokenResponse(token=token, user=user_me)

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible = get_accessible_companies(db, current_user)
    comp_summaries = get_user_company_summaries(db, current_user)
    return UserMeResponse(
        id=current_user.user_id,
        name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        currentCompanyId=current_user.company_id,
        engineer_id=current_user.engineer_id,
        engineerId=current_user.engineer_id,
        accessibleCompanies=accessible,
        companies=comp_summaries
    )

@router.post("/logout")
def logout(current_user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user:
        log_audit(
            db=db,
            user_id=current_user.user_id,
            company_id=current_user.company_id,
            action="LOGOUT",
            entity_type="User",
            entity_id=current_user.user_id,
            description=f"User logged out: {current_user.full_name}"
        )
    return {"success": True}

@router.post("/refresh")
def refresh(current_user: User = Depends(get_current_user)):
    token = create_access_token({"sub": str(current_user.user_id)})
    return {"token": token}
