import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import (
    Session as KioskSession, RedFlagEvent, InterviewCC, InterviewHPI, InterviewROS, InterviewPH
)
from app.schemas.schemas import RedFlagResponse, RedFlagAckRequest
from app.services.redflag_engine import RedFlagEngine
from app.routers.alerts_ws import manager as ws_manager

router = APIRouter(prefix="/redflags", tags=["Red-Flag / Emergency Detection Engine"])

@router.post("/{session_id}/evaluate", response_model=List[RedFlagResponse])
async def evaluate_session_red_flags(session_id: str, db: Session = Depends(get_db)):
    """
    Evaluates session data against deterministic rule engine (v1.2.0).
    If Emergency, dispatches immediate WebSocket broadcast to staff.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()
    ros = db.query(InterviewROS).filter(InterviewROS.session_id == session_id).first()
    ph = db.query(InterviewPH).filter(InterviewPH.session_id == session_id).first()

    tier, triggered_rules = RedFlagEngine.evaluate(
        cc={"description": cc.description if cc else "", "severity": cc.severity if cc else 5, "duration": cc.duration if cc else ""},
        hpi={"socrates_json": hpi.socrates_json if hpi else {}},
        ros={"systems_checklist": ros.systems_checklist_json if ros else {}},
        ph={"allergies": ph.allergies_json if ph else []}
    )

    created_events = []
    for rule in triggered_rules:
        # Check if already recorded to prevent duplicate events
        existing = db.query(RedFlagEvent).filter(
            RedFlagEvent.session_id == session_id,
            RedFlagEvent.rule_id == rule["rule_id"]
        ).first()

        if not existing:
            event = RedFlagEvent(
                id=str(uuid.uuid4()),
                session_id=session_id,
                rule_id=rule["rule_id"],
                rule_description=rule["description"],
                severity_tier=rule["tier"],
                triggered_at=datetime.utcnow()
            )
            db.add(event)
            created_events.append(event)

            log_audit_event(
                db=db,
                actor_id="rule_engine_v1.2.0",
                actor_role="system",
                action="RED_FLAG_TRIGGERED",
                resource_type="red_flag_event",
                resource_id=event.id,
                payload_summary=f"Rule {rule['rule_id']} triggered ({rule['tier']}): {rule['description']}"
            )

    if tier == "Emergency":
        session.status = "emergency_escalated"
        await ws_manager.broadcast_alert({
            "type": "EMERGENCY_TRIAGE_ALERT",
            "session_id": session_id,
            "patient_name": session.patient.name if session.patient else "Kiosk Patient",
            "tier": "Emergency",
            "rules": triggered_rules,
            "message": "CRITICAL EMERGENCY: Patient pulled from standard queue for immediate resuscitation / ECG."
        })

    db.commit()

    all_events = db.query(RedFlagEvent).filter(RedFlagEvent.session_id == session_id).all()
    return all_events

@router.get("/{session_id}", response_model=List[RedFlagResponse])
def get_session_red_flags(session_id: str, db: Session = Depends(get_db)):
    return db.query(RedFlagEvent).filter(RedFlagEvent.session_id == session_id).all()

@router.patch("/{event_id}/acknowledge")
def acknowledge_red_flag(
    event_id: str,
    payload: RedFlagAckRequest,
    acknowledged_by: str = "nurse_sunita",
    db: Session = Depends(get_db)
):
    """
    Allows triage nurse or doctor to sign off acknowledgement and resolution of emergency alert.
    """
    event = db.query(RedFlagEvent).filter(RedFlagEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Red-flag event not found")

    event.acknowledged_by = acknowledged_by
    event.acknowledged_at = datetime.utcnow()
    event.resolution_notes = payload.resolution_notes
    db.commit()

    log_audit_event(
        db=db,
        actor_id=acknowledged_by,
        actor_role="nurse",
        action="RED_FLAG_ACKNOWLEDGED",
        resource_type="red_flag_event",
        resource_id=event.id,
        payload_summary=f"Emergency red flag acknowledged: {payload.resolution_notes}"
    )

    return {"status": "acknowledged", "event_id": event.id, "acknowledged_by": acknowledged_by}
