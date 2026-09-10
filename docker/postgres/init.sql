-- ==============================================================================
-- MediKiosk Database Initialization (SIH26047)
-- PostgreSQL 16 Schema with Foreign Keys, Indexes & Audit Hash Chaining
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    abha_id VARCHAR(50) UNIQUE,
    mrn VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    phone VARCHAR(20),
    preferred_language VARCHAR(20) DEFAULT 'hi',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Kiosk Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) REFERENCES patients(id) ON DELETE SET NULL,
    kiosk_id VARCHAR(50) NOT NULL DEFAULT 'KIOSK-01',
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, paused, completed, emergency_escalated
    current_step VARCHAR(50) DEFAULT 'identity',
    language VARCHAR(20) DEFAULT 'hi',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    pause_pin VARCHAR(10)
);

-- 3. Layered Consent Log (DPDP Act 2023 Compliant)
CREATE TABLE IF NOT EXISTS consent_log (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) REFERENCES patients(id) ON DELETE CASCADE,
    session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- voice_recording, document_ocr, share_with_doctor, abdm_publish
    granted BOOLEAN NOT NULL,
    consent_text_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(20) NOT NULL DEFAULT 'touch', -- touch, voice, staff_assisted
    ip_address VARCHAR(50),
    device_id VARCHAR(100)
);

-- 4. Interview: Chief Complaint (CC)
CREATE TABLE IF NOT EXISTS interview_cc (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    onset VARCHAR(100),
    duration VARCHAR(100),
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    raw_transcript TEXT,
    confirmed_by_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Interview: History of Present Illness (HPI - SOCRATES)
CREATE TABLE IF NOT EXISTS interview_hpi (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    socrates_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    confirmed_by_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Interview: Past History (PH)
CREATE TABLE IF NOT EXISTS interview_ph (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    past_diagnoses TEXT,
    surgeries TEXT,
    medications_json JSONB DEFAULT '[]'::jsonb,
    allergies_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- Mandatory: explicit confirmation
    allergies_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Interview: Family History (FH)
CREATE TABLE IF NOT EXISTS interview_fh (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    relatives_conditions_json JSONB DEFAULT '[]'::jsonb,
    confirmed_by_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Interview: Review of Systems (ROS)
CREATE TABLE IF NOT EXISTS interview_ros (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    systems_checklist_json JSONB DEFAULT '{}'::jsonb,
    confirmed_by_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. AYUSH Assessment: Dashavidha Pariksha (10-fold examination)
CREATE TABLE IF NOT EXISTS ayush_assessment (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    prakriti VARCHAR(100),      -- Dosha constitution: Vata / Pitta / Kapha
    vikriti VARCHAR(100),       -- Current dosha imbalance
    sara VARCHAR(100),          -- Tissue quality/vitality
    samhanana VARCHAR(100),     -- Body compactness
    pramana VARCHAR(100),       -- Body proportions
    satmya VARCHAR(100),        -- Habituation / diet adaptability
    satva VARCHAR(100),         -- Psychological resilience
    ahara_shakti VARCHAR(100),  -- Digestive capacity / Agni
    vyayama_shakti VARCHAR(100),-- Exercise tolerance
    vaya VARCHAR(50),           -- Age epoch considerations
    notes TEXT,
    confirmed_by_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Digitized Documents (Prescriptions, Labs, Discharge Summaries)
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- prescription, lab_report, discharge_summary, insurance
    storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    uploaded_via VARCHAR(20) DEFAULT 'kiosk_scan', -- kiosk_scan, mobile_qr_upload
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Document OCR Extractions with Formulary Matching & Human Correction
CREATE TABLE IF NOT EXISTS ocr_extractions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    extracted_value TEXT NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    formulary_match VARCHAR(255),
    reference_range VARCHAR(100),
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason VARCHAR(255),
    corrected_value TEXT,
    corrected_by VARCHAR(50),
    corrected_at TIMESTAMP WITH TIME ZONE,
    confirmed BOOLEAN DEFAULT FALSE
);

-- 12. Red-Flag / Emergency Events (Deterministic Rule Engine)
CREATE TABLE IF NOT EXISTS red_flag_events (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    rule_id VARCHAR(50) NOT NULL,
    rule_description TEXT NOT NULL,
    severity_tier VARCHAR(20) NOT NULL, -- Routine, Priority, Emergency
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by VARCHAR(50),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- 13. Case Reports (Doctor-Facing Standardized Summary)
CREATE TABLE IF NOT EXISTS case_reports (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, doctor_reviewed, confirmed, published
    fhir_composition_id VARCHAR(100),
    fhir_bundle_json JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_by_doctor_id VARCHAR(50),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    doctor_notes TEXT,
    doctor_edits_json JSONB DEFAULT '{}'::jsonb
);

-- 14. Interoperability: FHIR Sync Log (ABDM & Hospital HIS)
CREATE TABLE IF NOT EXISTS fhir_sync_log (
    id VARCHAR(36) PRIMARY KEY,
    case_report_id VARCHAR(36) NOT NULL REFERENCES case_reports(id) ON DELETE CASCADE,
    target_system VARCHAR(50) NOT NULL, -- ABDM_M1, ABDM_M2, HAPI_FHIR, HOSPITAL_HIS
    status VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued, sent, failed, retrying
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 15. Audit & Compliance Log (Append-Only, Hash-Chained, DPDP Act 2023)
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL, -- patient_kiosk, nurse, doctor, admin, compliance_officer, system
    action VARCHAR(100) NOT NULL,    -- READ_PHI, WRITE_PHI, CONSENT_GRANT, CONSENT_REVOKE, RED_FLAG_TRIGGER, DOCTOR_CONFIRM, OCR_EDIT
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    payload_summary TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    prev_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL
);

-- Indexes for high-throughput waiting room & triage lookups
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_red_flags_session_tier ON red_flag_events(session_id, severity_tier);
CREATE INDEX IF NOT EXISTS idx_ocr_document_id ON ocr_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);

-- Seed Initial System Genesis Hash for Tamper-Evident Audit Chain
INSERT INTO audit_log (id, actor_id, actor_role, action, resource_type, resource_id, payload_summary, timestamp, prev_hash, hash)
VALUES (
    'genesis-0000-0000-0000-000000000000',
    'system',
    'admin',
    'SYSTEM_GENESIS',
    'system',
    'root',
    'MediKiosk DPDP Act 2026 Audit Genesis Block Initialized',
    CURRENT_TIMESTAMP,
    '0000000000000000000000000000000000000000000000000000000000000000',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
) ON CONFLICT (id) DO NOTHING;

-- Seed Demo Patients for Hackathon Demonstrations
INSERT INTO patients (id, abha_id, mrn, name, dob, gender, phone, preferred_language)
VALUES 
('pat-101', '91-4521-8890-1234', 'MRN-2026-001', 'Ramesh Kumar Sharma', '1968-05-14', 'Male', '+919876543210', 'hi'),
('pat-102', '91-8765-4321-5678', 'MRN-2026-002', 'Priya Patel', '1989-11-22', 'Female', '+919811223344', 'en'),
('pat-103', '91-3344-5566-7788', 'MRN-2026-003', 'Lakshmi Narayanan', '1955-03-30', 'Female', '+919443322110', 'hi')
ON CONFLICT (id) DO NOTHING;
