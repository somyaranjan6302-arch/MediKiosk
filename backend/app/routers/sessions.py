import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import Session as KioskSession, Patient
from app.schemas.schemas import (
    SessionCreateRequest, SessionPauseRequest, SessionResumeRequest, SessionResponse
)

router = APIRouter(prefix="/sessions", tags=["Kiosk Sessions"])

@router.post("", response_model=SessionResponse)
def create_session(payload: SessionCreateRequest, db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    new_session = KioskSession(
        id=session_id,
        patient_id=payload.patient_id,
        kiosk_id=payload.kiosk_id,
        status="active",
        current_step="consent",
        language=payload.language,
        started_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    log_audit_event(
        db=db,
        actor_id=payload.patient_id or "anonymous_kiosk",
        actor_role="patient_kiosk",
        action="SESSION_START",
        resource_type="session",
        resource_id=session_id,
        payload_summary=f"Kiosk session started on {payload.kiosk_id} in {payload.language}"
    )

    return new_session

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session

@router.patch("/{session_id}/step")
def update_step(session_id: str, step: str, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session.current_step = step
    db.commit()
    return {"status": "success", "current_step": step}

@router.patch("/{session_id}/pause")
def pause_session(session_id: str, payload: SessionPauseRequest, db: Session = Depends(get_db)):
    """
    Pauses an in-progress session allowing an elderly/fatigued patient to step away.
    Requires a simple 4-digit PIN to resume.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session.status = "paused"
    session.paused_at = datetime.utcnow()
    session.pause_pin = payload.pause_pin or "1234"
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="SESSION_PAUSE",
        resource_type="session",
        resource_id=session_id,
        payload_summary="Kiosk session paused by patient"
    )

    return {"status": "paused", "session_id": session_id, "message": "Session paused. Use your PIN to resume."}

@router.post("/resume", response_model=SessionResponse)
def resume_session(payload: SessionResumeRequest, db: Session = Depends(get_db)):
    """
    Resumes a paused session after verifying the PIN.
    """
    session = db.query(KioskSession).filter(KioskSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.status != "paused":
        return session

    if session.pause_pin and session.pause_pin != payload.pause_pin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid PIN for paused session")

    session.status = "active"
    session.paused_at = None
    db.commit()
    db.refresh(session)

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="SESSION_RESUME",
        resource_type="session",
        resource_id=session.id,
        payload_summary="Kiosk session resumed successfully"
    )

    return session
