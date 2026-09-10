import React, { useState } from 'react';
import { Heart, Wind, Stethoscope, Brain, Bone, Activity, Smile, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { ReviewOfSystemsData } from '../../types/clinical';

interface InterviewROSProps {
  sessionId: string;
  language: string;
  onNext: (rosData: ReviewOfSystemsData) => void;
  onEmergencyDetected?: (rules: any[]) => void;
}

export const InterviewROS: React.FC<InterviewROSProps> = ({ sessionId, language, onNext, onEmergencyDetected }) => {
  const [ros, setRos] = useState<ReviewOfSystemsData>({
    cardiovascular: { chest_pain: true, palpitations: false, edema: false },
    respiratory: { shortness_of_breath: true, cough: false, wheezing: false },
    gastrointestinal: { nausea: true, vomiting: false, acidity: true },
    neurological: { headache: false, dizziness: true, weakness: false },
    musculoskeletal: { joint_pain: false, back_pain: false },
    dermatological: { rash: false, itching: false },
    psychological: { anxiety: true, sleep_trouble: false }
  });

  const [loading, setLoading] = useState(false);

  const systems = [
    {
      id: 'cardiovascular',
      icon: Heart,
      color: 'text-rose-400',
      titleHi: 'हृदय व रक्त संचार (Cardiovascular)',
      titleEn: 'Cardiovascular System',
      items: [
        { key: 'chest_pain', labelHi: 'सीने में दर्द/जकड़न', labelEn: 'Chest pain or pressure' },
        { key: 'palpitations', labelHi: 'दिल की धड़कन तेज होना', labelEn: 'Palpitations / Fluttering' },
        { key: 'edema', labelHi: 'पैरों या पंजों में सूजन', labelEn: 'Ankle / Leg swelling' }
      ]
    },
    {
      id: 'respiratory',
      icon: Wind,
      color: 'text-cyan-400',
      titleHi: 'श्वसन व फेफड़े (Respiratory)',
      titleEn: 'Respiratory System',
      items: [
        { key: 'shortness_of_breath', labelHi: 'सांस फूलना या कठिनाई', labelEn: 'Shortness of breath' },
        { key: 'cough', labelHi: 'लगातार खांसी या बलगम', labelEn: 'Persistent cough' },
        { key: 'wheezing', labelHi: 'सांस लेते समय सीटी की आवाज', labelEn: 'Wheezing' }
      ]
    },
    {
      id: 'gastrointestinal',
      icon: Stethoscope,
      color: 'text-amber-400',
      titleHi: 'पेट व पाचन (Gastrointestinal)',
      titleEn: 'Gastrointestinal System',
      items: [
        { key: 'nausea', labelHi: 'जी मिचलाना या उल्टी की इच्छा', labelEn: 'Nausea or vomiting' },
        { key: 'acidity', labelHi: 'पेट में जलन व खट्टी डकार', labelEn: 'Acid reflux / Heartburn' },
        { key: 'bowel_changes', labelHi: 'दस्त या गंभीर कब्ज', labelEn: 'Severe diarrhea / Constipation' }
      ]
    },
    {
      id: 'neurological',
      icon: Brain,
      color: 'text-purple-400',
      titleHi: 'मस्तिष्क व तंत्रिका (Neurological)',
      titleEn: 'Neurological System',
      items: [
        { key: 'headache', labelHi: 'सिरदर्द', labelEn: 'Headache' },
        { key: 'dizziness', labelHi: 'चक्कर आना या सिर घूमना', labelEn: 'Dizziness or lightheadedness' },
        { key: 'weakness', labelHi: 'अंगों में सुन्नपन या कमजोरी', labelEn: 'Focal numbness or weakness' }
      ]
    },
    {
      id: 'musculoskeletal',
      icon: Bone,
      color: 'text-emerald-400',
      titleHi: 'हड्डियां व जोड़ (Musculoskeletal)',
      titleEn: 'Musculoskeletal System',
      items: [
        { key: 'joint_pain', labelHi: 'जोड़ों में दर्द या जकड़न', labelEn: 'Joint pain or stiffness' },
        { key: 'back_pain', labelHi: 'कमर में तेज दर्द', labelEn: 'Severe lower back pain' }
      ]
    },
    {
      id: 'psychological',
      icon: Smile,
      color: 'text-blue-400',
      titleHi: 'मानसिक स्वास्थ्य (Psychological)',
      titleEn: 'Psychological Well-being',
      items: [
        { key: 'anxiety', labelHi: 'अत्यधिक घबराहट या तनाव', labelEn: 'Severe anxiety or panic' },
        { key: 'sleep_trouble', labelHi: 'नींद न आना (Insomnia)', labelEn: 'Sleep disturbances' }
      ]
    }
  ];

  const toggleItem = (systemId: string, itemKey: string) => {
    const current = (ros as any)[systemId] || {};
    const updated = {
      ...ros,
      [systemId]: {
        ...current,
        [itemKey]: !current[itemKey]
      }
    };
    setRos(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.submitROS(sessionId, ros);
      if (res.triage_tier === 'Emergency' && onEmergencyDetected) {
        onEmergencyDetected(res.triggered_rules || []);
      }
      onNext(ros);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
          Step 5: Review of Systems (ROS)
        </span>
        <h2 className="text-3xl font-display font-bold text-white mt-1 mb-2">
          {language === 'hi' ? 'शारीरिक प्रणालियों की त्वरित समीक्षा' : 'Review of Systems (ROS Checklist)'}
        </h2>
        <p className="text-slate-400 text-sm">
          {language === 'hi'
            ? 'क्या आप नीचे दिए गए किसी लक्षण का अनुभव कर रहे हैं? हाँ या ना पर टैप करें।'
            : 'Select any current symptoms you are experiencing across primary body systems.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {systems.map((sys) => {
          const Icon = sys.icon;
          const currentSystem = (ros as any)[sys.id] || {};
          return (
            <div key={sys.id} className="glass-panel p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-slate-900 ${sys.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-white text-sm">
                  {language === 'hi' ? sys.titleHi : sys.titleEn}
                </h4>
              </div>

              <div className="space-y-2">
                {sys.items.map((item) => {
                  const active = !!currentSystem[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleItem(sys.id, item.key)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{language === 'hi' ? item.labelHi : item.labelEn}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${active ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                        {active ? 'YES' : 'NO'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="btn-primary"
        >
          {loading ? (
            <span>{language === 'hi' ? 'विश्लेषण जारी है...' : 'Evaluating Red Flags...'}</span>
          ) : (
            <>
              <span>{language === 'hi' ? 'अगला: आयुष (आयुर्वेदिक) मूल्यांकन' : 'Next: AYUSH Mode (Optional)'}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
