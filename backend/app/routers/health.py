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

@router.get("/diagnostic", response_model=dict)
def get_db_diagnostic(db: Session = Depends(get_db)):
    """
    Safe diagnostic returning database host, database name, server version, and current database user.
    NEVER exposes passwords or secrets.
    """
    try:
        row = db.execute(text("SELECT inet_server_addr(), inet_server_port(), current_database(), current_user, version()")).fetchone()
        server_addr = str(row[0]) if row and row[0] else ""
        server_port = str(row[1]) if row and row[1] else ""
        db_name = str(row[2]) if row and row[2] else ""
        db_user = str(row[3]) if row and row[3] else ""
        db_version = str(row[4]) if row and row[4] else ""
        
        host = getattr(engine.url, "host", "") or ""
        port = getattr(engine.url, "port", "") or ""
        
        return {
            "status": "ok",
            "host": host,
            "port": port,
            "server_addr": server_addr,
            "database_name": db_name,
            "db_user": db_user,
            "server_version": db_version,
            "is_supabase": "supabase" in host.lower() or "supabase" in server_addr.lower()
        }
    except Exception as e:
        logger.error("Diagnostic check failed: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostic error: {str(e)}"
        )
