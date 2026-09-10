import React, { useState } from 'react';
import { IdentityStep } from './IdentityStep';
import { ConsentStep } from './ConsentStep';
import { InterviewCC } from './InterviewCC';
import { InterviewHPI } from './InterviewHPI';
import { DocumentScanStep } from './DocumentScanStep';
import { InterviewPH_Allergies } from './InterviewPH_Allergies';
import { InterviewROS } from './InterviewROS';
import { AyushStep } from './AyushStep';
import { ReviewConfirmStep } from './ReviewConfirmStep';
import { Patient, KioskSession } from '../../types/clinical';
import { api } from '../../services/api';
import { AlertOctagon, CheckCircle2, PauseCircle, PlayCircle, KeyRound } from 'lucide-react';

interface KioskContainerProps {
  language: string;
  onEmergencyDetected?: (rules: any[]) => void;
}

export const KioskContainer: React.FC<KioskContainerProps> = ({ language, onEmergencyDetected }) => {
  const [step, setStep] = useState<number>(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [session, setSession] = useState<KioskSession | null>(null);

  // Pause / Resume state
  const [isPaused, setIsPaused] = useState(false);
  const [pausePin, setPausePin] = useState('1234');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Emergency banner
  const [emergencyAlert, setEmergencyAlert] = useState<any[] | null>(null);

  const handlePatientVerified = async (verifiedPatient: Patient) => {
    setPatient(verifiedPatient);
    try {
      const newSession = await api.createSession(verifiedPatient.id, language);
      setSession(newSession);
      setStep(1); // Proceed to consent
    } catch (e) {
      console.error('Session creation error:', e);
    }
  };

  const handleEmergencyTriggered = (rules: any[]) => {
    setEmergencyAlert(rules);
    if (onEmergencyDetected) {
      onEmergencyDetected(rules);
    }
  };

  const handlePause = async () => {
    if (session) {
      await api.pauseSession(session.id, pausePin);
      setIsPaused(true);
    }
  };

  const handleResume = async () => {
    if (session) {
      try {
        await api.resumeSession(session.id, enteredPin);
        setIsPaused(false);
        setPinError(null);
        setEnteredPin('');
      } catch (err: any) {
        setPinError('Incorrect PIN. Please enter the 4-digit PIN set when pausing.');
      }
    }
  };

  const stepTitles = [
    { num: 1, title: language === 'hi' ? 'पहचान' : 'Identity' },
    { num: 2, title: language === 'hi' ? 'सहमति' : 'Consent' },
    { num: 3, title: language === 'hi' ? 'मुख्य समस्या' : 'Chief Complaint' },
    { num: 4, title: language === 'hi' ? 'बीमारी का इतिहास' : 'HPI (SOCRATES)' },
    { num: 5, title: language === 'hi' ? 'पर्चे व रिपोर्ट' : 'Documents OCR' },
    { num: 6, title: language === 'hi' ? 'दवाएं व एलर्जी' : 'Past & Allergies' },
    { num: 7, title: language === 'hi' ? 'शारीरिक जांच' : 'Review of Systems' },
    { num: 8, title: language === 'hi' ? 'आयुष (AYUSH)' : 'AYUSH Mode' },
    { num: 9, title: language === 'hi' ? 'पुष्टि' : 'Confirm' },
  ];

  if (isPaused) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="glass-panel p-8 max-w-md w-full text-center space-y-5 border-amber-500/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950 border border-amber-500/40 text-amber-400">
            <PauseCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-display">
              {language === 'hi' ? 'सत्र रोका गया है (Session Paused)' : 'Kiosk Session Paused'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'hi'
                ? 'आपका सत्र सुरक्षित है। पुनः शुरू करने के लिए अपना 4-अंकीय पिन दर्ज करें।'
                : 'Session is locked. Enter your 4-digit PIN to resume your consultation.'}
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="Enter PIN (e.g. 1234)"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-center text-xl font-mono tracking-widest text-white focus:border-amber-500 focus:outline-none"
            />
            {pinError && <p className="text-xs text-rose-400">{pinError}</p>}
          </div>

          <button
            type="button"
            onClick={handleResume}
            className="w-full btn-primary bg-gradient-to-r from-amber-600 to-orange-600 border-none"
          >
            <PlayCircle className="h-5 w-5" />
            <span>{language === 'hi' ? 'सत्र फिर से शुरू करें' : 'Resume Session'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Emergency Alert Toast */}
      {emergencyAlert && emergencyAlert.length > 0 && (
        <div className="emergency-alert-card rounded-xl p-4 mb-6 text-white flex items-start gap-3">
          <AlertOctagon className="h-6 w-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-200 uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-rose-950 border border-rose-600">
                CRITICAL EMERGENCY DETECTED
              </span>
              <span className="text-xs text-rose-300">Staff & Doctor Notified via Real-time WebSocket</span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              {emergencyAlert[0]?.description || 'Emergency red flag triggered.'}
            </p>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Please inform the triage nurse immediately. You have been placed on immediate priority.
            </p>
          </div>
        </div>
      )}

      {/* Wizard Progress Bar */}
      {step > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              {language === 'hi' ? 'प्रगति:' : 'Progress:'} Step {step} of 8
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-cyan-400">{patient?.name}</span>
              <button
                type="button"
                onClick={handlePause}
                title="Pause and step away"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 ml-3 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-700/40"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                {language === 'hi' ? 'सत्र रोकें' : 'Pause'}
              </button>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full shadow-lg shadow-cyan-500/50"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Router */}
      {step === 0 && (
        <IdentityStep
          language={language}
          onVerified={handlePatientVerified}
        />
      )}

      {step === 1 && session && (
        <ConsentStep
          sessionId={session.id}
          language={language}
          onConsentComplete={() => setStep(2)}
        />
      )}

      {step === 2 && session && (
        <InterviewCC
          sessionId={session.id}
          language={language}
          onNext={() => setStep(3)}
          onEmergencyDetected={handleEmergencyTriggered}
        />
      )}

      {step === 3 && session && (
        <InterviewHPI
          sessionId={session.id}
          language={language}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && session && (
        <DocumentScanStep
          sessionId={session.id}
          language={language}
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && session && (
        <InterviewPH_Allergies
          sessionId={session.id}
          language={language}
          onNext={() => setStep(6)}
        />
      )}

      {step === 6 && session && (
        <InterviewROS
          sessionId={session.id}
          language={language}
          onNext={() => setStep(7)}
          onEmergencyDetected={handleEmergencyTriggered}
        />
      )}

      {step === 7 && session && (
        <AyushStep
          sessionId={session.id}
          language={language}
          onNext={() => setStep(8)}
        />
      )}

      {step === 8 && session && (
        <ReviewConfirmStep
          sessionId={session.id}
          language={language}
          onFinish={() => {
            setStep(0);
            setPatient(null);
            setSession(null);
            setEmergencyAlert(null);
          }}
        />
      )}
    </div>
  );
};
