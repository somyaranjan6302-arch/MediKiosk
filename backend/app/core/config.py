import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "MediKiosk"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Secret Key for Local Fallback Tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "MediKiosk_SecretKey_Production_2026_ReplaceInProd")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Primary Database (PostgreSQL with SQLite local dev fallback)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./medikiosk_dev.db"
    )

    # Redis Cache / WebSocket PubSub
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # MinIO S3 Object Storage
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "MinioSecure2026!")
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "medikiosk-docs")
    MINIO_SECURE: bool = False

    # Keycloak OIDC
    KEYCLOAK_URL: str = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "medikiosk")
    KEYCLOAK_CLIENT_ID: str = os.getenv("KEYCLOAK_CLIENT_ID", "medikiosk-app")

    # ABDM Sandbox & FHIR
    ABDM_SANDBOX_BASE_URL: str = os.getenv("ABDM_SANDBOX_BASE_URL", "https://dev.abdm.gov.in/gateway")
    ABDM_CLIENT_ID: str = os.getenv("ABDM_CLIENT_ID", "sbx_medikiosk_client")
    ABDM_CLIENT_SECRET: str = os.getenv("ABDM_CLIENT_SECRET", "sbx_medikiosk_secret")
    HAPI_FHIR_BASE_URL: str = os.getenv("HAPI_FHIR_BASE_URL", "http://localhost:8080/fhir")

    CORS_ORIGINS: List[str] = ["*"]

settings = Settings()
