import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", response_model=dict)
def get_health():
    """
    Check the overall service health.
    """
    return {
        "status": "ok",
        "service": "ORMP API"
    }

@router.get("/database", response_model=dict)
def get_db_health(db: Session = Depends(get_db)):
    """
    Check the database connection health.
    """
    try:
        # Run a simple lightweight query to verify the connection
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        # Log the internal error but return a clean error message to the client
        logger.error("Database health check failed: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable"
        )
