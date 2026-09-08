# MediKiosk
# MASTER DEVELOPMENT PROMPT — MediKiosk
### AI-Powered Patient Case-Taking & Medical History System
**SIH Problem Statement ID:** SIH26047 | **Theme:** MedTech / BioTech / HealthTech | **Category:** Software | **Team:** Power Rangers

---

## HOW TO USE THIS DOCUMENT

This is a complete build specification. If you paste this into an AI coding assistant (Claude Code, Cursor, etc.) or hand it to a dev team, it should be able to scaffold the entire system end-to-end without needing to ask "what do you mean by X" for any core feature. Every module from the original SIH submission is expanded here with concrete requirements, data models, API contracts, and acceptance criteria. Nothing from the original slides has been left out — OCR, ASR/TTS, conversational AI, red-flag detection, AYUSH mode, FHIR/ABHA integration, consent/audit, and infra are all specified in full.

Work through the phases in order (Section 12). Do not skip the consent/audit layer or the human-verification gates on OCR and AI outputs — these are compliance-critical, not optional polish.

---

## 1. PROJECT OVERVIEW

**Problem:** Indian primary-care consultations last 2–5 minutes on average. Doctors spend most of that time asking basic history questions (chief complaint, past history, medications, allergies) instead of diagnosing. Patients — especially elderly, low-literacy, and first-time visitors — struggle to communicate a complete history verbally in that window. Prior prescriptions, lab reports, and discharge summaries usually arrive as photos or paper, unread before consultation.

**Solution:** MediKiosk is a voice- and touch-enabled kiosk/PWA that a patient uses in the waiting room before seeing the doctor. It:
1. Conducts a structured, AI-guided interview covering Chief Complaint (CC), History of Present Illness (HPI), Past History (PH), Family History (FH), and Review of Systems (ROS).
2. Reads and digitizes prior prescriptions, lab reports, and discharge letters via OCR.
3. Optionally runs an AYUSH-specific intake using **Dashavidha Pariksha** (the ten-fold examination from Ayurvedic diagnostics).
4. Detects emergency/red-flag symptoms in real time and escalates the patient for priority triage.
5. Compiles everything into a single standardized report the doctor reviews, edits, and confirms before it becomes part of the record.
6. Publishes the confirmed record to the hospital's HIS and to the patient's ABHA-linked longitudinal health record via FHIR.

**Core design principle (non-negotiable):** MediKiosk is a **decision-support and data-collection tool**, never an autonomous diagnostician. Every AI-generated output — OCR text, red-flag detection, conversational summary — is a draft that a doctor must review and confirm. Nothing gets written to the medical record without human sign-off, except audit/consent logs which are append-only and automatic.

---

## 2. USERS & PERSONAS

| Persona | Context | Needs |
|---|---|---|
| **Patient (elderly/low-literacy)** | Waiting room, first visit or follow-up | Large touch targets, voice-first interaction, regional language support, simple confirmation steps, ability to skip/return |
| **Patient (tech-comfortable)** | Waiting room | Faster touchscreen path, ability to type instead of speak, upload documents from phone |
| **Doctor/Clinician** | Consultation room, 2–5 min per patient | Structured one-screen summary, red flags surfaced first, one-click accept/edit, no blind trust in AI text |
| **Nurse/Front-desk staff** | Assisted-mode support during rollout | Ability to help patients use the kiosk, override/restart sessions, flag technical issues |
| **Hospital IT Admin** | Deployment, integration | User/role management, HIS/FHIR integration config, system health dashboard, audit log access |
| **Compliance Officer** | Periodic review | Consent records, audit trail, data retention controls, DPDP Act 2023 compliance evidence |

---

## 3. FUNCTIONAL MODULES (FULL DETAIL)

### 3.1 Authentication & Identity
- **Patient identity:** Verify via ABHA ID (QR scan or number entry) or hospital MRN/mobile OTP fallback for patients without ABHA.
- **Staff identity:** OAuth2/OIDC via Keycloak; role-based access control (RBAC) with roles: `patient_kiosk`, `nurse`, `doctor`, `admin`, `compliance_officer`.
- **Session model:** Kiosk sessions are anonymous-until-verified; a session token binds to a patient only after identity confirmation.
- **Failure handling:** Invalid ABHA / expired OTP / failed biometric → clear retry flow, fallback to manual front-desk registration, never block care.
- **Acceptance criteria:** Login flow completes in <15 seconds for returning ABHA patients; failed auth attempts are rate-limited and logged.

### 3.2 Consent Management (must be first screen after identity)
- Explicit, layered consent screen (not a single "I agree" checkbox): separate toggles for (a) voice recording & processing, (b) document OCR, (c) sharing structured history with the treating doctor, (d) publishing to ABDM/HIS.
- Consent must be captured in the patient's chosen language, read aloud via TTS for low-literacy users.
- Consent is versioned — every consent event stores: patient ID, consent version/text hash, timestamp, channel (voice/touch), and IP/device.
- Patient can revoke non-essential consents (e.g., ABDM publishing) at any time before doctor confirmation; revocation halts the corresponding downstream step immediately.
- **Data model:** `consent_log(id, patient_id, session_id, consent_type, granted, consent_text_version, captured_at, method)`.

### 3.3 AI-Powered Voice & Touchscreen Interview Engine
- **Interaction modes:** Voice-only, touch-only, or mixed (patient can switch anytime).
- **Language support:** Minimum Hindi + English at launch; architecture must support adding Indic languages via AI4Bharat/Bhashini without code changes (language pack pattern).
- **Interview structure (must collect, in order, but allow free navigation):**
  1. **Chief Complaint (CC):** Open question → guided follow-ups (onset, duration, severity 1–10, aggravating/relieving factors).
  2. **History of Present Illness (HPI):** Structured OLDCARTS-style follow-up (Onset, Location, Duration, Character, Aggravating/Alleviating, Radiation, Timing, Severity) driven dynamically by CC.
  3. **Past History (PH):** Prior diagnoses, surgeries, hospitalizations, current medications (name/dose/frequency), known allergies (drug/food/environmental) — allergies field is mandatory and cannot be skipped without explicit "none" confirmation.
  4. **Family History (FH):** First-degree relative conditions (diabetes, hypertension, cardiac, cancer, hereditary conditions).
  5. **Review of Systems (ROS):** Checklist by system (cardiovascular, respiratory, GI, neuro, musculoskeletal, dermatological, psychological) — presented as quick yes/no with voice follow-up on "yes".
- **Conversational AI behavior constraints:**
  - Self-hosted LLM (Llama 3.x / Mistral class) constrained to a fixed clinical ontology (SNOMED CT / ICD-11 concept mapping) — the model must not free-associate diagnoses or suggest treatments to the patient.
  - Use a "SOCRATES"-style question framework (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating/relieving, Severity) to drive HPI follow-ups.
  - Every AI-parsed answer is shown back to the patient for a yes/no confirmation ("You said the pain started 3 days ago — is that correct?") before being finalized.
  - No AI-generated content is ever presented to the patient as a diagnosis, prognosis, or treatment suggestion — interview scope is strictly information-gathering.
- **Accessibility:** Font scaling, high-contrast mode, audio playback of every screen, adjustable speech rate, "repeat question" button, session pause/resume (patient can step away and return within a configurable timeout, e.g., 20 minutes).

### 3.4 Document Digitization (OCR Pipeline)
- **Inputs:** Photos/scans of prescriptions, lab reports, discharge summaries, insurance cards — captured via kiosk camera or uploaded from patient's phone (QR-code handoff to a mobile upload page).
- **Printed-text OCR:** Google Document AI or Azure Form Recognizer — extract structured fields (drug name, dose, frequency, date; lab test name, value, unit, reference range, flag).
- **Handwritten-text OCR:** Fine-tuned TrOCR / PaddleOCR — **explicitly treated as an assistive function requiring mandatory human verification**, never auto-committed to the record.
- **Post-OCR validation pipeline (required, not optional):**
  1. Confidence scoring per extracted field.
  2. Cross-reference drug names against RxNorm/DrugBank formulary; flag low-confidence or unmatched names for manual correction.
  3. Cross-reference lab values against normal reference ranges; flag out-of-range values.
  4. Present extracted data as an **editable form**, not raw text — doctor or nurse must confirm or correct each field before it's saved.
- **Clinical NLP layer:** BioBERT/ScispaCy to normalize free-text clinical notes from discharge letters into structured problem lists (ICD-11-coded where possible).
- **Acceptance criteria:** OCR extraction + human confirmation for a typical 1-page prescription completes in under 90 seconds; system never silently auto-accepts a low-confidence field.

### 3.5 AYUSH Mode — Dashavidha Pariksha
- Toggle available at intake start ("Would you like to include a traditional Ayurvedic assessment?").
- Implements the ten-fold examination framework, each captured via dedicated guided questions/voice prompts:
  1. **Prakriti** (constitution — Vata/Pitta/Kapha assessment questionnaire)
  2. **Vikriti** (current state of dosha imbalance)
  3. **Sara** (tissue quality)
  4. **Samhanana** (body build/compactness)
  5. **Pramana** (body measurements)
  6. **Satmya** (suitability/habituation to foods, climate)
  7. **Satva** (psychological strength)
  8. **Ahara Shakti** (digestive capacity — appetite, digestion)
  9. **Vyayama Shakti** (exercise capacity/tolerance)
  10. **Vaya** (age-related considerations)
- Output is a separate, clearly labeled section in the final report — never merged with or presented as equivalent to the allopathic clinical assessment, to avoid clinical ambiguity. Reviewed by an AYUSH-qualified practitioner where the hospital offers integrated medicine.

### 3.6 Red-Flag / Emergency Detection
- **Design decision (per feasibility analysis):** Emergency detection runs on **deterministic, rule-based logic**, not solely LLM judgment, so that triggers are consistent and auditable.
- **Rule engine inputs:** Structured answers from CC/HPI/ROS (e.g., chest pain + radiating to arm + shortness of breath; severe headache + sudden onset + vision changes; high fever + stiff neck + confusion; active bleeding; suicidal ideation keywords).
- **Rule engine outputs:** Severity tier (`Routine` / `Priority` / `Emergency`) with the specific triggering rule(s) logged for auditability.
- **Escalation flow:** `Emergency` tier immediately alerts front-desk/nursing staff via real-time WebSocket push + audible/visual kiosk alert; patient is pulled from the standard queue.
- **False-negative mitigation:** Rule set is versioned and must be clinically reviewed/signed off before deployment and after every update; maintain a test suite of known trigger/non-trigger scenarios that must pass on every rule change.

### 3.7 Standardized Report Generation
- Compiles CC, HPI, PH, FH, ROS, digitized documents, AYUSH section (if used), and red-flag summary into one structured, doctor-facing report.
- Report is generated as structured data first (JSON/FHIR resources), rendered as a human-readable summary second — never the reverse, so the underlying data stays queryable and interoperable.
- **Doctor review screen requirements:**
  - Red flags and abnormal values surfaced at the top, visually distinct (color + icon, not color alone).
  - Every field individually editable inline.
  - "Accept as-is" vs "Edit" vs "Discard and redo interview" actions, each logged with doctor ID and timestamp.
  - Report is only written to the permanent record after explicit doctor confirmation.

### 3.8 Interoperability — FHIR & ABHA / ABDM
- Output as **FHIR R4** resources: `Patient`, `Condition`, `Observation` (for vitals/labs), `MedicationStatement`, `AllergyIntolerance`, `Composition` (for the overall case-taking document), `DocumentReference` (for scanned originals).
- **ABHA integration:** Patient identity verification and consent-linked health record publishing via ABDM Sandbox APIs (M1/M2 milestones — patient discovery, linking, and health information exchange).
- **HIS integration:** Confirmed reports pushed to hospital information systems via HAPI FHIR server acting as the interoperability layer; support both push (webhook) and pull (FHIR REST query) integration patterns since HIS vendors vary.
- Must gracefully degrade if ABDM/HIS is unreachable: queue the record locally, retry with backoff, alert admin dashboard if retries exceed a threshold — never lose data due to a downstream integration outage.

### 3.9 Doctor Dashboard
- Queue view: patients waiting, sorted by triage tier, with wait time.
- Patient detail view: full standardized report, prior visit history (if ABHA-linked), digitized documents viewer side-by-side with extracted structured data.
- Quick actions: confirm report, request patient to redo a section, escalate, add clinical note.
- Analytics (admin-facing): average time saved per consultation, OCR accuracy trend, red-flag trigger frequency, kiosk utilization.

### 3.10 Audit & Compliance Layer
- **Audit log** (append-only, tamper-evident — hash-chained or write-once storage): every read/write of PHI, every AI inference call, every consent change, every doctor override.
- **Data protection (DPDP Act 2023):** field-level encryption at rest for PHI, encryption in transit (TLS 1.2+), data minimization (don't collect fields not needed for the stated purpose), configurable retention/erasure policy, data localization compliance for any cloud services used.
- **Access control:** RBAC enforced at API layer, not just UI; every PHI-accessing endpoint requires an authenticated, role-checked request.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

| Category | Requirement |
|---|---|
| **Performance** | Kiosk interview flow responsive within 500ms per interaction; OCR processing <30s for a standard document; system supports at least 20 concurrent kiosk sessions per hospital deployment |
| **Reliability** | Must function (with reduced features) under intermittent hospital network connectivity — offline-first PWA caching for the interview flow; sync when connectivity restores |
| **Usability** | WCAG 2.1 AA accessibility minimum; tested with representative elderly/low-literacy users before pilot |
| **Security** | OWASP ASVS Level 2 baseline; formal security review required before deployment with real patient data |
| **Scalability** | Stateless API layer horizontally scalable; Redis for session/cache, PostgreSQL primary store, MinIO for document blobs |
| **Localization** | Language packs pluggable without redeploying core app |
| **Auditability** | Every clinically significant action traceable to an actor, timestamp, and reason |

---

## 5. SYSTEM ARCHITECTURE

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│   Patient Kiosk (PWA)        │        │   Doctor/Staff Dashboard │
│   React + TypeScript         │        │   React + TypeScript     │
└──────────────┬───────────────┘        └────────────┬─────────────┘
               │  REST / WebSocket                     │
               ▼                                        ▼
       ┌───────────────────────────────────────────────────────┐
       │                FastAPI Backend (Python)                │
       │  ┌───────────┐ ┌───────────┐ ┌───────────────────────┐ │
       │  │ Interview  │ │  OCR/NLP   │ │ Red-flag Rule Engine  │ │
       │  │ Orchestr.  │ │ Pipeline   │ │ (deterministic)       │ │
       │  └───────────┘ └───────────┘ └───────────────────────┘ │
       │  ┌───────────┐ ┌───────────┐ ┌───────────────────────┐ │
       │  │ Consent &  │ │ FHIR/ABHA  │ │ Auth (Keycloak OIDC)  │ │
       │  │ Audit Log  │ │ Adapter    │ │                       │ │
       │  └───────────┘ └───────────┘ └───────────────────────┘ │
       └───────────────┬─────────────────────┬────────────────┘
                        │                      │
         ┌──────────────┴──────┐     ┌─────────┴──────────────┐
         │ PostgreSQL (primary) │     │ Redis (cache/pubsub)   │
         │ MinIO (documents)    │     │ WebSocket alerts       │
         └──────────────────────┘     └────────────────────────┘
                        │
         ┌──────────────┴───────────────────────────────┐
         │ External Services: AI4Bharat/Bhashini (ASR/TTS)│
         │ Self-hosted LLM (Llama 3.x/Mistral)             │
         │ Google Document AI / Azure Form Recognizer      │
         │ TrOCR / PaddleOCR (fine-tuned)                  │
         │ BioBERT / ScispaCy                              │
         │ RxNorm / DrugBank reference data                │
         │ HAPI FHIR + ABDM Sandbox APIs                   │
         └──────────────────────────────────────────────┘
```

---

## 6. TECHNOLOGY STACK (as specified)

- **Frontend (kiosk + dashboard):** React + TypeScript, built as a PWA for offline resilience.
- **Backend/API:** Python, FastAPI.
- **Real-time alerts:** WebSockets + Redis Pub/Sub.
- **Speech-to-text (ASR):** AI4Bharat / Bhashini (IndicWhisper).
- **Text-to-speech (TTS):** AI4Bharat Indic-TTS / Bhashini.
- **Conversational AI:** Self-hosted LLM (Llama 3.x / Mistral), ontology-constrained, SOCRATES-framework for HPI.
- **OCR — printed docs:** Google Document AI / Azure Form Recognizer.
- **OCR — handwritten docs:** TrOCR / PaddleOCR (fine-tuned).
- **Clinical NLP:** BioBERT / ScispaCy.
- **Drug & lab reference data:** RxNorm + DrugBank open data.
- **Health records/interop:** HAPI FHIR + ABDM Sandbox APIs.
- **Database:** PostgreSQL (primary), Redis (cache/pubsub), MinIO (S3-compatible object storage for documents).
- **Auth/identity:** Keycloak (OAuth2/OIDC).
- **Consent & audit:** PostgreSQL `consent_log` / `audit_log` tables.
- **Infrastructure:** Docker / Docker Compose.

---

## 7. CORE DATA MODEL (PostgreSQL, minimum viable schema)

```sql
-- Identity & sessions
patients(id, abha_id, mrn, name, dob, gender, phone, preferred_language, created_at)
sessions(id, patient_id, kiosk_id, status, started_at, ended_at, language)

-- Consent (Section 3.2)
consent_log(id, patient_id, session_id, consent_type, granted, consent_text_version, captured_at, method)

-- Interview data
interview_cc(id, session_id, description, onset, duration, severity, raw_transcript, confirmed_by_patient)
interview_hpi(id, session_id, socrates_json, confirmed_by_patient)
interview_ph(id, session_id, past_diagnoses, surgeries, medications_json, allergies_json, confirmed_by_patient)
interview_fh(id, session_id, relative, condition, confirmed_by_patient)
interview_ros(id, session_id, system, finding, confirmed_by_patient)

-- AYUSH (Section 3.5)
ayush_assessment(id, session_id, prakriti, vikriti, sara, samhanana, pramana, satmya, satva,
                  ahara_shakti, vyayama_shakti, vaya, notes)

-- Documents & OCR (Section 3.4)
documents(id, session_id, doc_type, storage_key, uploaded_via, uploaded_at)
ocr_extractions(id, document_id, field_name, extracted_value, confidence_score,
                 formulary_match, flagged, corrected_value, corrected_by, corrected_at)

-- Red flags (Section 3.6)
red_flag_events(id, session_id, rule_id, rule_description, severity_tier, triggered_at, acknowledged_by, acknowledged_at)

-- Reports (Section 3.7)
case_reports(id, session_id, status, fhir_composition_id, generated_at,
             confirmed_by_doctor_id, confirmed_at, doctor_edits_json)

-- Interop (Section 3.8)
fhir_sync_log(id, case_report_id, target_system, status, attempt_count, last_attempt_at, error_message)

-- Audit (Section 3.10)
audit_log(id, actor_id, actor_role, action, resource_type, resource_id, timestamp, prev_hash, hash)
```

---

## 8. KEY API ENDPOINTS (FastAPI, representative — expand as needed)

```
POST   /auth/patient/verify-abha
POST   /auth/staff/login
POST   /consent                         # record a consent event
GET    /consent/{session_id}

POST   /sessions                        # start kiosk session
GET    /sessions/{id}
PATCH  /sessions/{id}/pause
PATCH  /sessions/{id}/resume

POST   /interview/{session_id}/cc
POST   /interview/{session_id}/hpi
POST   /interview/{session_id}/ph
POST   /interview/{session_id}/fh
POST   /interview/{session_id}/ros
POST   /interview/{session_id}/ayush

POST   /documents/{session_id}/upload
GET    /documents/{id}/ocr-result
PATCH  /documents/{id}/ocr-result       # human correction

GET    /redflags/{session_id}
WS     /ws/alerts                       # real-time red-flag push to staff

POST   /reports/{session_id}/generate
GET    /reports/{id}
PATCH  /reports/{id}/confirm            # doctor sign-off, required before publish

POST   /fhir/{report_id}/publish        # push to HIS / ABDM
GET    /fhir/{report_id}/sync-status

GET    /audit?resource_id=&actor_id=&from=&to=
```

---

## 9. UX FLOW SUMMARY

**Patient path:** Arrive → Identity verify (ABHA/OTP/MRN) → Consent → Language select → Interview mode select (voice/touch) → CC → HPI (dynamic follow-ups) → Document upload (optional) → PH → FH → ROS → AYUSH mode (optional) → Review & confirm own answers → Session complete, wait for consultation.

**Doctor path:** Login → Queue (sorted by triage tier) → Select patient → Review structured report (red flags on top) → Edit/confirm any field → Confirm report → Consultation proceeds with full context → Add consultation notes → Close case → Auto-publish to HIS/ABDM.

**Staff/nurse path (assisted mode):** Monitor kiosk statuses → Assist patients who need help → Receive emergency escalations in real time → Override/restart stuck sessions.

---

## 10. FEASIBILITY, RISKS & MITIGATIONS (carried forward from submission)

| Risk | Mitigation |
|---|---|
| Unreliable handwriting OCR | Treated strictly as assistive; confidence scoring + formulary cross-check + mandatory human verification |
| Errors in AI-driven history elicitation | All AI outputs are editable drafts; physician confirmation required before anything is finalized |
| Missed/false emergency alerts | Deterministic rule-based logic (not pure LLM judgment); versioned rule set with regression test suite; clinical sign-off before deploy |
| Low-literacy/elderly adoption | Assisted-mode staffing during rollout, audio-guided navigation, structured usability testing with representative users |
| Clinician distrust of AI summaries | Shadow-mode pilot — AI summaries run alongside existing paper/verbal workflow before full reliance |
| Unstable hospital network | Offline-first PWA caching; local queue with retry/backoff for sync |
| ABDM/FHIR approval timelines | Begin ABDM sandbox integration early, in parallel with core development |
| DPDP Act 2023 compliance | Consent management, field-level encryption, audit logging built in from day one; formal security review pre-deployment |

---

## 11. TESTING REQUIREMENTS

- **Unit tests:** every rule in the red-flag engine (positive + negative cases), every OCR post-processing validator, every FHIR resource mapper.
- **Integration tests:** full interview flow end-to-end, OCR upload → extraction → human correction → report inclusion, consent revocation propagation.
- **Usability testing:** minimum 10 representative patients (mixed literacy/age) before pilot, with task-completion time and error-rate metrics.
- **Security testing:** OWASP-based penetration test / formal review before any real patient data is used.
- **Clinical validation:** red-flag rule set reviewed and signed off by a licensed clinician before deployment, and after every rule change.
- **Load testing:** simulate 20+ concurrent kiosk sessions plus dashboard polling to validate performance targets.

---

## 12. RECOMMENDED BUILD PHASES

1. **Phase 0 — Foundations:** Docker Compose skeleton, PostgreSQL/Redis/MinIO, Keycloak auth, base FastAPI + React scaffolds, consent & audit log tables wired end-to-end.
2. **Phase 1 — Core Interview:** CC/HPI/PH/FH/ROS flows (touch-first, then add voice), patient-side confirmation loop, session pause/resume.
3. **Phase 2 — Document Intelligence:** OCR pipeline (printed first, then handwritten), formulary/lab cross-referencing, human-correction UI.
4. **Phase 3 — Safety Layer:** Red-flag rule engine, real-time staff alerting via WebSocket, escalation workflow.
5. **Phase 4 — Reporting & Doctor Dashboard:** Report generation, doctor review/confirm UI, queue view.
6. **Phase 5 — AYUSH Mode:** Dashavidha Pariksha module as an optional add-on flow.
7. **Phase 6 — Interoperability:** FHIR resource generation, HAPI FHIR server integration, ABDM sandbox connection, HIS push/pull adapters.
8. **Phase 7 — Hardening:** Accessibility pass, offline-first PWA behavior, security review, load testing, shadow-mode clinical pilot.

---

## 13. RESEARCH BASIS

- Irving G, Neves AL, Dambha-Miller H, et al. "International variations in primary care physician consultation time: a systematic review of 67 countries." *BMJ Open* 2017;7:e017902 — evidence base for the 2–5 minute consultation constraint this system is designed around.
- National Health Authority, Government of India — ABDM (Ayushman Bharat Digital Mission) ecosystem details: ABHA IDs, Healthcare Professionals Registry, Health Facility Registry (mohfw.gov.in/press-info/7908, abdm.gov.in).

---

**End of specification. Build in the phase order above; do not connect real patient data until Phase 7's security review and clinical sign-off are complete.**
