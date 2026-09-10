export interface Patient {
  id: string;
  abha_id?: string;
  mrn?: string;
  name: string;
  dob?: string;
  gender?: string;
  phone?: string;
  preferred_language: string;
}

export interface KioskSession {
  id: string;
  patient_id?: string;
  kiosk_id: string;
  status: string; // active, paused, completed, emergency_escalated
  current_step: string;
  language: string;
  started_at: string;
  patient?: Patient;
}

export interface ConsentMap {
  voice_recording: boolean;
  document_ocr: boolean;
  share_with_doctor: boolean;
  abdm_publish: boolean;
}

export interface SocratesData {
  site: string;
  onset: string;
  character: string;
  radiation: string;
  associations: string;
  timing: string;
  exacerbating_relieving: string;
  severity: number;
}

export interface MedicationItem {
  name: string;
  dose: string;
  frequency: string;
  verified_formulary?: boolean;
}

export interface PastHistoryData {
  past_diagnoses: string;
  surgeries: string;
  medications: MedicationItem[];
  allergies: string[];
  allergies_confirmed: boolean;
}

export interface ReviewOfSystemsData {
  cardiovascular?: Record<string, boolean>;
  respiratory?: Record<string, boolean>;
  gastrointestinal?: Record<string, boolean>;
  neurological?: Record<string, boolean>;
  musculoskeletal?: Record<string, boolean>;
  dermatological?: Record<string, boolean>;
  psychological?: Record<string, boolean>;
}

export interface AyushData {
  prakriti: string;
  vikriti: string;
  sara: string;
  samhanana: string;
  pramana: string;
  satmya: string;
  satva: string;
  ahara_shakti: string;
  vyayama_shakti: string;
  vaya: string;
  notes?: string;
}

export interface OcrField {
  id: string;
  document_id: string;
  field_name: string;
  extracted_value: string;
  confidence_score: number;
  formulary_match?: string;
  reference_range?: string;
  flagged: boolean;
  flag_reason?: string;
  corrected_value?: string;
  corrected_by?: string;
  confirmed: boolean;
}

export interface DocumentItem {
  id: string;
  session_id: string;
  doc_type: string;
  original_filename: string;
  mime_type?: string;
  uploaded_via: string;
  uploaded_at: string;
  extractions: OcrField[];
}

export interface RedFlagRule {
  rule_id: string;
  description: string;
  tier: string; // Routine, Priority, Emergency
}

export interface RedFlagEvent {
  id: string;
  session_id: string;
  rule_id: string;
  rule_description: string;
  severity_tier: string;
  triggered_at: string;
  acknowledged_by?: string;
  resolution_notes?: string;
}

export interface QueueItem {
  session_id: string;
  patient_id?: string;
  patient_name: string;
  abha_id?: string;
  mrn: string;
  triage_tier: string;
  status: string;
  wait_minutes: number;
  started_at: string;
  red_flags_count: number;
  report_status: string;
  report_id?: string;
}

export interface AuditRecord {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  payload_summary?: string;
  timestamp: string;
  prev_hash: string;
  hash: string;
}
