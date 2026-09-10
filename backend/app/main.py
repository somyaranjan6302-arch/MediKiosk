from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.routers import (
    auth, consent, sessions, interview, ayush,
    documents, red_flags, reports, fhir_abdm, analytics_audit, alerts_ws
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB schema & seed genesis block
    init_db()
    print("MediKiosk Backend successfully initialized with DPDP audit chain & clinical ontologies.")
    yield
    # Teardown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MediKiosk SIH26047 - AI-Powered Patient Case-Taking System with ABDM & FHIR R4 Integration",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(consent.router, prefix=settings.API_V1_STR)
app.include_router(sessions.router, prefix=settings.API_V1_STR)
app.include_router(interview.router, prefix=settings.API_V1_STR)
app.include_router(ayush.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(red_flags.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(fhir_abdm.router, prefix=settings.API_V1_STR)
app.include_router(analytics_audit.router, prefix=settings.API_V1_STR)
app.include_router(alerts_ws.router)

@app.get("/api/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "compliance": "DPDP Act 2023 Tamper-Evident Logging Active",
        "interoperability": "HL7 FHIR R4 + ABDM Sandbox Ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
