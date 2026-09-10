import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import Session as KioskSession, AyushAssessment
from app.schemas.schemas import AyushAssessmentRequest

router = APIRouter(prefix="/interview", tags=["AYUSH Assessment - Dashavidha Pariksha"])

@router.post("/{session_id}/ayush")
def record_ayush_assessment(session_id: str, payload: AyushAssessmentRequest, db: Session = Depends(get_db)):
    """
    Captures the traditional Ayurvedic ten-fold examination (Dashavidha Pariksha).
    CRITICAL ARCHITECTURAL RULE: Maintained as an isolated assessment, NEVER merged
    with allopathic diagnosis fields.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    ayush = db.query(AyushAssessment).filter(AyushAssessment.session_id == session_id).first()
    if not ayush:
        ayush = AyushAssessment(id=str(uuid.uuid4()), session_id=session_id)
        db.add(ayush)

    ayush.prakriti = payload.prakriti
    ayush.vikriti = payload.vikriti
    ayush.sara = payload.sara
    ayush.samhanana = payload.samhanana
    ayush.pramana = payload.pramana
    ayush.satmya = payload.satmya
    ayush.satva = payload.satva
    ayush.ahara_shakti = payload.ahara_shakti
    ayush.vyayama_shakti = payload.vyayama_shakti
    ayush.vaya = payload.vaya
    ayush.notes = payload.notes
    ayush.confirmed_by_patient = payload.confirmed_by_patient
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="WRITE_AYUSH_ASSESSMENT",
        resource_type="ayush_assessment",
        resource_id=ayush.id,
        payload_summary=f"Dashavidha Pariksha recorded (Prakriti: {payload.prakriti}, Vikriti: {payload.vikriti})"
    )

    return {
        "status": "success",
        "ayush_id": ayush.id,
        "message": "Dashavidha Pariksha recorded as a segregated complementary clinical section"
    }

@router.get("/{session_id}/ayush")
def get_ayush_assessment(session_id: str, db: Session = Depends(get_db)):
    ayush = db.query(AyushAssessment).filter(AyushAssessment.session_id == session_id).first()
    if not ayush:
        return {"recorded": False, "data": None}
    return {"recorded": True, "data": ayush}
