import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KioskContainer } from './components/kiosk/KioskContainer';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';

export const App: React.FC = () => {
  const [mode, setMode] = useState<'kiosk' | 'doctor'>('kiosk');
  const [language, setLanguage] = useState<string>('hi');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<string>('md');
  const [hasEmergencyAlert, setHasEmergencyAlert] = useState<boolean>(false);

  // Apply high contrast class
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Apply font scale
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg');
    root.classList.add(`font-scale-${fontSize}`);
  }, [fontSize]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Universal Header */}
      <Header
        mode={mode}
        setMode={setMode}
        language={language}
        setLanguage={setLanguage}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        fontSize={fontSize}
        setFontSize={setFontSize}
        hasEmergencyAlert={hasEmergencyAlert}
      />

      {/* Main Mode View */}
      <main className="flex-1 py-4">
        {mode === 'kiosk' ? (
          <KioskContainer
            language={language}
            onEmergencyDetected={() => setHasEmergencyAlert(true)}
          />
        ) : (
          <DoctorDashboard />
        )}
      </main>

      {/* Clinical Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            MediKiosk • SIH26047 Patient Case-Taking Software • Team Power Rangers
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>ABDM Sandbox M1/M2</span>
            <span>•</span>
            <span>HL7 FHIR R4 Ready</span>
            <span>•</span>
            <span>DPDP Act 2023 Tamper-Evident Logging</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
