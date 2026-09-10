import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2, ArrowRight, CheckCircle2, AlertOctagon } from 'lucide-react';
import { api } from '../../services/api';
import { MedicationItem } from '../../types/clinical';

interface InterviewPHProps {
  sessionId: string;
  language: string;
  onNext: () => void;
}

export const InterviewPH_Allergies: React.FC<InterviewPHProps> = ({ sessionId, language, onNext }) => {
  const [pastDiagnoses, setPastDiagnoses] = useState('उच्च रक्तचाप (Hypertension) - पिछले 4 वर्षों से');
  const [surgeries, setSurgeries] = useState('एपेंडिक्स का ऑपरेशन (Appendectomy) - 2018');
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: 'Telmisartan', dose: '40mg', frequency: 'दिन में 1 बार (Once daily)', verified_formulary: true },
    { name: 'Amlodipine', dose: '5mg', frequency: 'रात को (Bedtime)', verified_formulary: true }
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');

  // Mandatory Allergies
  const [noAllergies, setNoAllergies] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(['पेनिसिलिन (Penicillin)']);
  const [customAllergy, setCustomAllergy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const commonAllergies = ['Penicillin', 'Sulfa drugs', 'Aspirin / NSAIDs', 'Peanuts', 'Dust / Pollen'];

  const handleAddMed = () => {
    if (!newMedName.trim()) return;
    setMedications([...medications, { name: newMedName, dose: newMedDose || 'Standard', frequency: 'Daily' }]);
    setNewMedName('');
    setNewMedDose('');
  };

  const handleRemoveMed = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const toggleAllergy = (alg: string) => {
    setNoAllergies(false);
    if (allergies.includes(alg)) {
      setAllergies(allergies.filter(a => a !== alg));
    } else {
      setAllergies([...allergies, alg]);
    }
  };

  const handleToggleNoAllergies = () => {
    setNoAllergies(!noAllergies);
    if (!noAllergies) {
      setAllergies([]);
    }
  };

  const handleAddCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    setNoAllergies(false);
    setAllergies([...allergies, customAllergy.trim()]);
    setCustomAllergy('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Safety check: Allergies MUST be declared
    if (!noAllergies && allergies.length === 0) {
      setError(language === 'hi' 
        ? 'अनिवार्य सुरक्षा नियम: कृपया अपनी एलर्जी चुनें या "मुझे किसी दवा से एलर्जी नहीं है" पर टिक करें।' 
        : 'Mandatory Clinical Safety Rule: You must declare any known allergies or explicitly confirm "No Known Drug Allergies".');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.submitPH(sessionId, {
        past_diagnoses: pastDiagnoses,
        surgeries,
        medications,
        allergies: noAllergies ? ['No known drug allergies (NKDA)'] : allergies,
        allergies_confirmed: true,
      });
      onNext();
    } catch (e: any) {
      setError(e.message || 'Error saving history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
          Step 4: Past Medical History & Allergies
        </span>
        <h2 className="text-3xl font-display font-bold text-white mt-1 mb-2">
          {language === 'hi' ? 'पुरानी बीमारियां, दवाइयां व एलर्जी' : 'Past Medical History, Medications & Allergies'}
        </h2>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'एलर्जी की जानकारी अनिवार्य है। यह डॉक्टर को सुरक्षित दवाएं चुनने में मदद करती है।'
            : 'Accurate medication and allergy records prevent adverse drug reactions during your treatment.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mandatory Allergy Warning Banner */}
        <div className="rounded-xl border-2 border-amber-500/70 bg-amber-950/30 p-5">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                {language === 'hi' ? 'अनिवार्य नैदानिक सुरक्षा घोषणा: दवा एलर्जी (Mandatory)' : 'Mandatory Clinical Safety Field: Allergy Declaration'}
              </h4>
              <p className="text-xs text-slate-300 mt-1 mb-3">
                {language === 'hi'
                  ? 'क्या आपको किसी दवा, भोजन या अन्य चीज से एलर्जी (रिएक्शन) होती है? बिना स्पष्ट पुष्टि के आगे नहीं बढ़ा जा सकता।'
                  : 'Have you ever had an allergic reaction (rash, breathlessness, swelling) to any medication or substance?'}
              </p>

              {/* No Known Allergies explicit check */}
              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700/80 cursor-pointer hover:border-cyan-500 mb-3 transition-colors">
                <input
                  type="checkbox"
                  checked={noAllergies}
                  onChange={handleToggleNoAllergies}
                  className="h-5 w-5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-sm font-semibold text-white">
                  {language === 'hi' ? 'मुझे किसी भी दवा या पदार्थ से कोई एलर्जी नहीं है (NKDA)' : 'No Known Drug Allergies (NKDA) — I confirm I have no allergies'}
                </span>
              </label>

              {!noAllergies && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {commonAllergies.map((alg) => (
                      <button
                        key={alg}
                        type="button"
                        onClick={() => toggleAllergy(alg)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          allergies.includes(alg)
                            ? 'bg-rose-600 border-rose-500 text-white font-semibold'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {alg} {allergies.includes(alg) ? '✓' : '+'}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={customAllergy}
                      onChange={(e) => setCustomAllergy(e.target.value)}
                      placeholder={language === 'hi' ? 'अन्य कोई दवा का नाम लिखें...' : 'Enter any other drug/substance...'}
                      className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAllergy}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      {language === 'hi' ? 'जोड़ें' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950 border border-rose-600 text-rose-200 text-sm">
            {error}
          </div>
        )}

        {/* Past Diagnoses & Surgeries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel p-5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              {language === 'hi' ? 'पुरानी बीमारियां (Prior Diagnoses)' : 'Prior Medical Diagnoses'}
            </label>
            <textarea
              rows={2}
              value={pastDiagnoses}
              onChange={(e) => setPastDiagnoses(e.target.value)}
              placeholder="e.g. Diabetes, Hypertension, Thyroid..."
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel p-5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              {language === 'hi' ? 'पुराने ऑपरेशन / सर्जरी (Surgeries)' : 'Past Surgeries / Procedures'}
            </label>
            <textarea
              rows={2}
              value={surgeries}
              onChange={(e) => setSurgeries(e.target.value)}
              placeholder="e.g. Gallbladder, C-section, Cataract..."
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Current Medications */}
        <div className="glass-panel p-5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            {language === 'hi' ? 'वर्तमान में चल रही दवाइयां (Current Medications)' : 'Current Medications (Name & Dosage)'}
          </label>

          <div className="space-y-2 mb-3">
            {medications.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white text-sm">{med.name}</span>
                  <span className="text-xs text-slate-400">({med.dose})</span>
                  <span className="text-xs text-cyan-400">• {med.frequency}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMed(idx)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              placeholder={language === 'hi' ? 'दवा का नाम (जैसे: Metformin)' : 'Medicine Name (e.g. Metformin)'}
              className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none"
            />
            <input
              type="text"
              value={newMedDose}
              onChange={(e) => setNewMedDose(e.target.value)}
              placeholder="Dose (e.g. 500mg)"
              className="w-32 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddMed}
              className="btn-secondary text-xs px-3 py-2"
            >
              <Plus className="h-4 w-4" />
              {language === 'hi' ? 'जोड़ें' : 'Add'}
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span>{language === 'hi' ? 'सहेज रहे हैं...' : 'Validating...'}</span>
            ) : (
              <>
                <span>{language === 'hi' ? 'अगला: शारीरिक प्रणालियों की जांच (ROS)' : 'Next: Review of Systems (ROS)'}</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
