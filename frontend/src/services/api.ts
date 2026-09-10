const API_BASE = '/api';

export const api = {
  // Auth
  verifyAbha: async (abhaId: string, otp: string = '123456') => {
    const res = await fetch(`${API_BASE}/auth/patient/verify-abha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abha_id: abhaId, otp }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'ABHA verification failed');
    return res.json();
  },

  verifyMrn: async (mrn: string, phone?: string) => {
    const res = await fetch(`${API_BASE}/auth/patient/verify-mrn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mrn, phone }),
    });
    if (!res.ok) throw new Error('MRN verification failed');
    return res.json();
  },

  staffLogin: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },

  // Sessions
  createSession: async (patientId?: string, language: string = 'hi') => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, language }),
    });
    return res.json();
  },

  getSession: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    return res.json();
  },

  pauseSession: async (sessionId: string, pin: string = '1234') => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/pause`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pause_pin: pin }),
    });
    return res.json();
  },

  resumeSession: async (sessionId: string, pin: string) => {
    const res = await fetch(`${API_BASE}/sessions/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, pause_pin: pin }),
    });
    if (!res.ok) throw new Error('Incorrect PIN for paused session');
    return res.json();
  },

  // Consent
  recordConsent: async (sessionId: string, consentType: string, granted: boolean, method: string = 'touch') => {
    const res = await fetch(`${API_BASE}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        consent_type: consentType,
        granted,
        method
      }),
    });
    return res.json();
  },

  getConsents: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/consent/${sessionId}`);
    return res.json();
  },

  // Interview
  submitCC: async (sessionId: string, data: { description: string; onset?: string; duration?: string; severity?: number }) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/cc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  submitHPI: async (sessionId: string, socratesJson: any) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/hpi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socrates_json: socratesJson }),
    });
    return res.json();
  },

  submitPH: async (sessionId: string, data: { past_diagnoses?: string; surgeries?: string; medications: any[]; allergies: string[]; allergies_confirmed: boolean }) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/ph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  submitROS: async (sessionId: string, systemsChecklist: any) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/ros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systems_checklist: systemsChecklist }),
    });
    return res.json();
  },

  submitAyush: async (sessionId: string, ayushData: any) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/ayush`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ayushData),
    });
    return res.json();
  },

  getSummary: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/summary`);
    return res.json();
  },

  confirmInterview: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/interview/${sessionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    });
    return res.json();
  },

  // Documents & OCR
  uploadDocument: async (sessionId: string, docType: string, file: File, uploadedVia: string = 'kiosk_scan') => {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('uploaded_via', uploadedVia);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/${sessionId}/upload`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  getSessionDocuments: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/documents/session/${sessionId}`);
    return res.json();
  },

  correctOcrField: async (documentId: string, fieldName: string, correctedValue: string) => {
    const res = await fetch(`${API_BASE}/documents/${documentId}/ocr-result`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_name: fieldName, corrected_value: correctedValue, confirmed: true }),
    });
    return res.json();
  },

  // Red Flags
  evaluateRedFlags: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/redflags/${sessionId}/evaluate`, { method: 'POST' });
    return res.json();
  },

  acknowledgeRedFlag: async (eventId: string, notes: string = 'Acknowledged by clinical staff') => {
    const res = await fetch(`${API_BASE}/redflags/${eventId}/acknowledge`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_notes: notes }),
    });
    return res.json();
  },

  // Doctor Dashboard & Reports
  getDoctorQueue: async () => {
    const res = await fetch(`${API_BASE}/reports/queue`);
    return res.json();
  },

  getReportDetail: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/reports/session/${sessionId}`);
    return res.json();
  },

  generateReport: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/reports/${sessionId}/generate`, { method: 'POST' });
    return res.json();
  },

  doctorEditField: async (reportId: string, section: string, fieldName: string, newValue: any, reason: string) => {
    const res = await fetch(`${API_BASE}/reports/${reportId}/edit-field`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, field_name: fieldName, new_value: newValue, reason }),
    });
    return res.json();
  },

  doctorConfirmReport: async (reportId: string, notes: string) => {
    const res = await fetch(`${API_BASE}/reports/${reportId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true, doctor_notes: notes }),
    });
    return res.json();
  },

  // FHIR & ABDM
  getFhirBundle: async (reportId: string) => {
    const res = await fetch(`${API_BASE}/fhir/${reportId}/bundle`);
    return res.json();
  },

  publishToAbdm: async (reportId: string, target: string = 'ABDM_SANDBOX') => {
    const res = await fetch(`${API_BASE}/fhir/${reportId}/publish?target_system=${target}`, { method: 'POST' });
    return res.json();
  },

  // Audit & Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    return res.json();
  },

  getAuditTrail: async () => {
    const res = await fetch(`${API_BASE}/audit?limit=100`);
    return res.json();
  },

  verifyAuditChain: async () => {
    const res = await fetch(`${API_BASE}/audit/verify-chain`);
    return res.json();
  }
};
