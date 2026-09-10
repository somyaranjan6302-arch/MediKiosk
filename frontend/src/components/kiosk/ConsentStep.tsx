import React, { useState } from 'react';
import { ShieldCheck, Volume2, ArrowRight, Mic, FileText, UserCheck, CloudUpload } from 'lucide-react';
import { api } from '../../services/api';
import { VoiceService } from '../../services/voiceService';

interface ConsentStepProps {
  sessionId: string;
  language: string;
  onConsentComplete: () => void;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({ sessionId, language, onConsentComplete }) => {
  const [consents, setConsents] = useState({
    voice_recording: true,
    document_ocr: true,
    share_with_doctor: true,
    abdm_publish: true,
  });
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const consentItems = [
    {
      id: 'voice_recording',
      icon: Mic,
      titleHi: 'आवाज रिकॉर्डिंग और विश्लेषण',
      titleEn: 'Voice Recording & AI Processing',
      descHi: 'आपके लक्षणों को समझने के लिए आपकी बातचीत को रिकॉर्ड और प्रोसेस किया जाएगा।',
      descEn: 'Your verbal answers will be transcribed to capture your symptoms accurately.',
    },
    {
      id: 'document_ocr',
      icon: FileText,
      titleHi: 'पुराने पर्चे व जांच रिपोर्ट पढ़ना (OCR)',
      titleEn: 'Document Scanning & OCR Digitization',
      descHi: 'आपके पिछले पर्चों और रिपोर्ट की फोटो को डिजिटल रूप में बदलने की अनुमति।',
      descEn: 'Allows camera scanning and OCR field extraction of past prescriptions & labs.',
    },
    {
      id: 'share_with_doctor',
      icon: UserCheck,
      titleHi: 'परामर्शदाता डॉक्टर के साथ साझा करना',
      titleEn: 'Share Clinical History with Treating Doctor',
      descHi: 'आपके द्वारा दी गई जानकारी को आपके डॉक्टर के कंप्यूटर पर दिखाया जाएगा।',
      descEn: 'Your collected case report will be presented to your consulting physician.',
    },
    {
      id: 'abdm_publish',
      icon: CloudUpload,
      titleHi: 'आयुष्मान भारत (ABDM) रिकॉर्ड में जोड़ना',
      titleEn: 'Publish to ABDM / Longitudinal Health Record',
      descHi: 'डॉक्टर द्वारा पुष्टि के बाद यह परामर्श आपकी आभा आईडी में सुरक्षित जुड़ेगा।',
      descEn: 'Upon doctor confirmation, links this consultation to your national ABHA health record.',
    },
  ];

  const handleToggle = (key: keyof typeof consents) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSpeak = (key: string, text: string) => {
    setIsSpeaking(key);
    VoiceService.speak(text, language, () => {
      setIsSpeaking(null);
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Record all layered consent choices
      for (const [key, val] of Object.entries(consents)) {
        await api.recordConsent(sessionId, key, val, 'touch');
      }
      onConsentComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-xs font-semibold text-emerald-300 mb-3">
          <ShieldCheck className="h-4 w-4" />
          DPDP Act 2023 Compliant • Versioned Consent
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">
          {language === 'hi' ? 'मरीज सहमति पत्र (Layered Consent)' : 'Patient Consent & Data Permissions'}
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          {language === 'hi'
            ? 'आपकी निजता हमारी प्राथमिकता है। कृपया चुनें कि आप किस जानकारी के उपयोग की अनुमति देते हैं। किसी भी विकल्प को सुनने के लिए लाउडस्पीकर आइकन दबाएं।'
            : 'Your data privacy is strictly protected. Please specify your permissions below. Click the speaker icon to hear any term read aloud.'}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {consentItems.map((item) => {
          const Icon = item.icon;
          const isChecked = (consents as any)[item.id];
          const title = language === 'hi' ? item.titleHi : item.titleEn;
          const desc = language === 'hi' ? item.descHi : item.descEn;

          return (
            <div
              key={item.id}
              className={`glass-panel p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isChecked ? 'border-cyan-500/40 bg-slate-900/90' : 'opacity-70'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${isChecked ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60' : 'bg-slate-800 text-slate-500'}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-base">{title}</h4>
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.id, `${title}. ${desc}`)}
                      title="Read aloud"
                      className={`p-1 rounded-md text-xs transition-colors ${
                        isSpeaking === item.id ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>

              {/* Accessible Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                onClick={() => handleToggle(item.id as any)}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isChecked ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isChecked ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-500">
          Hash Version: SHA256-DPDP-v1.0 • Timestamped
        </span>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="btn-primary"
        >
          <span>{language === 'hi' ? 'सहमति दें और शुरू करें' : 'Confirm & Proceed to Interview'}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
