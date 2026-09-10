import React, { useState, useEffect } from 'react';
import { CheckCircle2, Volume2, ArrowRight, ShieldCheck, UserCheck, AlertTriangle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { VoiceService } from '../../services/voiceService';

interface ReviewConfirmStepProps {
  sessionId: string;
  language: string;
  onFinish: () => void;
}

export const ReviewConfirmStep: React.FC<ReviewConfirmStepProps> = ({ sessionId, language, onFinish }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [readAloudActive, setReadAloudActive] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [sessionId]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getSummary(sessionId);
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = () => {
    if (!summary) return;
    setReadAloudActive(true);
    const readText = language === 'hi'
      ? `मरीज का नाम: ${summary.patient.name}। मुख्य समस्या: ${summary.cc.description}। गंभीरता: 10 में से ${summary.cc.severity}। एलर्जी: ${summary.ph.allergies.join(', ') || 'कोई नहीं'}। क्या यह विवरण सही है?`
      : `Patient Name: ${summary.patient.name}. Chief Complaint: ${summary.cc.description}, severity ${summary.cc.severity} out of 10. Allergies: ${summary.ph.allergies.join(', ') || 'None'}. Please confirm if accurate.`;

    VoiceService.speak(readText, language, () => {
      setReadAloudActive(false);
    });
  };

  const handleFinalConfirm = async () => {
    setConfirming(true);
    try {
      await api.confirmInterview(sessionId);
      // Also generate initial draft report for doctor queue
      await api.generateReport(sessionId);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setIsCompleted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-12 text-center max-w-xl mx-auto">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-3"></div>
        <p className="text-sm text-slate-400">
          {language === 'hi' ? 'आपकी केस समरी तैयार हो रही है...' : 'Compiling Case Summary for Patient Review...'}
        </p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="glass-panel-glow p-8 text-center max-w-xl mx-auto space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white font-display">
            {language === 'hi' ? 'आपका केस-टेकिंग विवरण सफलतापूर्वक दर्ज हो गया है!' : 'Case-Taking Successfully Finalized!'}
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            {language === 'hi'
              ? 'आपकी जानकारी आपके डॉक्टर के डैशबोर्ड पर प्राथमिकता क्रम में भेज दी गई है।'
              : 'Your standardized record has been forwarded to the consulting clinician.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{language === 'hi' ? 'टोकन संख्या:' : 'Queue Token:'}</span>
            <span className="font-bold text-cyan-400 font-mono">OPD-ROOM-03 • #14</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{language === 'hi' ? 'मरीज का नाम:' : 'Patient Name:'}</span>
            <span className="font-semibold text-white">{summary?.patient?.name}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{language === 'hi' ? 'आभा / MRN:' : 'ABHA / MRN:'}</span>
            <span className="text-white font-mono">{summary?.patient?.abha_id || 'MRN-VERIFIED'}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200">
          {language === 'hi'
            ? 'कृपया प्रतीक्षा क्षेत्र (Waiting Area) में बैठें। जब आपका टोकन नंबर पुकारा जाएगा, तब कमरा नंबर 3 में जाएं।'
            : 'Please proceed to the Waiting Area. You will be called to Consultation Room 3 shortly.'}
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="w-full btn-primary"
        >
          {language === 'hi' ? 'नया मरीज सत्र शुरू करें' : 'Start New Kiosk Session'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
          Final Verification Loop
        </span>
        <h2 className="text-3xl font-display font-bold text-white mt-1 mb-2">
          {language === 'hi' ? 'अपनी दर्ज जानकारी की पुष्टि करें' : 'Review & Confirm Your Answers'}
        </h2>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'कृपया सुनिश्चित करें कि आपके द्वारा दी गई जानकारी सही है। आप इसे ऑडियो में भी सुन सकते हैं।'
            : 'Every answer must be verified by you before handover to the consulting physician.'}
        </p>
      </div>

      <div className="glass-panel p-6 mb-6 space-y-4">
        {/* Patient header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-white text-base">{summary?.patient?.name}</h4>
            <span className="text-xs text-slate-400">ABHA: {summary?.patient?.abha_id || 'MRN Registered'}</span>
          </div>
          <button
            type="button"
            onClick={handleReadAloud}
            className={`btn-secondary text-xs px-3 py-1.5 ${readAloudActive ? 'bg-cyan-600 text-white' : ''}`}
          >
            <Volume2 className="h-4 w-4 text-cyan-400" />
            {readAloudActive ? 'बोल रहा है...' : (language === 'hi' ? 'पूरा सारांश सुनें' : 'Read Aloud Summary')}
          </button>
        </div>

        {/* CC Summary */}
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-xs font-bold text-cyan-400 uppercase">Chief Complaint (मुख्य शिकायत)</span>
          <p className="text-sm font-semibold text-white mt-0.5">{summary?.cc?.description}</p>
          <div className="flex gap-4 text-xs text-slate-400 mt-1">
            <span>Onset: {summary?.cc?.onset}</span>
            <span>Duration: {summary?.cc?.duration}</span>
            <span className="text-cyan-300 font-bold">Severity: {summary?.cc?.severity}/10</span>
          </div>
        </div>

        {/* HPI Summary */}
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-xs font-bold text-cyan-400 uppercase">HPI (SOCRATES Framework)</span>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mt-1">
            <div><span className="text-slate-500">Site:</span> {summary?.hpi?.site}</div>
            <div><span className="text-slate-500">Character:</span> {summary?.hpi?.character}</div>
            <div><span className="text-slate-500">Radiation:</span> {summary?.hpi?.radiation}</div>
            <div><span className="text-slate-500">Associations:</span> {summary?.hpi?.associations}</div>
          </div>
        </div>

        {/* Allergies & Meds */}
        <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40">
          <span className="text-xs font-bold text-amber-400 uppercase">Allergies & Past History</span>
          <p className="text-xs text-slate-200 mt-1">
            <span className="font-semibold text-amber-300">Allergies Declared:</span>{' '}
            {summary?.ph?.allergies?.join(', ') || 'No Known Drug Allergies (NKDA)'}
          </p>
          <p className="text-xs text-slate-300 mt-0.5">
            <span className="font-semibold text-slate-400">Past Diagnoses:</span> {summary?.ph?.diagnoses || 'None'}
          </p>
        </div>
      </div>

      {/* Confirmation Checkbox & Button */}
      <div className="glass-panel p-5 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            defaultChecked
            className="h-5 w-5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 mt-0.5"
          />
          <span className="text-xs text-slate-200 leading-relaxed">
            {language === 'hi'
              ? 'मैं प्रमाणित करता/करती हूँ कि ऊपर दी गई सभी जानकारी मैंने सही-सही दर्ज की है। मैं इसे अपने परामर्शदाता डॉक्टर को दिखाने की पुष्टि करता/करती हूँ।'
              : 'I confirm that all above information accurately reflects my medical history and symptoms, and I authorize sharing this draft with the consulting doctor.'}
          </span>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={confirming}
          onClick={handleFinalConfirm}
          className="btn-primary w-full sm:w-auto"
        >
          {confirming ? (
            <span>{language === 'hi' ? 'पुष्टि की जा रही है...' : 'Finalizing Case Record...'}</span>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>{language === 'hi' ? 'हाँ, यह सब सही है — केस सबमिट करें' : 'Confirm & Submit to Doctor Queue'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
