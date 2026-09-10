import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import (
    Session as KioskSession, InterviewCC, InterviewHPI,
    InterviewPH, InterviewFH, InterviewROS
)
from app.schemas.schemas import (
    InterviewCCRequest, InterviewHPIRequest, InterviewPHRequest,
    InterviewFHRequest, InterviewROSRequest, PatientConfirmAnswerRequest
)
from app.services.interview_engine import InterviewEngine
from app.services.redflag_engine import RedFlagEngine
from app.routers.alerts_ws import manager as ws_manager

router = APIRouter(prefix="/interview", tags=["AI Interview Engine"])

@router.post("/{session_id}/cc")
async def record_chief_complaint(session_id: str, payload: InterviewCCRequest, db: Session = Depends(get_db)):
    """
    Saves Chief Complaint and automatically runs initial deterministic red-flag triage check.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    if not cc:
        cc = InterviewCC(id=str(uuid.uuid4()), session_id=session_id, description=payload.description)
        db.add(cc)

    cc.description = payload.description
    cc.onset = payload.onset
    cc.duration = payload.duration
    cc.severity = payload.severity
    cc.raw_transcript = payload.raw_transcript
    cc.confirmed_by_patient = payload.confirmed_by_patient
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="WRITE_PHI_CC",
        resource_type="interview_cc",
        resource_id=cc.id,
        payload_summary=f"Chief complaint recorded: {payload.description} (Severity: {payload.severity})"
    )

    # Check for acute red flags immediately
    tier, triggered_rules = RedFlagEngine.evaluate(
        cc={"description": payload.description, "severity": payload.severity, "duration": payload.duration},
        hpi={},
        ros={}
    )

    if tier == "Emergency":
        session.status = "emergency_escalated"
        db.commit()
        await ws_manager.broadcast_alert({
            "type": "EMERGENCY_TRIAGE_ALERT",
            "session_id": session_id,
            "patient_name": session.patient.name if session.patient else "Kiosk Patient",
            "tier": "Emergency",
            "rules": triggered_rules,
            "message": "CRITICAL RED-FLAG TRIGGERED: Patient requires immediate emergency intervention!"
        })

    followups = InterviewEngine.generate_cc_followups(payload.description, session.language or "hi")
    readback = InterviewEngine.generate_patient_readback("cc", payload.dict(), session.language or "hi")

    return {
        "status": "success",
        "cc_id": cc.id,
        "followups": followups,
        "readback_text": readback,
        "triage_tier": tier,
        "triggered_rules": triggered_rules
    }

@router.post("/{session_id}/hpi")
def record_hpi(session_id: str, payload: InterviewHPIRequest, db: Session = Depends(get_db)):
    """
    Saves SOCRATES-structured History of Present Illness.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()
    if not hpi:
        hpi = InterviewHPI(id=str(uuid.uuid4()), session_id=session_id)
        db.add(hpi)

    hpi.socrates_json = payload.socrates_json
    hpi.confirmed_by_patient = payload.confirmed_by_patient
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="WRITE_PHI_HPI",
        resource_type="interview_hpi",
        resource_id=hpi.id,
        payload_summary="SOCRATES HPI recorded"
    )

    readback = InterviewEngine.generate_patient_readback("hpi", payload.dict(), session.language or "hi")
    return {"status": "success", "hpi_id": hpi.id, "readback_text": readback}

@router.post("/{session_id}/ph")
def record_past_history(session_id: str, payload: InterviewPHRequest, db: Session = Depends(get_db)):
    """
    Saves Past Medical, Surgical, Medications, and MANDATORY Allergies declaration.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if not payload.allergies_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory safety check: Patient must explicitly confirm allergies or declare 'No known drug allergies'"
        )

    ph = db.query(InterviewPH).filter(InterviewPH.session_id == session_id).first()
    if not ph:
        ph = InterviewPH(id=str(uuid.uuid4()), session_id=session_id)
        db.add(ph)

    ph.past_diagnoses = payload.past_diagnoses
    ph.surgeries = payload.surgeries
    ph.medications_json = payload.medications
    ph.allergies_json = payload.allergies
    ph.allergies_confirmed = payload.allergies_confirmed
    ph.confirmed_by_patient = payload.confirmed_by_patient
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="WRITE_PHI_PH",
        resource_type="interview_ph",
        resource_id=ph.id,
        payload_summary=f"Past history & allergies recorded (Allergies: {payload.allergies})"
    )

    readback = InterviewEngine.generate_patient_readback("ph", payload.dict(), session.language or "hi")
    return {"status": "success", "ph_id": ph.id, "readback_text": readback}

@router.post("/{session_id}/fh")
def record_family_history(session_id: str, payload: InterviewFHRequest, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    fh = db.query(InterviewFH).filter(InterviewFH.session_id == session_id).first()
    if not fh:
        fh = InterviewFH(id=str(uuid.uuid4()), session_id=session_id)
        db.add(fh)

    fh.relatives_conditions_json = payload.relatives_conditions
    fh.confirmed_by_patient = payload.confirmed_by_patient
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="WRITE_PHI_FH",
        resource_type="interview_fh",
        resource_id=fh.id,
        payload_summary="Family history recorded"
    )

    return {"status": "success", "fh_id": fh.id}

@router.post("/{session_id}/ros")
async def record_review_of_systems(session_id: str, payload: InterviewROSRequest, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    ros = db.query(InterviewROS).filter(InterviewROS.session_id == session_id).first()
    if not ros:
        ros = InterviewROS(id=str(uuid.uuid4()), session_id=session_id)
        db.add(ros)

    ros.systems_checklist_json = payload.systems_checklist
    ros.confirmed_by_patient = payload.confirmed_by_patient
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="WRITE_PHI_ROS",
        resource_type="interview_ros",
        resource_id=ros.id,
        payload_summary="Review of systems checklist recorded"
    )

    # Re-evaluate comprehensive red flags including ROS
    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()

    tier, triggered_rules = RedFlagEngine.evaluate(
        cc={"description": cc.description if cc else "", "severity": cc.severity if cc else 5, "duration": cc.duration if cc else ""},
        hpi={"socrates_json": hpi.socrates_json if hpi else {}},
        ros={"systems_checklist": payload.systems_checklist}
    )

    if tier == "Emergency":
        session.status = "emergency_escalated"
        db.commit()
        await ws_manager.broadcast_alert({
            "type": "EMERGENCY_TRIAGE_ALERT",
            "session_id": session_id,
            "patient_name": session.patient.name if session.patient else "Kiosk Patient",
            "tier": "Emergency",
            "rules": triggered_rules,
            "message": "EMERGENCY TRIAGE ALERT: Patient symptoms meet critical emergency criteria."
        })

    return {
        "status": "success",
        "ros_id": ros.id,
        "triage_tier": tier,
        "triggered_rules": triggered_rules
    }

@router.get("/{session_id}/summary")
def get_interview_summary(session_id: str, db: Session = Depends(get_db)):
    """
    Returns structured compilation of all patient interview answers for the final review screen.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()
    ph = db.query(InterviewPH).filter(InterviewPH.session_id == session_id).first()
    fh = db.query(InterviewFH).filter(InterviewFH.session_id == session_id).first()
    ros = db.query(InterviewROS).filter(InterviewROS.session_id == session_id).first()

    return {
        "session_id": session_id,
        "patient": {
            "name": session.patient.name if session.patient else "Unknown",
            "abha_id": session.patient.abha_id if session.patient else None,
            "gender": session.patient.gender if session.patient else None,
            "preferred_language": session.language
        },
        "cc": {
            "description": cc.description if cc else "",
            "onset": cc.onset if cc else "",
            "duration": cc.duration if cc else "",
            "severity": cc.severity if cc else 0,
            "confirmed": cc.confirmed_by_patient if cc else False
        },
        "hpi": hpi.socrates_json if hpi else {},
        "ph": {
            "diagnoses": ph.past_diagnoses if ph else "",
            "surgeries": ph.surgeries if ph else "",
            "medications": ph.medications_json if ph else [],
            "allergies": ph.allergies_json if ph else [],
            "allergies_confirmed": ph.allergies_confirmed if ph else False
        },
        "fh": fh.relatives_conditions_json if fh else [],
        "ros": ros.systems_checklist_json if ros else {}
    }

@router.post("/{session_id}/confirm")
def patient_confirm_interview(session_id: str, payload: PatientConfirmAnswerRequest, db: Session = Depends(get_db)):
    """
    Final patient confirmation loop: Marks interview answers as verified by patient.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()
    ph = db.query(InterviewPH).filter(InterviewPH.session_id == session_id).first()
    fh = db.query(InterviewFH).filter(InterviewFH.session_id == session_id).first()
    ros = db.query(InterviewROS).filter(InterviewROS.session_id == session_id).first()

    if cc: cc.confirmed_by_patient = payload.confirmed
    if hpi: hpi.confirmed_by_patient = payload.confirmed
    if ph: ph.confirmed_by_patient = payload.confirmed
    if fh: fh.confirmed_by_patient = payload.confirmed
    if ros: ros.confirmed_by_patient = payload.confirmed

    session.status = "completed"
    session.current_step = "finished"
    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="PATIENT_CONFIRM_ALL_ANSWERS",
        resource_type="session",
        resource_id=session_id,
        payload_summary="Patient verified and finalized their recorded clinical answers"
    )

    return {"status": "success", "confirmed": payload.confirmed, "message": "Your case-taking interview is complete. Please proceed to the waiting area."}
