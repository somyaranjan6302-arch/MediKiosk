import React, { useState } from 'react';
import { Leaf, ShieldCheck, Sparkles, ArrowRight, Check } from 'lucide-react';
import { api } from '../../services/api';
import { AyushData } from '../../types/clinical';

interface AyushStepProps {
  sessionId: string;
  language: string;
  onNext: () => void;
}

export const AyushStep: React.FC<AyushStepProps> = ({ sessionId, language, onNext }) => {
  const [enabled, setEnabled] = useState(false);
  const [ayushData, setAyushData] = useState<AyushData>({
    prakriti: 'वात-पित्त (Vata-Pitta Prakriti)',
    vikriti: 'वात वृद्धि (Vata Aggravation / Dryness)',
    sara: 'मध्यम सार (Moderate Tissue Vitality)',
    samhanana: 'संहनन मध्यम (Medium Compactness)',
    pramana: 'प्रमाणानुरूप (Proportionate Build)',
    satmya: 'सर्व रस सात्म्य (Accustomed to all tastes)',
    satva: 'प्रवर सत्व (High Mental Resilience)',
    ahara_shakti: 'मंदाग्नि (Sluggish Digestion / Low Agni)',
    vyayama_shakti: 'मध्यम व्यायाम शक्ति (Moderate Endurance)',
    vaya: 'मध्यम वय (Middle Age)',
    notes: 'ऋतुचर्या और उष्ण जल सेवन का परामर्श दिया गया।'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!enabled) {
      onNext();
      return;
    }

    setLoading(true);
    try {
      await api.submitAyush(sessionId, ayushData);
      onNext();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
          Step 6: Traditional AYUSH Intake
        </span>
        <h2 className="text-3xl font-display font-bold text-white mt-1 mb-2">
          {language === 'hi' ? 'दशविध परीक्षा — पारंपरिक आयुर्वेदिक मूल्यांकन' : 'Dashavidha Pariksha — Ayurvedic Assessment'}
        </h2>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'क्या आप पारंपरिक आयुर्वेदिक प्रकृति व अग्नि परीक्षण को अपनी रिपोर्ट में शामिल करना चाहते हैं?'
            : 'Optional ten-fold diagnostic framework evaluating Dosha constitution, digestive fire, and mental resilience.'}
        </p>
      </div>

      {/* Segregation & Governance Disclaimer */}
      <div className="mb-6 rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 text-xs text-emerald-200">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Leaf className="h-4 w-4 text-emerald-400" />
          Clinical Governance & Isolation Principle
        </div>
        <p className="text-emerald-300/80 leading-relaxed">
          {language === 'hi'
            ? 'आयुष मूल्यांकन रिपोर्ट में एक पृथक (अलग) खंड के रूप में दर्ज होता है और इसे कभी भी एलोपैथिक निदान के साथ मिश्रित नहीं किया जाता। इसे योग्य आयुष चिकित्सक द्वारा ही देखा जाता है।'
            : 'The AYUSH assessment is strictly maintained as a segregated, independent section in the standardized case report. It is never conflated with allopathic diagnoses and is reviewed by AYUSH-qualified practitioners.'}
        </p>
      </div>

      {/* Enable Toggle Card */}
      <div className="glass-panel p-5 mb-6 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-white text-base">
            {language === 'hi' ? 'आयुर्वेदिक दशविध परीक्षा शामिल करें?' : 'Include Dashavidha Pariksha Intake?'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'hi' ? 'प्रकृति (वात, पित्त, कफ), अग्नि और सत्व का 10-सूत्रीय विवरण' : 'Captures Prakriti, Vikriti, Agni, and Satva parameters'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            enabled
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {enabled ? '✓ ACTIVE / सक्रिय' : '+ ACTIVATE'}
        </button>
      </div>

      {/* 10-fold Pariksha Form (Visible if enabled) */}
      {enabled && (
        <div className="glass-panel p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Prakriti */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                1. Prakriti (मूल प्रकृति / Dosha)
              </label>
              <select
                value={ayushData.prakriti}
                onChange={(e) => setAyushData({ ...ayushData, prakriti: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                <option value="वात-पित्त (Vata-Pitta Prakriti)">वात-पित्त (Vata-Pitta)</option>
                <option value="पित्त-कफ (Pitta-Kapha Prakriti)">पित्त-कफ (Pitta-Kapha)</option>
                <option value="वात-कफ (Vata-Kapha Prakriti)">वात-कफ (Vata-Kapha)</option>
                <option value="समदोषज (Tridosha Balanced)">समदोषज (Balanced Tridosha)</option>
              </select>
            </div>

            {/* 2. Vikriti */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                2. Vikriti (वर्तमान दोष असंतुलन)
              </label>
              <select
                value={ayushData.vikriti}
                onChange={(e) => setAyushData({ ...ayushData, vikriti: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                <option value="वात वृद्धि (Vata Aggravation / Dryness)">वात वृद्धि (Vata Aggravation)</option>
                <option value="पित्त वृद्धि (Pitta Heat / Hyperacidity)">पित्त वृद्धि (Pitta Heat / Acidity)</option>
                <option value="कफ वृद्धि (Kapha Sluggishness / Congestion)">कफ वृद्धि (Kapha Sluggishness)</option>
                <option value="दोष साम्यावस्था (No acute dosha disturbance)">दोष साम्यावस्था (Normal Balance)</option>
              </select>
            </div>

            {/* 3. Sara */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                3. Sara (धातु सारता / Tissue Vitality)
              </label>
              <select
                value={ayushData.sara}
                onChange={(e) => setAyushData({ ...ayushData, sara: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                <option value="प्रवर सार (Superior Tissue Vitality)">प्रवर सार (Superior)</option>
                <option value="मध्यम सार (Moderate Tissue Vitality)">मध्यम सार (Moderate)</option>
                <option value="अवर सार (Low Tissue Vitality)">अवर सार (Deficient)</option>
              </select>
            </div>

            {/* 4. Samhanana */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                4. Samhanana (शारीरिक संहनन / Compactness)
              </label>
              <select
                value={ayushData.samhanana}
                onChange={(e) => setAyushData({ ...ayushData, samhanana: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                <option value="सुसंहत (Well Compact & Muscular)">सुसंहत (Well Built & Compact)</option>
                <option value="मध्यम संहनन (Average Compactness)">मध्यम (Average Compactness)</option>
                <option value="हीन संहनन (Fragile / Loose Build)">हीन (Fragile / Loose)</option>
              </select>
            </div>

            {/* 5. Pramana */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                5. Pramana (शारीरिक प्रमाण / Proportions)
              </label>
              <input
                type="text"
                value={ayushData.pramana}
                onChange={(e) => setAyushData({ ...ayushData, pramana: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>

            {/* 6. Satmya */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                6. Satmya (सात्म्य / Habituation)
              </label>
              <input
                type="text"
                value={ayushData.satmya}
                onChange={(e) => setAyushData({ ...ayushData, satmya: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>

            {/* 7. Satva */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                7. Satva (मानसिक बल / Mental Stamina)
              </label>
              <select
                value={ayushData.satva}
                onChange={(e) => setAyushData({ ...ayushData, satva: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                <option value="प्रवर सत्व (Strong Resilience)">प्रवर (High Mental Resilience)</option>
                <option value="मध्यम सत्व (Average Resilience)">मध्यम (Moderate Resilience)</option>
                <option value="अवर सत्व (Easily Anxious / Low)">अवर (Sensitive / Anxious)</option>
              </select>
            </div>

            {/* 8. Ahara Shakti */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                8. Ahara Shakti (अग्नि / Digestive Fire)
              </label>
              <select
                value={ayushData.ahara_shakti}
                onChange={(e) => setAyushData({ ...ayushData, ahara_shakti: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              >
                <option value="समाग्नि (Balanced Digestion)">समाग्नि (Balanced Digestion)</option>
                <option value="तीक्ष्णाग्नि (Hyperactive Digestion)">तीक्ष्णाग्नि (Sharp/Hyperactive)</option>
                <option value="मंदाग्नि (Sluggish / Low Digestion)">मंदाग्नि (Sluggish / Slow)</option>
                <option value="विषमाग्नि (Irregular Digestion)">विषमाग्नि (Irregular/Fluctuating)</option>
              </select>
            </div>

            {/* 9. Vyayama Shakti */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                9. Vyayama Shakti (व्यायाम शक्ति / Endurance)
              </label>
              <input
                type="text"
                value={ayushData.vyayama_shakti}
                onChange={(e) => setAyushData({ ...ayushData, vyayama_shakti: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>

            {/* 10. Vaya */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                10. Vaya (वय / Age Stage)
              </label>
              <input
                type="text"
                value={ayushData.vaya}
                onChange={(e) => setAyushData({ ...ayushData, vaya: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="btn-primary"
        >
          {loading ? (
            <span>{language === 'hi' ? 'सहेज रहे हैं...' : 'Recording...'}</span>
          ) : (
            <>
              <span>{language === 'hi' ? 'समीक्षा व अंतिम पुष्टि' : 'Review & Final Confirmation'}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
