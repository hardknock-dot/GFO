import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from sqlalchemy import text
from app.routers import (
    health, companies, engineers, skills, schedules, visa, travel,
    performance, leave, missed_schedule, dashboard, operational,
    reports, auth, users, upload, engineer_me, engineer_deletion_requests,
    admin, delete_requests
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Startup table initialization & safe column migrations
try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS comment_adressal BOOLEAN NULL;"))
        try:
            conn.execute(text("ALTER TABLE schedules ALTER COLUMN comment_adressal DROP DEFAULT;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE schedules ALTER COLUMN comment_adressal DROP NOT NULL;"))
        except Exception:
            pass
        conn.execute(text("UPDATE schedules SET comment_adressal = FALSE WHERE remarks IS NOT NULL AND TRIM(remarks) != '' AND comment_adressal IS NULL AND (comment_status IS NULL OR comment_status = 'UNADDRESSED');"))
        conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS comment_status VARCHAR(30) DEFAULT 'UNADDRESSED';"))
        conn.execute(text("ALTER TABLE visa_details ADD COLUMN IF NOT EXISTS comment_status VARCHAR(30) DEFAULT 'UNADDRESSED';"))
        conn.execute(text("ALTER TABLE engineer_deletion_requests ALTER COLUMN engineer_id DROP NOT NULL;"))
        conn.execute(text("ALTER TABLE engineers ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1000);"))
        
        # Add performance indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_engineers_company_id ON engineers(company_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_engineers_orbit_id ON engineers(orbit_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_schedules_engineer_id ON schedules(engineer_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_skills_engineer_id ON skills(engineer_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_visa_details_engineer_id ON visa_details(engineer_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_leaves_engineer_id ON leaves(engineer_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_travel_arrangements_schedule_id ON travel_arrangements(schedule_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_performances_schedule_id ON performances(schedule_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_missed_schedules_schedule_id ON missed_schedules(schedule_id);"))
        conn.commit()
except Exception as err:
    logger.warning("Startup DB table initialization notice: %s", err)

# Initialize FastAPI Application
app = FastAPI(
    title="ORBIT Resource Management Portal API",
    version="1.0.0"
)

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under prefix /api
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(delete_requests.router, prefix="/api")
app.include_router(engineer_me.router, prefix="/api")
app.include_router(engineer_deletion_requests.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(engineers.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(schedules.router, prefix="/api")
app.include_router(visa.router, prefix="/api")
app.include_router(travel.router, prefix="/api")
app.include_router(performance.router, prefix="/api")
app.include_router(leave.router, prefix="/api")
app.include_router(missed_schedule.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(operational.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(upload.router, prefix="/api")




@app.get("/")
def read_root():
    """
    Root endpoint redirecting or pointing to API docs.
    """
    return {
        "message": "Welcome to the ORBIT Resource Management Portal API. Please visit /docs for Swagger API documentation."
    }
app.include_router(leave.router, prefix="/api")
app.include_router(missed_schedule.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(operational.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(upload.router, prefix="/api")




@app.get("/")
def read_root():
    """
    Root endpoint redirecting or pointing to API docs.
    """
    return {
        "message": "Welcome to the ORBIT Resource Management Portal API. Please visit /docs for Swagger API documentation."
    }
