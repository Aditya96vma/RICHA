// FILE: src/pages/Landing.tsx
// SECURITY: Directive 3.5 (Federated Google Auth only — No custom password storage)
// AGENT: Landing Page & Authentication Gate

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../context/DemoModeContext';
import { GlobalControls } from '../components/shared/GlobalControls';
import { Sparkles, Brain, CheckCircle2, ShieldCheck, ArrowRight, Zap, RefreshCw, Calendar, HeartHandshake, AlertTriangle, Copy, ExternalLink, HelpCircle, Check } from 'lucide-react';

export function Landing({ onNavigateToDashboard }: { onNavigateToDashboard: () => void }) {
  const { user, loginWithGoogle, loginAsDemoUser, loading } = useAuth();
  const { isDemoMode, setDemoMode } = useDemoMode();
  const [authError, setAuthError] = useState<{ title: string; message: string; code?: string; suggestion?: string } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<{
    geminiKeyConfigured: boolean;
    apiProvider: string;
    host: string;
    origin: string;
  } | null>(null);

  useEffect(() => {
    // Fetch live backend diagnostics
    fetch('/api/diagnostic')
      .then((res) => res.json())
      .then((data) => setDiagnosticData(data))
      .catch((err) => console.warn('Diagnostic fetch warning:', err.message));
  }, []);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      onNavigateToDashboard();
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const code = err.code || '';
      const msg = err.message || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthError({
          title: 'Firebase Authorized Domain Required',
          code: 'auth/unauthorized-domain',
          message: `The domain '${currentHost}' is not in your Firebase project's Authorized Domains list.`,
          suggestion: `Go to Firebase Console → Authentication → Settings → Authorized domains, and click 'Add domain' with: ${currentHost}`
        });
      } else if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found' || msg.includes('api-key-not-valid')) {
        setAuthError({
          title: 'Firebase Client Configuration Missing',
          code: code || 'auth/invalid-api-key',
          message: 'Your Firebase web configuration is using placeholder keys or is not yet configured in environment variables.',
          suggestion: 'Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID to your environment, or click "Explore Sandbox" to test RICHA immediately.'
        });
      } else if (code === 'auth/popup-blocked') {
        setAuthError({
          title: 'Sign-in Popup Blocked',
          code: 'auth/popup-blocked',
          message: 'Your browser blocked the Google Sign-in popup window.',
          suggestion: 'Please allow popups for this site, or open the app in a new tab.'
        });
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError({
          title: 'Google Sign-in Provider Not Enabled',
          code: 'auth/operation-not-allowed',
          message: 'Google Sign-in is not enabled in your Firebase project.',
          suggestion: 'Go to Firebase Console → Authentication → Sign-in method, and enable Google.'
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError(null); // User intentionally dismissed popup
      } else {
        setAuthError({
          title: 'Authentication Attempt Notice',
          code: code || 'auth/error',
          message: msg || 'Unable to complete Google sign-in.',
          suggestion: 'You can test all 7 agents right now by clicking "Explore Sandbox".'
        });
      }
    }
  };

  const handleCopyDomain = () => {
    if (navigator.clipboard && currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleDemoLogin = () => {
    setDemoMode(true);
    loginAsDemoUser();
    onNavigateToDashboard();
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Top Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="text-white font-black text-base">R</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              RICHA <span className="text-indigo-600">Journal</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Executive Function AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* 2 Global Toggles */}
          <GlobalControls />

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-extrabold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-transform active:translate-y-0.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Connection Guide</span>
          </button>

          <span className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-900 rounded-full text-xs font-extrabold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            OWASP & Zero-Trust
          </span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-8 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border-2 border-slate-900 text-slate-900 text-xs font-extrabold mb-6 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Executive Function Externalisation for Neurodivergent Minds</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight mb-5">
            Clear mental fog. <br className="hidden sm:inline" />
            <span className="text-indigo-600">Unstick your day without overwhelm.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
            RICHA orchestrates 7 specialized AI agents to gently break down paralyzing tasks, apply Morgenstern 4D prioritization, prevent sensory burnout, and maintain life domains.
          </p>

          {/* Authentication Alert / Diagnostic Banner if error occurred */}
          {authError && (
            <div className="mb-6 text-left p-4 rounded-xl bg-amber-50 border-2 border-amber-500 shadow-[3px_3px_0px_0px_rgba(217,119,6,1)] max-w-lg mx-auto">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">{authError.title}</h4>
                  <p className="text-xs text-amber-900 mt-1 font-medium leading-relaxed">{authError.message}</p>
                  {authError.suggestion && (
                    <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-amber-300 text-[11px] text-slate-800">
                      <p className="font-bold text-slate-900">Recommended fix:</p>
                      <p className="mt-0.5 text-slate-700">{authError.suggestion}</p>
                      {authError.code === 'auth/unauthorized-domain' && currentHost && (
                        <button
                          type="button"
                          onClick={handleCopyDomain}
                          className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded text-[10px] border border-amber-400"
                        >
                          {copiedDomain ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedDomain ? 'Copied domain!' : `Copy '${currentHost}'`}</span>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="px-3 py-1.5 bg-slate-900 text-white font-extrabold rounded-lg text-xs hover:bg-slate-800 flex items-center gap-1"
                    >
                      <span>Explore Sandbox Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthError(null)}
                      className="px-2.5 py-1.5 text-slate-600 font-bold text-xs hover:text-slate-900"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Demo Mode Active Callout */}
          {isDemoMode && (
            <div className="mb-6 p-4 rounded-xl bg-purple-900 text-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] max-w-lg mx-auto flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-4 h-4 fill-purple-950" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Demo Mode is Enabled</p>
                  <p className="text-xs text-purple-200">Explore pre-populated examples across all 7 agents.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Launch Showcase</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Authentication Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {/* Google Sign-In (Directive 3.5) */}
            <button
              id="google-signin-button"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-extrabold border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:translate-y-[-1px] uppercase tracking-wider text-xs"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Instant Demo Sandbox Access */}
            <button
              id="instant-demo-button"
              type="button"
              onClick={handleDemoLogin}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 font-extrabold rounded-xl transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
            >
              <span>Explore Sandbox</span>
              <ArrowRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-4 font-semibold">
            Zero third-party trackers. All journal data is encrypted and user-isolated.
          </p>
        </div>

        {/* 7 Specialized Agents Feature Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px] transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 border-2 border-slate-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1 uppercase tracking-wider">1. Planner Protocol</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Chunks intimidating projects into 15/25 min micro-steps with realistic time checks.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px] transition-all">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border-2 border-slate-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1 uppercase tracking-wider">2. 4D Prioritizer</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Delete, Delay, Diminish to Minimum Viable Version (MVV), or Delegate without guilt.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px] transition-all">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 border-2 border-slate-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1 uppercase tracking-wider">3. Burnout Shield</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Detects sensory drain, interrupts shame spirals, and scripts low-demand recovery rituals.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px] transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border-2 border-slate-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1 uppercase tracking-wider">4. Life Admin Hub</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Maintains recurring chores (groceries, laundry, bills) and important date buffers.
            </p>
          </div>
        </div>
      </main>

      {/* Connection & Troubleshooting Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base uppercase">Integration Setup Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-700">
              {/* Status Pills */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Gemini AI Engine:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    diagnosticData?.geminiKeyConfigured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {diagnosticData?.geminiKeyConfigured ? '✓ Connected' : 'Waiting for GEMINI_API_KEY'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Current App Domain:</span>
                  <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300">
                    {currentHost || 'localhost'}
                  </span>
                </div>
              </div>

              {/* Step 1: Firebase Auth Setup */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">1. Firebase Google Sign-In Setup</h4>
                <p className="leading-relaxed">
                  In Firebase Console, navigate to <strong>Authentication → Settings → Authorized domains</strong> and add this domain:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentHost}
                    className="flex-1 font-mono text-xs px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Gemini API Key */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">2. Gemini API Key</h4>
                <p className="leading-relaxed">
                  The backend reads <code>GEMINI_API_KEY</code> from the platform environment or Google Secret Manager. Ensure your API key is configured in the application secrets.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-800 text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 font-bold gap-2">
        <p>RICHA — Reflective Insight & Cognitive Helper Assistant for Neurodivergent Executive Function.</p>
        <p className="flex items-center gap-2">
          <span>Powered by Gemini API</span>
          <span>•</span>
          <span>Google Cloud Secret Manager</span>
        </p>
      </footer>
    </div>
  );
}

export default Landing;
