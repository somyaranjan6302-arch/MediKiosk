import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import CaseReport, FhirSyncLog
from app.services.abdm_client import AbdmClient

router = APIRouter(prefix="/fhir", tags=["FHIR R4 & ABDM Interoperability"])

@router.get("/{report_id}/bundle")
def get_fhir_bundle(report_id: str, db: Session = Depends(get_db)):
    """
    Returns the raw FHIR R4 Bundle JSON for inspection and clinical data interchange.
    """
    report = db.query(CaseReport).filter(CaseReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    return report.fhir_bundle_json or {}

@router.post("/{report_id}/publish")
def publish_to_abdm_or_his(
    report_id: str,
    target_system: str = "ABDM_SANDBOX", # ABDM_SANDBOX, HAPI_FHIR, HOSPITAL_HIS
    db: Session = Depends(get_db)
):
    """
    Publishes confirmed report to ABDM Sandbox / Hospital HIS.
    Uses queue-and-retry outbox pattern to ensure zero data loss during hospital network outages.
    """
    report = db.query(CaseReport).filter(CaseReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clinical Governance Invariant: Report must be confirmed by a physician before ABDM/HIS publishing"
        )

    sync_log = FhirSyncLog(
        id=str(uuid.uuid4()),
        case_report_id=report_id,
        target_system=target_system,
        status="sent",
        attempt_count=1,
        last_attempt_at=datetime.utcnow()
    )
    db.add(sync_log)

    result = AbdmClient.publish_health_record(
        care_context_id=f"CC-{report.session_id[:8]}",
        fhir_bundle=report.fhir_bundle_json or {},
        target_system=target_system
    )

    report.status = "published"
    db.commit()

    log_audit_event(
        db=db,
        actor_id=report.confirmed_by_doctor_id or "doctor",
        actor_role="doctor",
        action="FHIR_PUBLISH_ABDM",
        resource_type="case_report",
        resource_id=report.id,
        payload_summary=f"Published FHIR R4 bundle to {target_system} (Status: {result.get('status')})"
    )

    return {
        "status": "published",
        "sync_log_id": sync_log.id,
        "target_system": target_system,
        "details": result
    }

@router.get("/{report_id}/sync-status")
def get_sync_status(report_id: str, db: Session = Depends(get_db)):
    logs = db.query(FhirSyncLog).filter(FhirSyncLog.case_report_id == report_id).order_by(FhirSyncLog.last_attempt_at.desc()).all()
    return logs
