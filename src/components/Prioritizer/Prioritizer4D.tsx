// FILE: src/components/Prioritizer/Prioritizer4D.tsx
// SECURITY: Directive 2 (OWASP LLM05 DOMPurify), Directive 6.4 (Persistence)
// AGENT: Prioritizer Agent (Agent 2) — Julie Morgenstern 4D Framework

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { RefreshCw, Trash2, Clock, Scissors, Users, Sparkles } from 'lucide-react';

export function Prioritizer4D() {
  const { getIdToken } = useAuth();
  const [taskList, setTaskList] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskList.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: `4D PRIORITIZATION REVIEW:\n${taskList}`,
          sessionId: 'prioritizer-4d',
          contextHint: 'review_request'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorInfo({ message: data.message || 'Failed 4D review.' });
        if (data.reply) setResult(data.reply);
        return;
      }

      setResult(data.reply);
    } catch (err: any) {
      setErrorInfo({ message: err.message || 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 4D Header Bento Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Agent 2 • Triage Matrix
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-indigo-600" />
          <span>Julie Morgenstern 4D Prioritization Matrix</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-slate-900 text-rose-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide"><Trash2 className="w-4 h-4 text-rose-600" /> 1. DELETE</span>
            <p className="text-[11px] text-rose-800 mt-1 font-medium">Eliminate without guilt.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-slate-900 text-amber-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide"><Clock className="w-4 h-4 text-amber-600" /> 2. DELAY</span>
            <p className="text-[11px] text-amber-800 mt-1 font-medium">Schedule for later date.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 border-2 border-slate-900 text-indigo-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide"><Scissors className="w-4 h-4 text-indigo-600" /> 3. DIMINISH</span>
            <p className="text-[11px] text-indigo-800 mt-1 font-medium">Minimum Viable Version.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-slate-900 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide"><Users className="w-4 h-4 text-emerald-600" /> 4. DELEGATE</span>
            <p className="text-[11px] text-emerald-800 mt-1 font-medium">Automate or hand off.</p>
          </div>
        </div>
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={() => handleReview({ preventDefault: () => {} } as any)}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <h3 className="text-sm font-extrabold text-slate-900 mb-1 uppercase tracking-wider">
            Enter Overwhelming Task List
          </h3>
          <p className="text-xs text-slate-500 mb-3 font-medium">Paste 3 to 10 tasks currently competing for your attention.</p>

          <form onSubmit={handleReview} className="space-y-4">
            <textarea
              rows={8}
              required
              value={taskList}
              onChange={(e) => setTaskList(e.target.value)}
              placeholder="1. Clean whole apartment&#10;2. Finish quarterly report presentation&#10;3. Reply to 15 pending emails&#10;4. Research gym memberships&#10;5. Cook elaborate dinner..."
              className="w-full p-3.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none font-mono bg-slate-50 text-slate-900 font-medium"
            />

            <button
              type="submit"
              disabled={!taskList.trim() || loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Evaluating 4D Matrix...' : 'Run 4D Prioritization'}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider">
            4D Action Breakdown
          </h3>
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-5 overflow-y-auto min-h-[320px]">
            {result ? (
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(result) }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <RefreshCw className="w-8 h-8 text-slate-400 stroke-2" />
                <p className="text-xs font-bold text-slate-600">Your 4D breakdown will categorize what to drop, delay, shrink, and hand off.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Prioritizer4D;
