import React, { useState } from 'react';
import { ArrowRight, Volume2, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { SocratesData } from '../../types/clinical';
import { VoiceService } from '../../services/voiceService';

interface InterviewHPIProps {
  sessionId: string;
  language: string;
  onNext: (hpiData: SocratesData) => void;
}

export const InterviewHPI: React.FC<InterviewHPIProps> = ({ sessionId, language, onNext }) => {
  const [socrates, setSocrates] = useState<SocratesData>({
    site: 'सीने के मध्य में (Substernal Chest)',
    onset: 'अचानक शुरू हुआ (Acute sudden onset)',
    character: 'भारी दबाव और जकड़न (Crushing pressure & tightness)',
    radiation: 'बाएं हाथ और जबड़े की तरफ (Radiating to left arm & jaw)',
    associations: 'ठंडा पसीना और घबराहट (Diaphoresis & anxiety)',
    timing: 'शारीरिक परिश्रम पर बढ़ता है (Worse on exertion)',
    exacerbating_relieving: 'बैठने या आराम करने पर थोड़ा सुधार (Relieved by rest)',
    severity: 7
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitHPI(sessionId, socrates);
      onNext(socrates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    VoiceService.speak(text, language);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
          Step 2: HPI (SOCRATES Framework)
        </span>
        <h2 className="text-3xl font-display font-bold text-white mt-1 mb-2">
          {language === 'hi' ? 'बीमारी का विस्तृत इतिहास (HPI)' : 'History of Present Illness (SOCRATES)'}
        </h2>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'डॉक्टर को सटीक निदान में मदद के लिए दर्द के स्थान और फैलाव की पुष्टि करें।'
            : 'Structured clinical exploration of your symptoms using the SOCRATES diagnostic framework.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Site & Onset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel p-4">
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              S — Site (स्थान)
            </label>
            <input
              type="text"
              value={socrates.site}
              onChange={(e) => setSocrates({ ...socrates, site: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel p-4">
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              O — Onset (शुरुआत)
            </label>
            <input
              type="text"
              value={socrates.onset}
              onChange={(e) => setSocrates({ ...socrates, onset: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Character & Radiation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel p-4">
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              C — Character (दर्द का प्रकार)
            </label>
            <input
              type="text"
              value={socrates.character}
              onChange={(e) => setSocrates({ ...socrates, character: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel p-4">
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              R — Radiation (फैलाव)
            </label>
            <input
              type="text"
              value={socrates.radiation}
              onChange={(e) => setSocrates({ ...socrates, radiation: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Associations & Timing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel p-4">
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              A — Associated Symptoms (अन्य लक्षण)
            </label>
            <input
              type="text"
              value={socrates.associations}
              onChange={(e) => setSocrates({ ...socrates, associations: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel p-4">
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
              T — Timing / Pattern (समय)
            </label>
            <input
              type="text"
              value={socrates.timing}
              onChange={(e) => setSocrates({ ...socrates, timing: e.target.value })}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Exacerbating / Relieving */}
        <div className="glass-panel p-4">
          <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
            E — Exacerbating / Relieving Factors (घटाने-बढ़ाने वाले कारक)
          </label>
          <input
            type="text"
            value={socrates.exacerbating_relieving}
            onChange={(e) => setSocrates({ ...socrates, exacerbating_relieving: e.target.value })}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => handleSpeak(`दर्द का स्थान: ${socrates.site}. दर्द का प्रकार: ${socrates.character}. फैलाव: ${socrates.radiation}.`)}
            className="btn-secondary text-xs"
          >
            <Volume2 className="h-4 w-4 text-cyan-400" />
            {language === 'hi' ? 'विवरण सुनें (Read Back)' : 'Read Back Summary'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span>{language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...'}</span>
            ) : (
              <>
                <span>{language === 'hi' ? 'अगला: पुरानी बीमारियां व दवाइयां' : 'Next: Past History & Meds'}</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
