import React from 'react';
import { 
  HeartPulse, 
  Stethoscope, 
  Volume2, 
  Eye, 
  Languages, 
  AlertTriangle,
  PauseCircle
} from 'lucide-react';

interface HeaderProps {
  mode: 'kiosk' | 'doctor';
  setMode: (mode: 'kiosk' | 'doctor') => void;
  language: string;
  setLanguage: (lang: string) => void;
  highContrast: boolean;
  setHighContrast: (hc: boolean) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  hasEmergencyAlert: boolean;
  onPauseSession?: () => void;
  isKioskActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  language,
  setLanguage,
  highContrast,
  setHighContrast,
  fontSize,
  setFontSize,
  hasEmergencyAlert,
  onPauseSession,
  isKioskActive
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand Logo & SIH Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/25">
            <HeartPulse className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                Medi<span className="text-cyan-400">Kiosk</span>
              </span>
              <span className="rounded-full bg-cyan-950/80 border border-cyan-700/50 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                SIH26047
              </span>
              <span className="rounded-full bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                ABDM + FHIR R4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {language === 'hi' ? 'स्मार्ट मरीज केस-टेकिंग और ट्राइएज प्रणाली' : 'Smart Patient Case-Taking & Triage System'}
            </p>
          </div>
        </div>

        {/* Mode Switcher (Kiosk vs Clinician Dashboard) */}
        <div className="flex items-center rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setMode('kiosk')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              mode === 'kiosk'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartPulse className="h-4 w-4" />
            {language === 'hi' ? 'मरीज कियोस्क' : 'Patient Kiosk'}
          </button>
          <button
            onClick={() => setMode('doctor')}
            className={`relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              mode === 'doctor'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            {language === 'hi' ? 'डॉक्टर डैशबोर्ड' : 'Doctor Dashboard'}
            {hasEmergencyAlert && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Accessibility & Language Controls */}
        <div className="flex items-center gap-2">
          {/* Pause Session Button (Kiosk Mode) */}
          {mode === 'kiosk' && isKioskActive && onPauseSession && (
            <button
              onClick={onPauseSession}
              title="Pause session and step away"
              className="flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/50 transition-colors"
            >
              <PauseCircle className="h-4 w-4 text-amber-400" />
              {language === 'hi' ? 'रोकें' : 'Pause'}
            </button>
          )}

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle High Contrast Mode (WCAG 2.1 AA)"
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              highContrast
                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {highContrast ? 'Contrast ON' : 'Contrast'}
          </button>

          {/* Font Scaling (A-, A, A+) */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 text-xs font-semibold rounded ${fontSize === 'sm' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              title="Small Text"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('md')}
              className={`px-2 py-1 text-xs font-semibold rounded ${fontSize === 'md' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              title="Standard Text"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 text-xs font-semibold rounded ${fontSize === 'lg' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              title="Large Text"
            >
              A+
            </button>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:border-slate-700 transition-colors"
          >
            <Languages className="h-3.5 w-3.5" />
            {language === 'hi' ? 'हिन्दी (Change)' : 'English (बदलें)'}
          </button>
        </div>

      </div>
    </header>
  );
};
