import os
import json
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Any

# Resolve .env path relative to config.py (config.py is in backend/app/, .env is in backend/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    DATABASE_URL: str
    CORS_ORIGINS: Any = [
        "https://gfo-alpha.vercel.app",
        "https://gfo-one.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    JWT_SECRET_KEY: str = "ormp_super_secret_signing_key_production_grade_998877!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    return json.loads(v_str)
                except Exception:
                    pass
            return [origin.strip() for origin in v_str.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple, set)):
            return list(v)
        return [
            "https://gfo-alpha.vercel.app",
            "https://gfo-one.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ]

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
