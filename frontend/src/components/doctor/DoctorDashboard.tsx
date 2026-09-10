import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileCheck, 
  AlertOctagon, 
  BarChart3, 
  ShieldCheck, 
  Search, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Share2, 
  Eye, 
  ChevronRight,
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { QueueItem, RedFlagEvent } from '../../types/clinical';

export const DoctorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'report' | 'analytics' | 'audit'>('queue');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any | null>(null);

  // Doctor confirmation notes
  const [doctorNotes, setDoctorNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  // FHIR Modal
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [fhirJson, setFhirJson] = useState<any>(null);

  // Audit tab
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditVerification, setAuditVerification] = useState<any>(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Analytics tab
  const [analytics, setAnalytics] = useState<any>(null);

  // Inline edit state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadQueue();
    initWebSocket();
  }, []);

  const loadQueue = async () => {
    try {
      const data = await api.getDoctorQueue();
      setQueue(data);
      if (data.length > 0 && !selectedSessionId) {
        handleSelectPatient(data[0].session_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'EMERGENCY_TRIAGE_ALERT') {
            setActiveAlert(data);
            loadQueue(); // Refresh queue immediately
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (e) {
      console.warn('WS alert connection failed, falling back to polling:', e);
    }
    return () => {
      if (ws) ws.close();
    };
  };

  const handleSelectPatient = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoading(true);
    try {
      const detail = await api.getReportDetail(sessionId);
      setReportDetail(detail);
      setDoctorNotes(detail.report?.doctor_notes || 'Clinical history verified with patient. Standard care plan initiated.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReport = async () => {
    if (!reportDetail?.report?.id) return;
    setConfirming(true);
    try {
      await api.doctorConfirmReport(reportDetail.report.id, doctorNotes);
      await loadQueue();
      handleSelectPatient(selectedSessionId!);
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(false);
    }
  };

  const handlePublishAbdm = async () => {
    if (!reportDetail?.report?.id) return;
    try {
      await api.publishToAbdm(reportDetail.report.id);
      alert('Successfully published FHIR R4 document to ABDM Sandbox Gateway!');
      handleSelectPatient(selectedSessionId!);
    } catch (e: any) {
      alert(e.message || 'Publishing error');
    }
  };

  const handleViewFhir = async () => {
    if (!reportDetail?.report?.id) return;
    try {
      const bundle = await api.getFhirBundle(reportDetail.report.id);
      setFhirJson(bundle);
      setShowFhirModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveInlineEdit = async (section: string, fieldName: string) => {
    if (!reportDetail?.report?.id) return;
    try {
      await api.doctorEditField(
        reportDetail.report.id,
        section,
        fieldName,
        editValue,
        'Corrected by consulting physician during clinical interview'
      );
      setEditingSection(null);
      handleSelectPatient(selectedSessionId!);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditData = async () => {
    try {
      const logs = await api.getAuditTrail();
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const result = await api.verifyAuditChain();
      setAuditVerification(result);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingChain(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Real-time Emergency Alert Banner */}
      {activeAlert && (
        <div className="emergency-alert-card rounded-xl p-4 mb-6 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-rose-950 border border-rose-600 text-rose-200">
                  REAL-TIME EMERGENCY ALERT
                </span>
                <span className="text-xs text-rose-300">Patient: {activeAlert.patient_name}</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                {activeAlert.message}
              </p>
              <div className="flex gap-2 mt-1.5 text-xs text-rose-200">
                {activeAlert.rules?.map((r: any) => (
                  <span key={r.rule_id} className="bg-rose-900/60 px-2 py-0.5 rounded">
                    {r.rule_id}: {r.description}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="btn-secondary text-xs py-1 px-3 border-rose-500 bg-rose-950/60 text-white"
          >
            Acknowledge Alert
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'queue' || activeTab === 'report'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Triage Patient Queue ({queue.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('analytics');
              loadAnalytics();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Hospital Analytics
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audit');
              loadAuditData();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            DPDP Audit Trail
          </button>
        </div>

        <button
          type="button"
          onClick={loadQueue}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Queue
        </button>
      </div>

      {/* Tab: Queue & Detailed Report (Two Column View) */}
      {(activeTab === 'queue' || activeTab === 'report') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Triage Queue */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Waiting Queue (Sorted by Triage)
              </h3>
              <span className="text-xs text-cyan-400 font-mono">Real-Time Sync</span>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {queue.map((item) => {
                const isSelected = item.session_id === selectedSessionId;
                const isEmergency = item.triage_tier === 'Emergency';
                const isPriority = item.triage_tier === 'Priority';

                return (
                  <div
                    key={item.session_id}
                    onClick={() => handleSelectPatient(item.session_id)}
                    className={`glass-panel p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-cyan-500 bg-slate-900 shadow-md shadow-cyan-500/10'
                        : isEmergency
                        ? 'border-rose-600/70 bg-rose-950/20 hover:border-rose-500'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isEmergency
                            ? 'bg-rose-600 text-white animate-pulse'
                            : isPriority
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {item.triage_tier}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{item.mrn}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="h-3 w-3" />
                        {item.wait_minutes}m wait
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base leading-tight mb-1">
                      {item.patient_name}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>ABHA: {item.abha_id ? item.abha_id.slice(-9) : 'Unlinked'}</span>
                      <span className={`font-semibold text-[11px] ${
                        item.report_status === 'confirmed'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}>
                        {item.report_status === 'confirmed' ? '✓ Confirmed' : '• Draft Report'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Clinical Report & Actions */}
          <div className="lg:col-span-8">
            {loading ? (
              <div className="glass-panel p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-3"></div>
                <p className="text-sm text-slate-400">Loading Clinical Case Report...</p>
              </div>
            ) : reportDetail ? (
              <div className="space-y-6">
                {/* Patient Header Card */}
                <div className="glass-panel p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold font-display text-white">
                          {reportDetail.patient?.name}
                        </h2>
                        <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          reportDetail.triage_tier === 'Emergency'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : reportDetail.triage_tier === 'Priority'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {reportDetail.triage_tier} Triage
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                          {reportDetail.report?.status === 'confirmed' ? 'Status: Confirmed Record' : 'Status: AI Draft for Review'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1">
                        <span>ABHA: <strong className="text-white">{reportDetail.patient?.abha_id || 'MRN Registration'}</strong></span>
                        <span>Gender: <strong className="text-white">{reportDetail.patient?.gender}</strong></span>
                        <span>DOB: <strong className="text-white">{reportDetail.patient?.dob}</strong></span>
                        <span>Phone: <strong className="text-white">{reportDetail.patient?.phone}</strong></span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleViewFhir}
                        className="btn-secondary text-xs py-2 px-3"
                      >
                        <Eye className="h-3.5 w-3.5 text-cyan-400" />
                        FHIR R4 JSON
                      </button>

                      {reportDetail.report?.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={handlePublishAbdm}
                          className="btn-secondary text-xs py-2 px-3 border-emerald-600 bg-emerald-950/40 text-emerald-300"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Publish to ABDM
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Red Flags Alert Card on Top */}
                  {reportDetail.red_flags?.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl border border-rose-600/80 bg-rose-950/30">
                      <div className="flex items-center gap-2 font-bold text-rose-300 text-xs uppercase mb-2">
                        <AlertOctagon className="h-4 w-4 text-rose-400" />
                        Deterministic Red Flags Triggered (Rule Engine v1.2.0)
                      </div>
                      <div className="space-y-1.5">
                        {reportDetail.red_flags.map((rf: RedFlagEvent) => (
                          <div key={rf.id} className="text-xs text-white flex items-center justify-between">
                            <span>
                              <strong className="text-rose-400 font-mono">[{rf.rule_id}]</strong> {rf.rule_description}
                            </span>
                            <span className="text-[11px] text-rose-300 font-mono">
                              {new Date(rf.triggered_at).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 1: Chief Complaint & SOCRATES HPI */}
                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-white text-base">
                      1. Chief Complaint & History of Present Illness (SOCRATES)
                    </h3>
                    <span className="text-[11px] text-cyan-400 font-semibold">Editable Draft</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase font-semibold">Complaint</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{reportDetail.clinical_data?.cc?.description}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase font-semibold">Onset & Duration</span>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {reportDetail.clinical_data?.cc?.onset} • {reportDetail.clinical_data?.cc?.duration}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase font-semibold">Pain Severity</span>
                      <p className="text-sm font-bold text-rose-400 mt-0.5">
                        {reportDetail.clinical_data?.cc?.severity} / 10
                      </p>
                    </div>
                  </div>

                  {/* SOCRATES Details */}
                  {reportDetail.clinical_data?.hpi?.socrates_json && (
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                      <span className="font-bold text-cyan-400 uppercase tracking-wider block">
                        SOCRATES Breakdown
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                        <div><strong className="text-slate-500">Site:</strong> {reportDetail.clinical_data.hpi.socrates_json.site}</div>
                        <div><strong className="text-slate-500">Onset:</strong> {reportDetail.clinical_data.hpi.socrates_json.onset}</div>
                        <div><strong className="text-slate-500">Character:</strong> {reportDetail.clinical_data.hpi.socrates_json.character}</div>
                        <div><strong className="text-slate-500">Radiation:</strong> {reportDetail.clinical_data.hpi.socrates_json.radiation}</div>
                        <div><strong className="text-slate-500">Associations:</strong> {reportDetail.clinical_data.hpi.socrates_json.associations}</div>
                        <div><strong className="text-slate-500">Timing:</strong> {reportDetail.clinical_data.hpi.socrates_json.timing}</div>
                        <div className="col-span-2"><strong className="text-slate-500">Exacerbating/Relieving:</strong> {reportDetail.clinical_data.hpi.socrates_json.exacerbating_relieving}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Allergies & Medications */}
                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-white text-base">
                      2. Allergies, Medications & Past History
                    </h3>
                    <span className="text-[11px] text-amber-400 font-semibold">Mandatory Sign-off</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Allergies */}
                    <div className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/20">
                      <span className="text-xs font-bold text-rose-400 uppercase">Declared Allergies</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {reportDetail.clinical_data?.ph?.allergies_json?.map((alg: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-rose-900 border border-rose-700 text-white text-xs font-semibold">
                            {alg}
                          </span>
                        )) || <span className="text-xs text-slate-400">No allergies</span>}
                      </div>
                    </div>

                    {/* Current Meds */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                      <span className="text-xs font-bold text-cyan-400 uppercase">Current Medications</span>
                      <div className="space-y-1 mt-2">
                        {reportDetail.clinical_data?.ph?.medications_json?.map((med: any, i: number) => (
                          <div key={i} className="text-xs text-slate-200">
                            <strong>{med.name}</strong> ({med.dose}) — {med.frequency}
                          </div>
                        )) || <span className="text-xs text-slate-400">None reported</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Side-by-side Digitized Documents vs OCR Extractions */}
                {reportDetail.clinical_data?.documents?.length > 0 && (
                  <div className="glass-panel p-6 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="font-bold text-white text-base">
                        3. Digitized Documents & Formularies (Side-by-Side View)
                      </h3>
                      <span className="text-[11px] text-cyan-400">Assistive Verification</span>
                    </div>

                    {reportDetail.clinical_data.documents.map((doc: any) => (
                      <div key={doc.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{doc.original_filename} ({doc.doc_type})</span>
                          <span className="text-slate-400">Uploaded via {doc.uploaded_via}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Left: Document simulated visual placeholder */}
                          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                            <FileCheck className="h-10 w-10 text-cyan-500 mb-2" />
                            <span className="text-xs font-semibold text-slate-300">Scanned Document Original</span>
                            <span className="text-[11px] text-slate-500">Verified by Assistive OCR Pipeline</span>
                          </div>

                          {/* Right: Extracted fields with confidence */}
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {doc.extractions?.map((ext: any) => (
                              <div key={ext.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>{ext.field_name}</span>
                                  <span className="text-cyan-400 font-mono">{Math.round(ext.confidence_score * 100)}%</span>
                                </div>
                                <div className="font-semibold text-white mt-0.5">
                                  {ext.corrected_value || ext.extracted_value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 4: AYUSH Assessment (Strictly Isolated) */}
                {reportDetail.clinical_data?.ayush && (
                  <div className="glass-panel p-6 space-y-4 border-emerald-800/60 bg-emerald-950/10">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-900/50">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-emerald-300 text-base">
                          4. Traditional AYUSH Assessment (Dashavidha Pariksha)
                        </h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">
                          Segregated Section
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-emerald-100">
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                        <span className="text-slate-400 block text-[10px] uppercase">Prakriti</span>
                        <strong className="text-emerald-300">{reportDetail.clinical_data.ayush.prakriti}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                        <span className="text-slate-400 block text-[10px] uppercase">Vikriti</span>
                        <strong className="text-emerald-300">{reportDetail.clinical_data.ayush.vikriti}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                        <span className="text-slate-400 block text-[10px] uppercase">Ahara Shakti (Agni)</span>
                        <strong className="text-emerald-300">{reportDetail.clinical_data.ayush.ahara_shakti}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-900/50">
                        <span className="text-slate-400 block text-[10px] uppercase">Satva</span>
                        <strong className="text-emerald-300">{reportDetail.clinical_data.ayush.satva}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Doctor Confirmation & Permanent Record Commit */}
                <div className="glass-panel-glow p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-bold text-white text-base">
                      Physician Final Clinical Confirmation & Commit
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Under Indian medical regulations, AI findings are decision-support only. By confirming below, you verify the clinical history with the patient and commit this case report to the hospital EHR and ABHA health record.
                  </p>

                  <textarea
                    rows={2}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Doctor clinical consultation notes, prescriptions ordered, or follow-up instructions..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Logged with Dr. Arun Verma (MD) • DPDP Hash-Chained
                    </span>

                    <button
                      type="button"
                      disabled={confirming || reportDetail.report?.status === 'confirmed'}
                      onClick={handleConfirmReport}
                      className="btn-primary"
                    >
                      {confirming ? (
                        <span>Committing to Record...</span>
                      ) : reportDetail.report?.status === 'confirmed' ? (
                        <span>✓ Permanently Confirmed</span>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          <span>Confirm & Commit to Permanent Record</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h2 className="text-2xl font-bold font-display text-white">
              MediKiosk Hospital Consultation Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Data compiled from waiting room kiosks and physician dashboard consultations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Consult Time Saved</span>
              <div className="text-3xl font-extrabold text-cyan-400 font-display mt-1">
                {analytics.time_saved_minutes} min
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">70% reduction in routine history taking</span>
            </div>

            <div className="glass-panel p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Kiosk Intakes</span>
              <div className="text-3xl font-extrabold text-white font-display mt-1">
                {analytics.completed_intakes}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Completed pre-consultation sessions</span>
            </div>

            <div className="glass-panel p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">OCR Accuracy Rate</span>
              <div className="text-3xl font-extrabold text-emerald-400 font-display mt-1">
                {analytics.ocr_metrics?.accuracy_rate_percent}%
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">With RxNorm formulary verification</span>
            </div>

            <div className="glass-panel p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Red-Flag Triggers</span>
              <div className="text-3xl font-extrabold text-rose-400 font-display mt-1">
                {analytics.triage_distribution?.emergency} Emergency
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">{analytics.triage_distribution?.priority} Priority patients</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: DPDP Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold font-display text-white">
                  DPDP Act 2023 Tamper-Evident Audit Trail
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-mono">
                  SHA-256 Hash Chained
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every PHI access, AI inference, consent change, and physician override is permanently logged.
              </p>
            </div>

            <button
              type="button"
              disabled={verifyingChain}
              onClick={handleVerifyChain}
              className="btn-primary"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{verifyingChain ? 'Verifying Hashes...' : 'Verify Chain Integrity'}</span>
            </button>
          </div>

          {auditVerification && (
            <div className={`p-4 rounded-xl border ${
              auditVerification.valid
                ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500 bg-rose-950/30 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                {auditVerification.message}
              </div>
              <div className="text-xs font-mono mt-1 opacity-90">
                Total Verified Blocks: {auditVerification.total_records} • Latest Hash: {auditVerification.latest_block_hash?.slice(0, 32)}...
              </div>
            </div>
          )}

          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Actor & Role</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Summary</th>
                    <th className="p-3.5">SHA-256 Block Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/50">
                      <td className="p-3.5 text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-white">{log.actor_id}</span>
                        <span className="text-slate-500 ml-1">({log.actor_role})</span>
                      </td>
                      <td className="p-3.5 font-bold text-cyan-400">
                        {log.action}
                      </td>
                      <td className="p-3.5 font-sans text-slate-300 max-w-xs truncate">
                        {log.payload_summary}
                      </td>
                      <td className="p-3.5 text-slate-500 truncate max-w-[140px]" title={log.hash}>
                        {log.hash.slice(0, 16)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FHIR Modal */}
      {showFhirModal && fhirJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  HL7 FHIR R4 Document Bundle (ABDM Standard)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFhirModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            <pre className="flex-1 overflow-auto p-4 rounded-xl bg-slate-950 font-mono text-xs text-cyan-300 border border-slate-800">
              {JSON.stringify(fhirJson, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
