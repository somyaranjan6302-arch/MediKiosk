import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import (
    Session as KioskSession, CaseReport, Patient, InterviewCC,
    InterviewHPI, InterviewPH, InterviewFH, InterviewROS,
    AyushAssessment, Document, RedFlagEvent
)
from app.schemas.schemas import (
    CaseReportResponse, DoctorConfirmReportRequest, DoctorEditFieldRequest
)
from app.services.fhir_service import FhirService

router = APIRouter(prefix="/reports", tags=["Standardized Report & Doctor Review"])

@router.post("/{session_id}/generate", response_model=CaseReportResponse)
def generate_case_report(session_id: str, db: Session = Depends(get_db)):
    """
    Compiles all intake artifacts into structured data first, FHIR resources, and human-readable draft.
    Status remains 'draft' until explicit doctor confirmation.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    patient = session.patient
    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()
    ph = db.query(InterviewPH).filter(InterviewPH.session_id == session_id).first()
    ros = db.query(InterviewROS).filter(InterviewROS.session_id == session_id).first()
    ayush = db.query(AyushAssessment).filter(AyushAssessment.session_id == session_id).first()
    docs = db.query(Document).filter(Document.session_id == session_id).all()

    # Generate standard FHIR R4 Bundle
    fhir_bundle = FhirService.generate_bundle(
        patient={
            "id": patient.id if patient else "pat-unknown",
            "abha_id": patient.abha_id if patient else "NOT_LINKED",
            "mrn": patient.mrn if patient else "MRN-UNKNOWN",
            "name": patient.name if patient else "Unknown Patient",
            "gender": patient.gender if patient else "Unknown",
            "dob": patient.dob if patient else "1970-01-01",
            "phone": patient.phone if patient else ""
        },
        session={"id": session.id, "language": session.language},
        cc={"description": cc.description if cc else "", "severity": cc.severity if cc else 5, "onset": cc.onset if cc else ""},
        hpi={"socrates_json": hpi.socrates_json if hpi else {}},
        ph={"past_diagnoses": ph.past_diagnoses if ph else "", "surgeries": ph.surgeries if ph else "", "allergies": ph.allergies_json if ph else []},
        ros={"systems_checklist": ros.systems_checklist_json if ros else {}},
        ayush={"prakriti": ayush.prakriti, "vikriti": ayush.vikriti, "ahara_shakti": ayush.ahara_shakti, "satva": ayush.satva} if ayush else None
    )

    report = db.query(CaseReport).filter(CaseReport.session_id == session_id).first()
    if not report:
        report = CaseReport(
            id=str(uuid.uuid4()),
            session_id=session_id,
            status="draft",
            fhir_composition_id=fhir_bundle.get("compositionId"),
            fhir_bundle_json=fhir_bundle,
            generated_at=datetime.utcnow()
        )
        db.add(report)
    else:
        report.fhir_composition_id = fhir_bundle.get("compositionId")
        report.fhir_bundle_json = fhir_bundle

    db.commit()
    db.refresh(report)

    log_audit_event(
        db=db,
        actor_id="system",
        actor_role="system",
        action="CASE_REPORT_GENERATED",
        resource_type="case_report",
        resource_id=report.id,
        payload_summary=f"Compiled standardized clinical draft and FHIR R4 Bundle for session {session_id}"
    )

    return report

@router.get("/session/{session_id}")
def get_report_by_session(session_id: str, db: Session = Depends(get_db)):
    """
    Returns full clinical report view including red flags on top, interview answers,
    and side-by-side OCR documents.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    report = db.query(CaseReport).filter(CaseReport.session_id == session_id).first()
    if not report:
        # Auto generate draft if not yet compiled
        report = generate_case_report(session_id, db)

    red_flags = db.query(RedFlagEvent).filter(RedFlagEvent.session_id == session_id).all()
    cc = db.query(InterviewCC).filter(InterviewCC.session_id == session_id).first()
    hpi = db.query(InterviewHPI).filter(InterviewHPI.session_id == session_id).first()
    ph = db.query(InterviewPH).filter(InterviewPH.session_id == session_id).first()
    fh = db.query(InterviewFH).filter(InterviewFH.session_id == session_id).first()
    ros = db.query(InterviewROS).filter(InterviewROS.session_id == session_id).first()
    ayush = db.query(AyushAssessment).filter(AyushAssessment.session_id == session_id).first()
    docs = db.query(Document).filter(Document.session_id == session_id).all()

    # Determine highest triage tier
    highest_tier = "Routine"
    if any(rf.severity_tier == "Emergency" for rf in red_flags):
        highest_tier = "Emergency"
    elif any(rf.severity_tier == "Priority" for rf in red_flags):
        highest_tier = "Priority"

    return {
        "report": report,
        "triage_tier": highest_tier,
        "red_flags": red_flags,
        "patient": session.patient,
        "session": session,
        "clinical_data": {
            "cc": cc,
            "hpi": hpi,
            "ph": ph,
            "fh": fh,
            "ros": ros,
            "ayush": ayush,
            "documents": docs
        }
    }

@router.get("/queue")
def get_doctor_patient_queue(db: Session = Depends(get_db)):
    """
    Triage-sorted patient queue for doctor / nurse dashboard.
    Priority order: Emergency -> Priority -> Routine, with waiting times.
    """
    sessions = db.query(KioskSession).order_by(KioskSession.started_at.desc()).all()
    queue = []

    for s in sessions:
        red_flags = db.query(RedFlagEvent).filter(RedFlagEvent.session_id == s.id).all()
        tier = "Routine"
        if any(rf.severity_tier == "Emergency" for rf in red_flags) or s.status == "emergency_escalated":
            tier = "Emergency"
        elif any(rf.severity_tier == "Priority" for rf in red_flags):
            tier = "Priority"

        wait_seconds = int((datetime.utcnow() - s.started_at).total_seconds()) if s.started_at else 0
        wait_min = wait_seconds // 60

        report = db.query(CaseReport).filter(CaseReport.session_id == s.id).first()

        queue.append({
            "session_id": s.id,
            "patient_id": s.patient_id,
            "patient_name": s.patient.name if s.patient else "Walk-in Patient",
            "abha_id": s.patient.abha_id if s.patient else None,
            "mrn": s.patient.mrn if s.patient else "MRN-PENDING",
            "triage_tier": tier,
            "status": s.status,
            "wait_minutes": wait_min,
            "started_at": s.started_at,
            "red_flags_count": len(red_flags),
            "report_status": report.status if report else "draft",
            "report_id": report.id if report else None
        })

    # Sort key: Emergency first (0), Priority second (1), Routine third (2), then longest wait
    tier_weights = {"Emergency": 0, "Priority": 1, "Routine": 2}
    queue.sort(key=lambda x: (tier_weights.get(x["triage_tier"], 2), -x["wait_minutes"]))

    return queue

@router.patch("/{report_id}/edit-field")
def doctor_edit_field(
    report_id: str,
    payload: DoctorEditFieldRequest,
    doctor_id: str = "dr_arun",
    db: Session = Depends(get_db)
):
    """
    Enables inline doctor corrections across any section of the intake report.
    All edits logged with doctor ID, timestamp, and audit trail.
    """
    report = db.query(CaseReport).filter(CaseReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    edits = dict(report.doctor_edits_json or {})
    key = f"{payload.section}.{payload.field_name}"
    edits[key] = {
        "new_value": payload.new_value,
        "reason": payload.reason,
        "edited_by": doctor_id,
        "edited_at": datetime.utcnow().isoformat()
    }
    report.doctor_edits_json = edits
    report.status = "doctor_reviewed"
    db.commit()

    log_audit_event(
        db=db,
        actor_id=doctor_id,
        actor_role="doctor",
        action="DOCTOR_FIELD_OVERRIDE",
        resource_type="case_report",
        resource_id=report.id,
        payload_summary=f"Doctor edited {key}: {payload.new_value} (Reason: {payload.reason})"
    )

    return {"status": "success", "field": key, "new_value": payload.new_value}

@router.patch("/{report_id}/confirm")
def doctor_confirm_report(
    report_id: str,
    payload: DoctorConfirmReportRequest,
    doctor_id: str = "dr_arun",
    db: Session = Depends(get_db)
):
    """
    Physician Explicit Sign-off: Commits the draft to the permanent health record.
    Nothing becomes permanent without this explicit action.
    """
    report = db.query(CaseReport).filter(CaseReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    report.status = "confirmed"
    report.confirmed_by_doctor_id = doctor_id
    report.confirmed_at = datetime.utcnow()
    report.doctor_notes = payload.doctor_notes
    if payload.doctor_edits:
        report.doctor_edits_json = payload.doctor_edits

    # Update session status
    session = report.session
    if session:
        session.status = "completed"

    db.commit()

    log_audit_event(
        db=db,
        actor_id=doctor_id,
        actor_role="doctor",
        action="DOCTOR_CONFIRM_CLINICAL_RECORD",
        resource_type="case_report",
        resource_id=report.id,
        payload_summary=f"Doctor {doctor_id} confirmed and signed off clinical case report"
    )

    return {
        "status": "confirmed",
        "report_id": report.id,
        "confirmed_by": doctor_id,
        "confirmed_at": report.confirmed_at,
        "message": "Clinical record successfully verified and permanently committed"
    }
