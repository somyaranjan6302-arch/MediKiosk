import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, DEMO_STAFF_USERS
from app.core.audit import log_audit_event
from app.models.models import Patient
from app.schemas.schemas import (
    AbhaVerifyRequest, MrnVerifyRequest, StaffLoginRequest,
    TokenResponse, PatientResponse
)
from app.services.abdm_client import AbdmClient

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

@router.post("/patient/verify-abha", response_model=PatientResponse)
def verify_abha(payload: AbhaVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies patient ABHA ID using ABDM M1 OTP verification.
    If patient exists, returns existing; if new, creates patient profile.
    """
    verification = AbdmClient.verify_abha_otp(payload.abha_id, payload.otp or "123456")
    if not verification.get("verified"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=verification.get("message"))

    patient = db.query(Patient).filter(Patient.abha_id == payload.abha_id).first()
    if not patient:
        patient = Patient(
            id=str(uuid.uuid4()),
            abha_id=payload.abha_id,
            mrn=f"MRN-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}",
            name=verification.get("name", "Ayushman Patient"),
            dob="1975-01-01",
            gender=verification.get("gender", "Other"),
            phone=verification.get("mobile", "+919876543210"),
            preferred_language="hi"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    log_audit_event(
        db=db,
        actor_id=patient.id,
        actor_role="patient_kiosk",
        action="ABHA_LOGIN_SUCCESS",
        resource_type="patient",
        resource_id=patient.id,
        payload_summary=f"Patient authenticated via ABHA {payload.abha_id}"
    )

    return patient

@router.post("/patient/verify-mrn", response_model=PatientResponse)
def verify_mrn(payload: MrnVerifyRequest, db: Session = Depends(get_db)):
    """
    Hospital MRN / Mobile verification fallback for patients without ABHA ID.
    Never blocks clinical care.
    """
    patient = db.query(Patient).filter(Patient.mrn == payload.mrn).first()
    if not patient:
        # Create new on-the-fly MRN registration for walk-in patient
        patient = Patient(
            id=str(uuid.uuid4()),
            mrn=payload.mrn,
            name="Walk-in Patient",
            phone=payload.phone or "+919800000000",
            preferred_language="hi"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    log_audit_event(
        db=db,
        actor_id=patient.id,
        actor_role="patient_kiosk",
        action="MRN_LOGIN_SUCCESS",
        resource_type="patient",
        resource_id=patient.id,
        payload_summary=f"Patient authenticated via MRN {payload.mrn}"
    )

    return patient

@router.post("/staff/login", response_model=TokenResponse)
def staff_login(payload: StaffLoginRequest, db: Session = Depends(get_db)):
    """
    Staff authentication endpoint supporting Keycloak OIDC and seeded demo staff roles:
    - doctor (dr_arun / DoctorPass2026!)
    - nurse (nurse_sunita / NursePass2026!)
    - admin (admin_rahul / AdminPass2026!)
    - compliance_officer (compliance_priya / AuditPass2026!)
    """
    user = DEMO_STAFF_USERS.get(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff credentials. Demo users: dr_arun, nurse_sunita, admin_rahul, compliance_priya"
        )

    token = create_access_token({
        "sub": user["id"],
        "name": user["name"],
        "role": user["role"],
        "email": user["email"]
    })

    log_audit_event(
        db=db,
        actor_id=user["id"],
        actor_role=user["role"],
        action="STAFF_LOGIN_SUCCESS",
        resource_type="staff",
        resource_id=user["id"],
        payload_summary=f"Staff {user['name']} logged in with role {user['role']}"
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": user["id"],
        "user_name": user["name"]
    }

@router.get("/patients", response_model=list[PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    return db.query(Patient).order_by(Patient.created_at.desc()).limit(20).all()
