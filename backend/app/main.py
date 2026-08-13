import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, companies, engineers, skills, schedules, visa, travel, performance, leave, missed_schedule, dashboard, operational, reports

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI Application
app = FastAPI(
    title="ORBIT Resource Management Portal API",
    version="1.0.0"
)

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under prefix /api
app.include_router(health.router, prefix="/api")
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

@app.get("/")
def read_root():
    """
    Root endpoint redirecting or pointing to API docs.
    """
    return {
        "message": "Welcome to the ORBIT Resource Management Portal API. Please visit /docs for Swagger API documentation."
    }
