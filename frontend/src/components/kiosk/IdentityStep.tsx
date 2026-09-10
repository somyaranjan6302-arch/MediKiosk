import React, { useState } from 'react';
import { QrCode, CreditCard, User, Phone, CheckCircle, ArrowRight, Sparkles, Shield, HeartPulse, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { Patient } from '../../types/clinical';

interface IdentityStepProps {
  language: string;
  onVerified: (patient: Patient) => void;
}

export const IdentityStep: React.FC<IdentityStepProps> = ({ language, onVerified }) => {
  const [tab, setTab] = useState<'abha' | 'mrn'>('abha');
  const [abhaId, setAbhaId] = useState('91-4521-8890-1234');
  const [otp, setOtp] = useState('123456');
  const [mrn, setMrn] = useState('MRN-2026-001');
  const [phone, setPhone] = useState('+919876543210');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAbhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const patient = await api.verifyAbha(abhaId, otp);
      onVerified(patient);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMrnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const patient = await api.verifyMrn(mrn, phone);
      onVerified(patient);
    } catch (err: any) {
      setError(err.message || 'MRN verification failed');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoProfile = (profileAbha: string) => {
    setAbhaId(profileAbha);
    setOtp('123456');
  };

  return (
    <div className="kiosk-landing max-w-4xl mx-auto">
      {/* Live Hospital Telemetry Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              AIIMS New Delhi • OPD Cardiology Bay 3
            </div>
            <div className="text-xs text-slate-400">
              Terminal: KIOSK-01 • Active AI Intake Protocol v1.2
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            ABDM Gateway: ONLINE
          </div>
          <div className="text-slate-400 border-l border-slate-700 pl-3">
            Wait Time: ~4 mins
          </div>
        </div>
      </div>

      <div className="landing-heading text-center mb-8">
        <h2 className="text-4xl font-display font-extrabold text-white mb-2 tracking-tight">
          {language === 'hi' ? 'स्मार्ट मरीज चेक-इन' : 'Patient Self-Service Check-In'}
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          {language === 'hi'
            ? 'अपनी आभा (ABHA) आईडी या अस्पताल पंजीकरण संख्या (MRN) से प्रवेश करें।'
            : 'Authenticate using your Ayushman Bharat Digital Mission (ABHA) ID or Hospital MRN.'}
        </p>
      </div>

      {/* Grid: Interactive Holographic ABHA Card + Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Holographic ABHA Card Mockup */}
        <div className="md:col-span-5 space-y-4">
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 border border-cyan-500/40 shadow-2xl shadow-cyan-500/10 overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-cyan-400" />
                <span className="font-display font-extrabold text-white text-sm tracking-wide">
                  ABHA CARD
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300">
                ABDM VERIFIED
              </span>
            </div>

            <div className="my-4 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Ayushman Bharat Health Account
              </div>
              <div className="text-lg font-mono font-bold text-cyan-300 tracking-widest">
                {abhaId || '91-4521-8890-1234'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Patient Name</span>
                <strong className="text-white">Ramesh Kumar Sharma</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">DOB / Gender</span>
                <span className="text-white font-mono">1968 • Male</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Profile Chips */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
              <Sparkles className="h-3.5 w-3.5" />
              {language === 'hi' ? 'त्वरित डेमो प्रोफाइल (1-क्लिक):' : 'Demo Test Patients (1-Click Fill):'}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => selectDemoProfile('91-4521-8890-1234')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                    Ramesh Kumar Sharma (56y)
                  </div>
                  <div className="text-[11px] text-slate-400">Acute Chest Pain • Cardiac ACS Triage</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                  Emergency Red Flag
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoProfile('91-8765-4321-5678')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                    Priya Patel (35y)
                  </div>
                  <div className="text-[11px] text-slate-400">Bronchial Asthma • Lab Report Ingestion</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold">
                  Priority
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoProfile('91-3344-5566-7788')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                    Lakshmi Narayanan (69y)
                  </div>
                  <div className="text-[11px] text-slate-400">Joint Stiffness • AYUSH Dashavidha Intake</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                  AYUSH Mode
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Verification Form */}
        <div className="md:col-span-7">
          {/* Auth Tabs */}
          <div className="flex rounded-xl bg-slate-900 p-1 mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('abha')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'abha' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              ABHA ID + OTP
            </button>
            <button
              type="button"
              onClick={() => setTab('mrn')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'mrn' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
              Hospital MRN Fallback
            </button>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs font-medium">
              {error}
            </div>
          )}

          {tab === 'abha' ? (
            <form onSubmit={handleAbhaSubmit} className="glass-panel p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  {language === 'hi' ? 'आभा आईडी / ABHA ID' : 'ABHA Number or Address'}
                </label>
                <input
                  type="text"
                  required
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="e.g. 91-4521-8890-1234 or user@abdm"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white text-base font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    {language === 'hi' ? 'सत्यापन कोड (OTP)' : 'ABDM Sandbox OTP'}
                  </label>
                  <span className="text-[11px] text-cyan-400 font-mono">Demo OTP: 123456</span>
                </div>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white text-lg font-mono tracking-widest text-center focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary mt-2"
              >
                {loading ? (
                  <span>Authenticating via ABDM Gateway...</span>
                ) : (
                  <>
                    <span>{language === 'hi' ? 'सत्यापित करें और आगे बढ़ें' : 'Verify Identity & Begin Intake'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMrnSubmit} className="glass-panel p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Hospital MRN / Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="MRN-2026-001"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white text-base focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white text-base focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary mt-2"
              >
                {loading ? (
                  <span>Checking Registration...</span>
                ) : (
                  <>
                    <span>Proceed with Hospital MRN</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
