import React, { useState } from 'react';
import { Mic, MicOff, Volume2, ArrowRight, Activity, AlertCircle, Check, Smile, Frown, Meh, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { VoiceService } from '../../services/voiceService';

interface InterviewCCProps {
  sessionId: string;
  language: string;
  onNext: (ccData: any) => void;
  onEmergencyDetected?: (rules: any[]) => void;
}

export const InterviewCC: React.FC<InterviewCCProps> = ({ sessionId, language, onNext, onEmergencyDetected }) => {
  const [description, setDescription] = useState('सीने में भारी दबाव और बेचैनी महसूस हो रही है');
  const [onset, setOnset] = useState('कल शाम से (Yesterday)');
  const [duration, setDuration] = useState('लगातार (Persistent)');
  const [severity, setSeverity] = useState(6);
  const [isRecording, setIsRecording] = useState(false);
  const [readbackText, setReadbackText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const symptomPresets = [
    { labelHi: 'सीने में दर्द या भारी दबाव', labelEn: 'Chest pain or pressure', valHi: 'सीने में भारी दबाव, दर्द और जकड़न है', valEn: 'Heavy crushing chest pressure and tightness' },
    { labelHi: 'सांस लेने में भारी कठिनाई', labelEn: 'Severe breathlessness', valHi: 'सांस लेने में बहुत परेशानी हो रही है और घबराहट है', valEn: 'Severe acute shortness of breath and dyspnea' },
    { labelHi: 'तेज बुखार व बदन दर्द', labelEn: 'High fever & chills', valHi: 'तेज बुखार है और पूरे शरीर में कंपकंपी है', valEn: 'High fever with severe chills and body aches' },
    { labelHi: 'अचानक तेज सिरदर्द', labelEn: 'Sudden severe headache', valHi: 'अचानक बहुत तेज सिरदर्द हुआ, बिजली कौंधने जैसा', valEn: 'Sudden explosive thunderclap headache' },
    { labelHi: 'पेट में असहनीय दर्द', labelEn: 'Severe abdominal pain', valHi: 'पेट के ऊपरी हिस्से में तेज मरोड़ और दर्द है', valEn: 'Severe cramping epigastric pain' },
    { labelHi: 'जोड़ों व घुटनों में सूजन', labelEn: 'Joint stiffness & swelling', valHi: 'दोनों घुटनों में चलने पर तेज दर्द व अकड़न है', valEn: 'Bilateral knee pain, swelling and stiffness' }
  ];

  const toggleMic = () => {
    if (isRecording) {
      VoiceService.stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      VoiceService.startListening(
        language,
        (text) => {
          setDescription(text);
          setIsRecording(false);
        },
        (err) => {
          console.error(err);
          setIsRecording(false);
        },
        () => setIsRecording(false)
      );
    }
  };

  const getSeverityMood = (score: number) => {
    if (score <= 2) return { text: 'Mild Discomfort', color: 'text-emerald-400', bg: 'bg-emerald-950 border-emerald-700', icon: '😊' };
    if (score <= 4) return { text: 'Moderate Discomfort', color: 'text-lime-400', bg: 'bg-lime-950 border-lime-700', icon: '🙂' };
    if (score <= 6) return { text: 'Distressing Pain', color: 'text-amber-400', bg: 'bg-amber-950 border-amber-700', icon: '😐' };
    if (score <= 8) return { text: 'Severe Distress', color: 'text-orange-400', bg: 'bg-orange-950 border-orange-700', icon: '😣' };
    return { text: 'Excruciating / Emergency Level', color: 'text-rose-400', bg: 'bg-rose-950 border-rose-700', icon: '😭' };
  };

  const currentMood = getSeverityMood(severity);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await api.submitCC(sessionId, {
        description,
        onset,
        duration,
        severity,
      });

      if (res.triage_tier === 'Emergency') {
        if (onEmergencyDetected) onEmergencyDetected(res.triggered_rules || []);
      }

      setReadbackText(res.readback_text);
      onNext({ description, onset, duration, severity });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
          Step 1: Chief Complaint (CC)
        </span>
        <h2 className="text-3xl font-display font-extrabold text-white mt-1 mb-2">
          {language === 'hi' ? 'आज आप डॉक्टर को क्या दिखाना चाहते हैं?' : 'What is your primary symptom or concern today?'}
        </h2>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'बोलकर बताएं या नीचे लिखें। आप दिए गए सामान्य लक्षणों में से भी चुन सकते हैं।'
            : 'Speak into the microphone or select from common complaints below.'}
        </p>
      </div>

      {/* Symptom Quick Chips */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          {language === 'hi' ? 'त्वरित सामान्य लक्षण (Quick Select):' : 'Common Symptom Presets:'}
        </div>
        <div className="flex flex-wrap gap-2">
          {symptomPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setDescription(language === 'hi' ? preset.valHi : preset.valEn)}
              className="rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-all hover:bg-slate-800 shadow-sm"
            >
              {language === 'hi' ? preset.labelHi : preset.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Main Complaint Input Box with Pulsing Microphone */}
      <div className="glass-panel p-6 mb-6 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {language === 'hi' ? 'लक्षणों का विवरण (Voice or Type):' : 'Detailed Symptom Description:'}
            </label>
            {isRecording && (
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold">
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="ml-1 animate-pulse">सुन रहा है (Listening)...</span>
              </div>
            )}
          </div>
          
          <div className="relative">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'hi' ? 'जैसे: सीने में 2 दिन से भारीपन है...' : 'e.g., Heavy pressure in center of chest...'}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 p-4 pr-16 text-white text-base focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="button"
              onClick={toggleMic}
              title={isRecording ? 'Stop Recording' : 'Start Speaking'}
              className={`absolute right-3 top-3 p-3.5 rounded-xl transition-all shadow-lg ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                  : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white hover:scale-105 shadow-cyan-500/30'
              }`}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Onset & Duration Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              {language === 'hi' ? 'यह कब से शुरू हुआ? (Onset)' : 'When did this start? (Onset)'}
            </label>
            <select
              value={onset}
              onChange={(e) => setOnset(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="आज ही (Today)">आज ही (Today - Few hours ago)</option>
              <option value="कल शाम से (Yesterday)">कल शाम से (Yesterday)</option>
              <option value="2-3 दिन पहले (2-3 Days)">2-3 दिन पहले (2-3 Days ago)</option>
              <option value="1 सप्ताह पहले (1 Week)">1 सप्ताह पहले (1 Week ago)</option>
              <option value="1 महीने से अधिक (Chronic)">1 महीने से अधिक (Chronic)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              {language === 'hi' ? 'लक्षण की प्रकृति (Pattern)' : 'Pattern / Duration'}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="लगातार बना रहता है (Persistent)">लगातार बना रहता है (Persistent)</option>
              <option value="रुक-रुक कर होता है (Intermittent)">रुक-रुक कर होता है (Intermittent)</option>
              <option value="केवल काम या चलने पर (Exertional)">केवल काम या चलने पर (Exertional)</option>
            </select>
          </div>
        </div>

        {/* Visual Pain Scale with 10 Expressions */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {language === 'hi' ? 'तकलीफ की गंभीरता (Pain Severity Scale 1-10):' : 'Pain Severity Scale (1-10):'}
            </label>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${currentMood.bg}`}>
              <span className="text-lg leading-none">{currentMood.icon}</span>
              <span className={currentMood.color}>{severity}/10 • {currentMood.text}</span>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(parseInt(e.target.value))}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />

          {/* 10-point scale labels */}
          <div className="grid grid-cols-10 text-center text-[10px] text-slate-400 mt-2 font-mono font-semibold">
            <span className={severity === 1 ? 'text-emerald-400 font-bold scale-125' : ''}>1</span>
            <span className={severity === 2 ? 'text-emerald-400 font-bold scale-125' : ''}>2</span>
            <span className={severity === 3 ? 'text-lime-400 font-bold scale-125' : ''}>3</span>
            <span className={severity === 4 ? 'text-lime-400 font-bold scale-125' : ''}>4</span>
            <span className={severity === 5 ? 'text-amber-400 font-bold scale-125' : ''}>5</span>
            <span className={severity === 6 ? 'text-amber-400 font-bold scale-125' : ''}>6</span>
            <span className={severity === 7 ? 'text-orange-400 font-bold scale-125' : ''}>7</span>
            <span className={severity === 8 ? 'text-orange-400 font-bold scale-125' : ''}>8</span>
            <span className={severity === 9 ? 'text-rose-400 font-bold scale-125' : ''}>9</span>
            <span className={severity === 10 ? 'text-rose-400 font-bold scale-125' : ''}>10</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={loading || !description.trim()}
          onClick={handleSubmit}
          className="btn-primary"
        >
          {loading ? (
            <span>Processing Red Flags...</span>
          ) : (
            <>
              <span>{language === 'hi' ? 'अगला: बीमारी का इतिहास (HPI)' : 'Next: Present Illness (HPI)'}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
