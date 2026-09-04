// FILE: src/components/BulletJournal/BrainDump.tsx
// SECURITY: Directive 2 (OWASP LLM05 DOMPurify sanitization), Directive 6.4 (Persistence)
// AGENT: Bullet Journal Agent (Agent 7) & Rapid Logging

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { SocraticReasoningFollowUp } from '../shared/SocraticReasoningFollowUp';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  ListTodo,
  FileText
} from 'lucide-react';

const DEMO_RAW_DUMP = `need to text Dr Miller about prescription dosage adjustment
remember to order whole bean coffee before Friday morning sprint
idea: add binaural beats soundscape toggle directly to top header bar
car insurance renewal email arrived check if safe driver discount applies
feeling low energy around 3pm maybe need more protein at lunch
submit invoice for Acme project draft is already 90% done`;

const DEMO_BUJO_RESULT = `### 📓 Rapid Bullet Journal Triage

#### • Tasks (Actionable Next Steps)
* [ ] **• Call Dr. Miller's clinic**: Request prescription dosage adjustment (Morning window)
* [ ] **• Order whole bean coffee**: 1-click re-order before Friday sprint
* [ ] **• Review car insurance renewal**: Check safe driver discount eligibility
* [ ] **• Submit Acme invoice**: Final review & send 90% completed draft

#### ○ Events / Time-Anchors
* ○ **Friday morning**: Sprint kickoff meeting

#### - Notes & Somatic Observations
* - *Energy pattern*: Fatigue dips at 3:00 PM; experiment with protein-rich lunch anchor

#### 💡 Ideas & Hyperfocus Sparks
* 💡 **Header Soundscape**: Add ambient binaural beats toggle in top navigation bar`;

export function BrainDump() {
  const { getIdToken } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [rawText, setRawText] = useState(() => isDemoMode ? DEMO_RAW_DUMP : '');
  const [formattedResult, setFormattedResult] = useState<string | null>(() => isDemoMode ? DEMO_BUJO_RESULT : null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      if (!formattedResult && !rawText) {
        setRawText(DEMO_RAW_DUMP);
        setFormattedResult(DEMO_BUJO_RESULT);
      }
    } else {
      // Clear demo dump if active
      if (rawText === DEMO_RAW_DUMP || formattedResult === DEMO_BUJO_RESULT) {
        setRawText('');
        setFormattedResult(null);
      }
    }
  }, [isDemoMode, formattedResult, rawText]);

  const handleProcessBrainDump = async () => {
    if (!rawText.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);
    const textSnapshot = rawText;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: `BRAIN DUMP:\n${textSnapshot}`,
          sessionId: 'braindump-session',
          contextHint: 'brain_dump'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (isDemoMode || !data.reply) {
          const lines = textSnapshot.split('\n').filter(Boolean);
          const tasks = lines.slice(0, 3);
          const notes = lines.slice(3);
          const formatted = `### 📓 Rapid Bullet Journal Triage

#### • Actionable Tasks
${tasks.map(t => `* [ ] **• ${t}**`).join('\n')}

#### - Notes & Context
${notes.length ? notes.map(n => `* - ${n}`).join('\n') : '* - Clean mental space preserved.'}`;
          setFormattedResult(formatted);
          return;
        }
        setErrorInfo({ message: data.message || 'Failed to format brain dump.' });
        if (data.reply) setFormattedResult(data.reply);
        return;
      }

      setFormattedResult(data.reply);
    } catch (err: any) {
      if (isDemoMode) {
        const lines = textSnapshot.split('\n').filter(Boolean);
        const tasks = lines.slice(0, 3);
        const notes = lines.slice(3);
        const formatted = `### 📓 Rapid Bullet Journal Triage

#### • Actionable Tasks
${tasks.map(t => `* [ ] **• ${t}**`).join('\n')}

#### - Notes & Context
${notes.length ? notes.map(n => `* - ${n}`).join('\n') : '* - Clean mental space preserved.'}`;
        setFormattedResult(formatted);
      } else {
        setErrorInfo({ message: err.message || 'Network error processing brain dump.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (formattedResult) {
      navigator.clipboard.writeText(formattedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bento Tile */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Agent 7 • Rapid Logging
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Brain Dump & Bullet Journal Organizer</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Pour raw unstructured thoughts out — RICHA sorts them into Ryder Carroll rapid logging collections.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 bg-slate-100 border-2 border-slate-900 px-3.5 py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <span>• Task</span>
          <span>○ Event</span>
          <span>- Note</span>
          <span>* Priority</span>
        </div>
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={handleProcessBrainDump}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      {/* Main Grid: Input Dump + Formatted Bujo Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Raw Brain Dump */}
        <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Raw Mental Download</span>
              </label>
              <button
                type="button"
                onClick={() => setRawText('')}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Presets & Suggestions */}
            <div className="mb-3">
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">Common brain dump patterns (click to populate):</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: '⚡ Monday Morning Scramble',
                    val: 'Need to submit timesheet before noon\nSync call with Alex at 2pm\nBuy oat milk and coffee beans\nCar makes a squeaking sound when braking\nFeeling overwhelmed by notifications\nMaybe look into Notion template for budget'
                  },
                  {
                    label: '🛋️ Weekend Reset',
                    val: 'Clean bathroom sink and mirror\nTake dog to the vet on Saturday 10am\nIdea: design minimalist wooden desk shelf\nForgot to return library book\nExhausted from this work week\nCall mom Sunday evening'
                  },
                  {
                    label: '🚀 Project Launch Chaos',
                    val: 'Push final code commit to staging\nReview QA feedback document\nMeeting with client at 4:30pm\nOrder lunch for team\nRemember to stretch and hydrate\nIdea: write blog post summarizing architecture'
                  }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setRawText(preset.val)}
                    className="text-[10px] font-extrabold bg-slate-100 hover:bg-indigo-100 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              id="braindump-textarea"
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Dump everything here without worrying about order, grammar, or prioritization...&#10;&#10;e.g. Need to reply to Sarah, car oil light came on yesterday, buy almond milk and oats, draft the proposal before Thursday 3pm, feeling exhausted by all the meetings..."
              className="w-full p-4 text-sm bg-slate-50 border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-none resize-none transition-all placeholder:text-slate-400 font-mono text-slate-900 font-medium"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {rawText.trim().split(/\s+/).filter(Boolean).length} words
            </span>

            <button
              id="braindump-organize-btn"
              type="button"
              onClick={handleProcessBrainDump}
              disabled={!rawText.trim() || loading}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all uppercase tracking-wider"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Organizing Spread...' : 'Convert to Bullet Journal'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Formatted Rapid Logging Result */}
        <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <ListTodo className="w-4 h-4 text-indigo-600" />
              <span>Formatted Bullet Journal Spread</span>
            </h3>

            {formattedResult && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-slate-800 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Spread'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-5 overflow-y-auto min-h-[300px]">
            {formattedResult ? (
              // SECURITY: Strict DOMPurify sanitization
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(formattedResult) }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-400 stroke-2" />
                <p className="text-xs font-bold text-slate-600">Your rapid logging collections will appear here.</p>
                <p className="text-[11px] text-slate-400 max-w-xs font-medium">
                  Today's Focus, Scheduled Events, Someday Log, and Mental Notes formatted automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Socratic Cognitive Unpacking Follow-Up */}
      {formattedResult && (
        <SocraticReasoningFollowUp
          agentSource="braindump"
          originalTask={rawText || 'Brain dump and rapid logging'}
          agentOutput={formattedResult}
        />
      )}
    </div>
  );
}

export default BrainDump;
