// FILE: client/src/pages/Landing.jsx
// SECURITY: Directive 3.5 (Google Sign-In Only)
// AGENT: Landing Page & Auth Entry

import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Brain, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export function Landing({ onNavigateToDashboard }) {
  const { loginWithGoogle, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      onNavigateToDashboard();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      <div className="max-w-4xl mx-auto w-full text-center my-auto">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
          <Brain className="w-7 h-7" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-950 mb-3">RICHA Executive Function Journal</h1>
        <p className="text-slate-600 max-w-xl mx-auto mb-8">
          Multi-agent orchestration designed specifically for ADHD, Autism, and Executive Dysfunction.
        </p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="px-6 py-3.5 bg-slate-900 text-white rounded-xl font-semibold shadow-md inline-flex items-center gap-3"
        >
          <span>Continue with Google</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default Landing;
