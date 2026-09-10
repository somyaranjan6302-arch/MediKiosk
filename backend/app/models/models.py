import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, JSON, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    abha_id = Column(String(50), unique=True, index=True, nullable=True)
    mrn = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    dob = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    preferred_language = Column(String(20), default="hi")
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="patient", cascade="all, delete-orphan")
    consent_logs = relationship("ConsentLog", back_populates="patient", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    kiosk_id = Column(String(50), default="KIOSK-01")
    status = Column(String(30), default="active", index=True) # active, paused, completed, emergency_escalated
    current_step = Column(String(50), default="identity")
    language = Column(String(20), default="hi")
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    pause_pin = Column(String(10), nullable=True)

    patient = relationship("Patient", back_populates="sessions")
    consent_logs = relationship("ConsentLog", back_populates="session", cascade="all, delete-orphan")
    cc = relationship("InterviewCC", back_populates="session", uselist=False, cascade="all, delete-orphan")
    hpi = relationship("InterviewHPI", back_populates="session", uselist=False, cascade="all, delete-orphan")
    ph = relationship("InterviewPH", back_populates="session", uselist=False, cascade="all, delete-orphan")
    fh = relationship("InterviewFH", back_populates="session", uselist=False, cascade="all, delete-orphan")
    ros = relationship("InterviewROS", back_populates="session", uselist=False, cascade="all, delete-orphan")
    ayush = relationship("AyushAssessment", back_populates="session", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="session", cascade="all, delete-orphan")
    red_flags = relationship("RedFlagEvent", back_populates="session", cascade="all, delete-orphan")
    case_report = relationship("CaseReport", back_populates="session", uselist=False, cascade="all, delete-orphan")

class ConsentLog(Base):
    __tablename__ = "consent_log"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True)
    consent_type = Column(String(50), nullable=False) # voice_recording, document_ocr, share_with_doctor, abdm_publish
    granted = Column(Boolean, nullable=False)
    consent_text_version = Column(String(20), default="v1.0")
    captured_at = Column(DateTime, default=datetime.utcnow)
    method = Column(String(20), default="touch") # touch, voice, staff_assisted
    ip_address = Column(String(50), nullable=True)
    device_id = Column(String(100), nullable=True)

    patient = relationship("Patient", back_populates="consent_logs")
    session = relationship("Session", back_populates="consent_logs")

class InterviewCC(Base):
    __tablename__ = "interview_cc"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    onset = Column(String(100), nullable=True)
    duration = Column(String(100), nullable=True)
    severity = Column(Integer, nullable=True) # 1-10 scale
    raw_transcript = Column(Text, nullable=True)
    confirmed_by_patient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="cc")

class InterviewHPI(Base):
    __tablename__ = "interview_hpi"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    socrates_json = Column(JSON, default=dict) # Site, Onset, Character, Radiation, Associations, Timing, Exacerbating, Severity
    confirmed_by_patient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="hpi")

class InterviewPH(Base):
    __tablename__ = "interview_ph"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    past_diagnoses = Column(Text, nullable=True)
    surgeries = Column(Text, nullable=True)
    medications_json = Column(JSON, default=list)
    allergies_json = Column(JSON, default=list) # Mandatory explicit confirmation
    allergies_confirmed = Column(Boolean, default=False)
    confirmed_by_patient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="ph")

class InterviewFH(Base):
    __tablename__ = "interview_fh"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    relatives_conditions_json = Column(JSON, default=list)
    confirmed_by_patient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="fh")

class InterviewROS(Base):
    __tablename__ = "interview_ros"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    systems_checklist_json = Column(JSON, default=dict)
    confirmed_by_patient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="ros")

class AyushAssessment(Base):
    __tablename__ = "ayush_assessment"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    prakriti = Column(String(100), nullable=True)      # Vata / Pitta / Kapha
    vikriti = Column(String(100), nullable=True)       # Imbalance
    sara = Column(String(100), nullable=True)          # Tissue vitality
    samhanana = Column(String(100), nullable=True)     # Body compactness
    pramana = Column(String(100), nullable=True)       # Anthropometry
    satmya = Column(String(100), nullable=True)        # Habituation
    satva = Column(String(100), nullable=True)         # Mental strength
    ahara_shakti = Column(String(100), nullable=True)  # Agni / digestion
    vyayama_shakti = Column(String(100), nullable=True)# Physical stamina
    vaya = Column(String(50), nullable=True)           # Age epoch
    notes = Column(Text, nullable=True)
    confirmed_by_patient = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="ayush")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    doc_type = Column(String(50), nullable=False) # prescription, lab_report, discharge_summary, insurance
    storage_key = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)
    uploaded_via = Column(String(20), default="kiosk_scan") # kiosk_scan, mobile_qr_upload
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="documents")
    extractions = relationship("OcrExtraction", back_populates="document", cascade="all, delete-orphan")

class OcrExtraction(Base):
    __tablename__ = "ocr_extractions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(100), nullable=False)
    extracted_value = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.0)
    formulary_match = Column(String(255), nullable=True)
    reference_range = Column(String(100), nullable=True)
    flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255), nullable=True)
    corrected_value = Column(Text, nullable=True)
    corrected_by = Column(String(50), nullable=True)
    corrected_at = Column(DateTime, nullable=True)
    confirmed = Column(Boolean, default=False)

    document = relationship("Document", back_populates="extractions")

class RedFlagEvent(Base):
    __tablename__ = "red_flag_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(String(50), nullable=False)
    rule_description = Column(Text, nullable=False)
    severity_tier = Column(String(20), nullable=False) # Routine, Priority, Emergency
    triggered_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_by = Column(String(50), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    session = relationship("Session", back_populates="red_flags")

class CaseReport(Base):
    __tablename__ = "case_reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    status = Column(String(30), default="draft") # draft, doctor_reviewed, confirmed, published
    fhir_composition_id = Column(String(100), nullable=True)
    fhir_bundle_json = Column(JSON, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    confirmed_by_doctor_id = Column(String(50), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    doctor_edits_json = Column(JSON, default=dict)

    session = relationship("Session", back_populates="case_report")
    sync_logs = relationship("FhirSyncLog", back_populates="case_report", cascade="all, delete-orphan")

class FhirSyncLog(Base):
    __tablename__ = "fhir_sync_log"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    case_report_id = Column(String(36), ForeignKey("case_reports.id", ondelete="CASCADE"), nullable=False)
    target_system = Column(String(50), nullable=False) # ABDM_M1, ABDM_M2, HAPI_FHIR, HOSPITAL_HIS
    status = Column(String(20), default="queued") # queued, sent, failed, retrying
    attempt_count = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    case_report = relationship("CaseReport", back_populates="sync_logs")

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_id = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False) # patient_kiosk, nurse, doctor, admin, compliance_officer, system
    action = Column(String(100), nullable=False)    # READ_PHI, WRITE_PHI, CONSENT_GRANT, CONSENT_REVOKE, RED_FLAG_TRIGGER, DOCTOR_CONFIRM, OCR_EDIT
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=False)
    payload_summary = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False)
