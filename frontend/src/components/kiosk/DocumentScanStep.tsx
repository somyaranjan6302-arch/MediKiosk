import React, { useState } from 'react';
import { 
  Camera, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  ArrowRight, 
  Sparkles,
  Maximize2,
  Scan,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { DocumentItem, OcrField } from '../../types/clinical';

interface DocumentScanStepProps {
  sessionId: string;
  language: string;
  onNext: () => void;
}

export const DocumentScanStep: React.FC<DocumentScanStepProps> = ({ sessionId, language, onNext }) => {
  const [docType, setDocType] = useState<'prescription' | 'lab_report' | 'discharge_summary'>('prescription');
  const [uploadedDoc, setUploadedDoc] = useState<DocumentItem | null>(null);
  const [extractions, setExtractions] = useState<OcrField[]>([]);
  const [scanning, setScanning] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [previewImage, setPreviewImage] = useState<string>('/images/prescription_sample.jpg');

  const handleSimulateScan = async (type: 'prescription' | 'lab_report' | 'discharge_summary') => {
    setScanning(true);
    setDocType(type);

    // Set high-res document image
    const imagePath = type === 'prescription' ? '/images/prescription_sample.jpg' : '/images/lab_report_sample.jpg';
    setPreviewImage(imagePath);

    try {
      const mockBlob = new Blob(["Clinical Document Data"], { type: "text/plain" });
      const mockFile = new File([mockBlob], `${type}_aiims_2026.pdf`, { type: "text/plain" });

      // Simulate realistic 1.5s scanning effect
      setTimeout(async () => {
        try {
          const doc = await api.uploadDocument(sessionId, type, mockFile, 'kiosk_scan');
          setUploadedDoc(doc);
          setExtractions(doc.extractions || []);
        } catch (err) {
          console.error(err);
        } finally {
          setScanning(false);
        }
      }, 1500);
    } catch (e) {
      console.error(e);
      setScanning(false);
    }
  };

  const handleSaveCorrection = async (field: OcrField) => {
    try {
      if (uploadedDoc) {
        await api.correctOcrField(uploadedDoc.id, field.field_name, editValue);
        setExtractions(prev => prev.map(f => f.id === field.id ? { ...f, corrected_value: editValue, confirmed: true, flagged: false } : f));
      }
      setEditingFieldId(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-xs font-semibold text-cyan-300 mb-2">
          <Scan className="h-4 w-4" />
          Assistive Multimodal OCR • RxNorm / Indian NLEM Formulary Cross-Check
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-1">
          {language === 'hi' ? 'पुराने पर्चे व जांच रिपोर्ट डिजिटाइज़ करें' : 'Scan & Digitize Past Prescriptions & Lab Reports'}
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          {language === 'hi'
            ? 'कियोस्क कैमरे के सामने पर्चा रखें या सैंपल चुनें। निकाली गई सभी दवाइयों और लैब मानों का डॉक्टर द्वारा सत्यापन अनिवार्य है।'
            : 'AI Document Intelligence extracts medicines and lab results with RxNorm formulary matching.'}
        </p>
      </div>

      {/* Document Category Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          onClick={() => handleSimulateScan('prescription')}
          className={`glass-panel p-4 text-left transition-all border ${
            docType === 'prescription' ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-500/10' : 'hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {language === 'hi' ? 'डॉक्टर का पर्चा' : 'Prescription Scan'}
              </h4>
              <span className="text-[11px] text-cyan-300 font-medium">AIIMS Cardiology Prescription</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Extracts doctor name, medicines, dose, and instructions.</p>
        </button>

        <button
          type="button"
          onClick={() => handleSimulateScan('lab_report')}
          className={`glass-panel p-4 text-left transition-all border ${
            docType === 'lab_report' ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-500/10' : 'hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {language === 'hi' ? 'खून / लैब जांच रिपोर्ट' : 'Diagnostic Lab Report'}
              </h4>
              <span className="text-[11px] text-blue-300 font-medium">Blood Sugar, HbA1c, CBC</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Cross-checks values against normal clinical reference ranges.</p>
        </button>

        <button
          type="button"
          onClick={() => handleSimulateScan('discharge_summary')}
          className={`glass-panel p-4 text-left transition-all border ${
            docType === 'discharge_summary' ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-500/10' : 'hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {language === 'hi' ? 'डिस्चार्ज सारांश' : 'Discharge Summary'}
              </h4>
              <span className="text-[11px] text-purple-300 font-medium">Inpatient Hospital Summary</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">Extracts hospital admission history and discharge orders.</p>
        </button>
      </div>

      {/* Side-by-Side Live View: Document Viewfinder vs Extracted Data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Column: High-Resolution Document Viewfinder with Laser Scanner */}
        <div className="lg:col-span-5 glass-panel p-4 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Kiosk Camera Optical Feed
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {scanning ? 'SCANNING...' : 'CAPTURED'}
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex-1 min-h-[380px] max-h-[460px] flex items-center justify-center">
            {/* Real Captured Image */}
            <img
              src={previewImage}
              alt="Medical Document Original"
              className="w-full h-full object-contain filter contrast-105"
            />

            {/* Laser Scanning Beam Animation */}
            {scanning && <div className="laser-beam" />}

            {/* Optical Framing Reticle */}
            <div className="absolute inset-2 border-2 border-cyan-500/30 rounded-lg pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Source: HD Waiting-Room Camera</span>
            <span className="text-cyan-400 font-mono">1920x1080 • 60 FPS</span>
          </div>
        </div>

        {/* Right Column: Extracted Structured Clinical Fields */}
        <div className="lg:col-span-7 glass-panel p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  {language === 'hi' ? 'निकाले गए नैदानिक विवरण' : 'Extracted Clinical Fields'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300">
                  Assistive Draft
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Each field can be corrected inline before inclusion in the consultation report.
              </p>
            </div>
          </div>

          {scanning ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="relative flex items-center justify-center h-16 w-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <Scan className="h-7 w-7 text-cyan-400 animate-pulse" />
              </div>
              <h4 className="font-bold text-white text-base">Running Neural OCR & Formulary Match...</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Parsing printed typography, analyzing physician handwriting, and cross-checking RxNorm database.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {extractions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Select a document type above to scan and extract medical history.
                </div>
              ) : (
                extractions.map((field) => (
                  <div
                    key={field.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      field.flagged
                        ? 'border-rose-600/70 bg-rose-950/25'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                            {field.field_name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {Math.round(field.confidence_score * 100)}% Confidence
                          </span>
                          {field.formulary_match && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              RxNorm: {field.formulary_match}
                            </span>
                          )}
                          {field.flagged && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-rose-950 border border-rose-600 text-rose-300 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {field.flag_reason || 'Requires verification'}
                            </span>
                          )}
                        </div>

                        {editingFieldId === field.id ? (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 rounded-lg bg-slate-900 border border-cyan-500 px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCorrection(field)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFieldId(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-white mt-0.5">
                            {field.corrected_value ? (
                              <span>
                                <span className="line-through text-slate-500 mr-2 text-xs">{field.extracted_value}</span>
                                <span className="text-emerald-300">{field.corrected_value}</span>
                                <span className="ml-1.5 text-[10px] text-emerald-400 font-bold uppercase">(Human Verified)</span>
                              </span>
                            ) : (
                              field.extracted_value
                            )}
                          </p>
                        )}
                      </div>

                      {editingFieldId !== field.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFieldId(field.id);
                            setEditValue(field.corrected_value || field.extracted_value);
                          }}
                          className="btn-secondary text-xs py-1 px-2.5 shrink-0"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-500">
          Scanned papers are saved securely in hospital MinIO storage.
        </span>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary"
        >
          <span>{language === 'hi' ? 'अगला: पिछली बीमारियां व एलर्जी' : 'Next: Past History & Allergies'}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
