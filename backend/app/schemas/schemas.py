from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Auth Schemas ---
class AbhaVerifyRequest(BaseModel):
    abha_id: str = Field(..., example="91-4521-8890-1234")
    otp: Optional[str] = Field(default="123456", example="123456")

class MrnVerifyRequest(BaseModel):
    mrn: str = Field(..., example="MRN-2026-001")
    phone: Optional[str] = Field(None, example="+919876543210")

class StaffLoginRequest(BaseModel):
    username: str = Field(..., example="dr_arun")
    password: str = Field(..., example="DoctorPass2026!")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    user_name: str

class PatientResponse(BaseModel):
    id: str
    abha_id: Optional[str] = None
    mrn: Optional[str] = None
    name: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: str = "hi"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Session Schemas ---
class SessionCreateRequest(BaseModel):
    patient_id: Optional[str] = None
    kiosk_id: str = "KIOSK-01"
    language: str = "hi"

class SessionPauseRequest(BaseModel):
    pause_pin: Optional[str] = "1234"

class SessionResumeRequest(BaseModel):
    session_id: str
    pause_pin: str

class SessionResponse(BaseModel):
    id: str
    patient_id: Optional[str]
    kiosk_id: str
    status: str
    current_step: str
    language: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    patient: Optional[PatientResponse] = None

    class Config:
        from_attributes = True

# --- Consent Schemas ---
class ConsentRecordRequest(BaseModel):
    session_id: str
    consent_type: str # voice_recording, document_ocr, share_with_doctor, abdm_publish
    granted: bool
    method: str = "touch" # touch, voice, staff_assisted
    consent_text_version: str = "v1.0"

class ConsentStatusResponse(BaseModel):
    session_id: str
    consents: Dict[str, bool]
    captured_at: Optional[datetime] = None

# --- Interview Schemas ---
class InterviewCCRequest(BaseModel):
    description: str
    onset: Optional[str] = "3 days ago"
    duration: Optional[str] = "Persistent"
    severity: Optional[int] = Field(default=5, ge=1, le=10)
    raw_transcript: Optional[str] = None
    confirmed_by_patient: bool = False

class InterviewHPIRequest(BaseModel):
    socrates_json: Dict[str, Any] = Field(
        default_factory=lambda: {
            "site": "Chest / Epigastric",
            "onset": "Acute",
            "character": "Sharp pressure",
            "radiation": "None",
            "associations": "Mild nausea",
            "timing": "Worse in morning",
            "exacerbating_relieving": "Worse with exertion, better with rest",
            "severity": 6
        }
    )
    confirmed_by_patient: bool = False

class InterviewPHRequest(BaseModel):
    past_diagnoses: Optional[str] = "Hypertension (diagnosed 2021)"
    surgeries: Optional[str] = "Appendectomy (2015)"
    medications: List[Dict[str, Any]] = Field(
        default_factory=lambda: [
            {"name": "Telmisartan", "dose": "40mg", "frequency": "Once daily", "verified_formulary": True}
        ]
    )
    allergies: List[str] = Field(
        default_factory=lambda: ["Penicillin"],
        description="Mandatory allergy declaration - cannot be left unspecified without explicit 'No known drug allergies'"
    )
    allergies_confirmed: bool = True
    confirmed_by_patient: bool = False

class InterviewFHRequest(BaseModel):
    relatives_conditions: List[Dict[str, str]] = Field(
        default_factory=lambda: [
            {"relative": "Father", "condition": "Type 2 Diabetes Mellitus"},
            {"relative": "Mother", "condition": "Hypertension"}
        ]
    )
    confirmed_by_patient: bool = False

class InterviewROSRequest(BaseModel):
    systems_checklist: Dict[str, Any] = Field(
        default_factory=lambda: {
            "cardiovascular": {"chest_pain": True, "palpitations": False, "edema": False},
            "respiratory": {"shortness_of_breath": False, "cough": False},
            "gastrointestinal": {"nausea": True, "vomiting": False, "acidity": True},
            "neurological": {"headache": False, "dizziness": False},
            "musculoskeletal": {"joint_pain": False},
            "dermatological": {"rash": False},
            "psychological": {"anxiety": False}
        }
    )
    confirmed_by_patient: bool = False

class PatientConfirmAnswerRequest(BaseModel):
    confirmed: bool = True
    correction_text: Optional[str] = None

# --- AYUSH Schemas ---
class AyushAssessmentRequest(BaseModel):
    prakriti: str = "Vata-Pitta"
    vikriti: str = "Vata Vriddhi (excess dry/cold element)"
    sara: str = "Madhyama (moderate tissue quality)"
    samhanana: str = "Madhyama (medium compactness)"
    pramana: str = "Anurupa (proportionate)"
    satmya: str = "Sarva Rasa Satmya (accustomed to all tastes)"
    satva: str = "Pravara (strong psychological resilience)"
    ahara_shakti: str = "Manda Agni (mildly sluggish digestion)"
    vyayama_shakti: str = "Avara (low physical endurance)"
    vaya: str = "Madhyama (middle aged)"
    notes: Optional[str] = "Advised dietary adjustments with warm spiced water and routine rest."
    confirmed_by_patient: bool = True

# --- Document & OCR Schemas ---
class OcrExtractionResponse(BaseModel):
    id: str
    document_id: str
    field_name: str
    extracted_value: str
    confidence_score: float
    formulary_match: Optional[str] = None
    reference_range: Optional[str] = None
    flagged: bool = False
    flag_reason: Optional[str] = None
    corrected_value: Optional[str] = None
    corrected_by: Optional[str] = None
    confirmed: bool = False

class OcrCorrectionRequest(BaseModel):
    field_name: str
    corrected_value: str
    confirmed: bool = True

class DocumentResponse(BaseModel):
    id: str
    session_id: str
    doc_type: str
    original_filename: Optional[str]
    mime_type: Optional[str]
    file_size: Optional[int]
    uploaded_via: str
    uploaded_at: datetime
    extractions: List[OcrExtractionResponse] = []

    class Config:
        from_attributes = True

# --- Red Flag & Triage Schemas ---
class RedFlagResponse(BaseModel):
    id: str
    session_id: str
    rule_id: str
    rule_description: str
    severity_tier: str
    triggered_at: datetime
    acknowledged_by: Optional[str] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

class RedFlagAckRequest(BaseModel):
    resolution_notes: Optional[str] = "Patient escorted immediately to emergency triage bay."

# --- Case Report & Doctor Dashboard Schemas ---
class DoctorConfirmReportRequest(BaseModel):
    confirmed: bool = True
    doctor_notes: Optional[str] = "Clinical history confirmed with patient. Order 12-lead ECG and Troponin I."
    doctor_edits: Optional[Dict[str, Any]] = None

class DoctorEditFieldRequest(BaseModel):
    section: str # cc, hpi, ph, allergies, ros, ayush
    field_name: str
    new_value: Any
    reason: Optional[str] = "Patient clarified history during physician consultation"

class CaseReportResponse(BaseModel):
    id: str
    session_id: str
    status: str
    fhir_composition_id: Optional[str] = None
    fhir_bundle_json: Optional[Dict[str, Any]] = None
    generated_at: datetime
    confirmed_by_doctor_id: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    doctor_notes: Optional[str] = None
    doctor_edits_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# --- Audit & Interop Schemas ---
class AuditLogResponse(BaseModel):
    id: str
    actor_id: str
    actor_role: str
    action: str
    resource_type: str
    resource_id: str
    payload_summary: Optional[str]
    timestamp: datetime
    prev_hash: str
    hash: str

    class Config:
        from_attributes = True
