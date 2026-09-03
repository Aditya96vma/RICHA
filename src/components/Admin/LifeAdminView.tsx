// FILE: src/components/Admin/LifeAdminView.tsx
// SECURITY: Directive 2 (OWASP LLM05 Sanitization), Directive 6.4 (Persistence)
// AGENT: Admin & Life Orchestrator Agent (Agent 3)

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { Calendar, ShoppingBag, DollarSign, Heart, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

export function LifeAdminView() {
  const { getIdToken } = useAuth();
  const [selectedRoutine, setSelectedRoutine] = useState('meal_planning');
  const [customDetails, setCustomDetails] = useState('');
  const [adminPlan, setAdminPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);

  const ROUTINES = [
    { id: 'meal_planning', label: 'Meal Planning & Groceries', icon: ShoppingBag, desc: 'Batch grocery list & low-effort meal prep' },
    { id: 'finances', label: 'Finances & Bill Audits', icon: DollarSign, desc: 'Monthly subscription & bill check-in' },
    { id: 'laundry_home', label: 'Home Reset & Laundry Cycle', icon: Clock, desc: 'Predictable 45-min apartment reset' },
    { id: 'relationships', label: 'Friendship & Contact Touchpoints', icon: Heart, desc: 'Low-pressure check-in messages' }
  ];

  const handleGenerateRoutine = async () => {
    setLoading(true);
    setErrorInfo(null);

    const routineInfo = ROUTINES.find((r) => r.id === selectedRoutine);
    const promptText = `LIFE ADMIN ORCHESTRATION:\nRoutine: ${routineInfo?.label}\nNotes/Constraints: ${customDetails || 'Standard neurodivergent-friendly low friction plan'}\nPlease give me a structured recurring time block with time estimates and a 3-step checklist.`;

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
          sessionId: 'admin-session',
          contextHint: 'admin_setup'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorInfo({ message: data.message || 'Failed to generate admin routine.' });
        if (data.reply) setAdminPlan(data.reply);
        return;
      }

      setAdminPlan(data.reply);
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
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Agent 3 • Rhythm Builder
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span>Life Admin & Recurring Rhythm Orchestrator</span>
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Eliminate recurring executive drag for meals, finances, laundry, and relationships with friction-free templates.
        </p>
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={handleGenerateRoutine}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Routine Selector Bento Tile */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Select Life Admin Area</h3>
            <div className="space-y-2">
              {ROUTINES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRoutine === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoutine(r.id)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className={`p-2 rounded-lg border border-slate-900 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{r.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Specific preferences or dietary/financial constraints
              </label>
              <textarea
                rows={2}
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="e.g. Vegetarian, 20-min max cooking, 3 bills to cancel..."
                className="w-full px-3.5 py-2 text-xs border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none font-medium bg-slate-50 text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateRoutine}
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Orchestrating Block...' : 'Build Low-Friction Block'}</span>
            </button>
          </div>
        </div>

        {/* Structured Output Bento Tile */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider">
            Structured Routine & Checklist
          </h3>
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-5 overflow-y-auto min-h-[340px]">
            {adminPlan ? (
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(adminPlan) }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 stroke-2" />
                <p className="text-xs font-bold text-slate-600">Your structured life admin block and gentle checklist will render here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LifeAdminView;
