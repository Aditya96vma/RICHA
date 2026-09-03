// FILE: src/components/Wellbeing/WellbeingView.tsx
// SECURITY: Directive 2 (OWASP LLM05 Sanitization), Directive 6.4 (Persistence)
// AGENT: Wellbeing & Burnout Prevention Agent (Agent 4)

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { HeartHandshake, ShieldAlert, Sparkles, Moon, Sun, BatteryMedium, BatteryLow, BatteryCharging } from 'lucide-react';

export function WellbeingView() {
  const { getIdToken } = useAuth();
  const [sensoryState, setSensoryState] = useState('');
  const [energyBattery, setEnergyBattery] = useState<'low' | 'drained' | 'recharging'>('drained');
  const [assessment, setAssessment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sensoryState.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);

    const promptText = `WELLBEING & SENSORY CHECK-IN:\nBattery Level: ${energyBattery}\nSensory & Emotional Description: ${sensoryState}\nPlease validate my experience, assess burnout risk level (🟢/🟡/🔴), and provide zero-demand sensory recovery rituals.`;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: promptText,
          sessionId: 'wellbeing-session',
          contextHint: 'burnout_signal'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorInfo({ message: data.message || 'Failed wellbeing evaluation.' });
        if (data.reply) setAssessment(data.reply);
        return;
      }

      setAssessment(data.reply);
    } catch (err: any) {
      setErrorInfo({ message: err.message || 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bento Tile */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Agent 4 • Sensory Shield
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-rose-600" />
          <span>Nervous System & Sensory Burnout Shield</span>
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Detect sensory drain, interrupt perfectionist loops, and regulate your nervous system with zero shame.
        </p>
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={() => handleCheckin({ preventDefault: () => {} } as any)}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sensory Check-in Form Bento Tile */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Sensory & Emotional Check-in</h3>

          <form onSubmit={handleCheckin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Internal Battery Level</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEnergyBattery('drained')}
                  className={`p-3 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center gap-1.5 transition-all ${
                    energyBattery === 'drained'
                      ? 'bg-rose-100 border-slate-900 text-rose-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <BatteryLow className="w-4 h-4 text-rose-600" />
                  <span>Drained</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEnergyBattery('low')}
                  className={`p-3 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center gap-1.5 transition-all ${
                    energyBattery === 'low'
                      ? 'bg-amber-100 border-slate-900 text-amber-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <BatteryMedium className="w-4 h-4 text-amber-600" />
                  <span>Low Strain</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEnergyBattery('recharging')}
                  className={`p-3 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center gap-1.5 transition-all ${
                    energyBattery === 'recharging'
                      ? 'bg-emerald-100 border-slate-900 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <BatteryCharging className="w-4 h-4 text-emerald-600" />
                  <span>Recharging</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                How does your nervous system feel right now?
              </label>
              <textarea
                rows={4}
                required
                value={sensoryState}
                onChange={(e) => setSensoryState(e.target.value)}
                placeholder="e.g. Too much noise today, feel exhausted, constant demands, sensory overload, can't focus on anything..."
                className="w-full p-3.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none font-medium bg-slate-50 text-slate-900"
              />
            </div>

            <button
              id="wellbeing-submit-btn"
              type="submit"
              disabled={!sensoryState.trim() || loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Evaluating Sensory Load...' : 'Assess & Get Recovery Plan'}</span>
            </button>
          </form>
        </div>

        {/* Assessment & Low-Demand Rituals Bento Tile */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider">Recovery Plan & Sensory Relief</h3>
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-5 overflow-y-auto min-h-[340px]">
            {assessment ? (
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(assessment) }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <Moon className="w-8 h-8 text-slate-400 stroke-2" />
                <p className="text-xs font-bold text-slate-600">Your sensory decompression guidance and boundary scripts will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WellbeingView;
