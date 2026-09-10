import uuid
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import ConsentLog, Session as KioskSession
from app.schemas.schemas import ConsentRecordRequest, ConsentStatusResponse

router = APIRouter(prefix="/consent", tags=["Consent Management"])

@router.post("", response_model=Dict[str, Any])
def record_consent(payload: ConsentRecordRequest, db: Session = Depends(get_db)):
    """
    Captures explicit, layered consent (voice recording, document OCR, sharing with doctor, ABDM publishing).
    Every consent event is logged with version, method (touch/voice), and immutable audit record.
    """
    session = db.query(KioskSession).filter(KioskSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    consent_entry = ConsentLog(
        id=str(uuid.uuid4()),
        patient_id=session.patient_id,
        session_id=payload.session_id,
        consent_type=payload.consent_type,
        granted=payload.granted,
        consent_text_version=payload.consent_text_version,
        captured_at=datetime.utcnow(),
        method=payload.method
    )
    db.add(consent_entry)
    db.commit()

    action_name = "CONSENT_GRANT" if payload.granted else "CONSENT_REVOKE"
    log_audit_event(
        db=db,
        actor_id=session.patient_id or "anonymous_kiosk",
        actor_role="patient_kiosk",
        action=action_name,
        resource_type="consent",
        resource_id=consent_entry.id,
        payload_summary=f"Consent '{payload.consent_type}' set to {payload.granted} via {payload.method}"
    )

    return {
        "status": "success",
        "consent_id": consent_entry.id,
        "consent_type": payload.consent_type,
        "granted": payload.granted
    }

@router.get("/{session_id}", response_model=ConsentStatusResponse)
def get_session_consents(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieves current active consent state for all 4 required layers.
    """
    consents = db.query(ConsentLog).filter(ConsentLog.session_id == session_id).order_by(ConsentLog.captured_at.asc()).all()
    
    # Defaults
    status_map = {
        "voice_recording": False,
        "document_ocr": False,
        "share_with_doctor": False,
        "abdm_publish": False
    }

    last_time = None
    for c in consents:
        status_map[c.consent_type] = c.granted
        last_time = c.captured_at

    return {
        "session_id": session_id,
        "consents": status_map,
        "captured_at": last_time
    }

@router.delete("/{session_id}/{consent_type}")
def revoke_consent(session_id: str, consent_type: str, db: Session = Depends(get_db)):
    """
    Revokes non-essential consent at any time before doctor confirmation.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    revocation = ConsentLog(
        id=str(uuid.uuid4()),
        patient_id=session.patient_id,
        session_id=session_id,
        consent_type=consent_type,
        granted=False,
        consent_text_version="v1.0",
        captured_at=datetime.utcnow(),
        method="patient_revocation"
    )
    db.add(revocation)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "anonymous_kiosk",
        actor_role="patient_kiosk",
        action="CONSENT_REVOKE",
        resource_type="consent",
        resource_id=revocation.id,
        payload_summary=f"Patient revoked consent for {consent_type}"
    )

    return {"status": "revoked", "consent_type": consent_type}
