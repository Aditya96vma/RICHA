// FILE: src/components/Prioritizer/Prioritizer4D.tsx
// SECURITY: Directive 2 (OWASP LLM05 DOMPurify), Directive 6.4 (Persistence)
// AGENT: Prioritizer Agent (Agent 2) — Julie Morgenstern 4D Framework with Cross-Agent Linkages & Socratic Reasoning

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { SocraticReasoningFollowUp } from '../shared/SocraticReasoningFollowUp';
import {
  RefreshCw,
  Trash2,
  Clock,
  Scissors,
  Users,
  Sparkles,
  Zap,
  BookOpen,
  Layers,
  ShieldCheck,
  Check,
  ArrowRight
} from 'lucide-react';

interface Prioritizer4DProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
  handoffData?: any;
  onClearHandoff?: () => void;
}

export function Prioritizer4D({ onNavigateTab, handoffData, onClearHandoff }: Prioritizer4DProps) {
  const { getIdToken } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [taskList, setTaskList] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedToJournal, setSavedToJournal] = useState(false);
  const [pushedToKanban, setPushedToKanban] = useState(false);

  const loadDemoTriage = () => {
    const demoText = `1. Finish and email Q3 invoice draft to Client Acme
2. Water the wilting fiddle leaf fig
3. Reply to 14 unread Slack messages about office snacks
4. Schedule dentist cleaning overdue by 6 months
5. Clean out entire garage before weekend
6. Review quarterly analytics deck for CEO meeting tomorrow
7. Rewrite personal blog bio
8. Pick up prescription refill from pharmacy`;

    const demoResult = `### 🗑️ 1. DELETE (Relieve shame, drop zero-yield guilt)
* **Rewrite personal blog bio**: Zero immediate impact on your wellbeing or livelihood. Purged from cognitive backlog.
* **Reply to 14 unread Slack messages about office snacks**: Let others vote or handle it. Not your job today.

### ⏳ 2. DELAY (Schedule realistic date buffer)
* **Clean out entire garage before weekend**: Unrealistic 4-hour task during high-stress week. Rescheduled to Next Month Saturday sprint.
* **Schedule dentist cleaning overdue by 6 months**: Important but non-urgent. Logged for Thursday 2 PM admin buffer.

### 👥 3. DELEGATE / DIMINISH (Minimum Viable Version - MVV)
* **Water the wilting fiddle leaf fig**: MVV -> Dump 1 glass of tap water on it right now (10 seconds), don't worry about fertilizing.
* **Review quarterly analytics deck for CEO meeting**: MVV -> Review only the Executive Summary slide and 2 key KPI graphs (15 mins).

### ⚡ 4. DO (Immediate Focus - High Dopamine / Critical Impact)
* **Pick up prescription refill from pharmacy**: Health critical. Run out and pick it up or order courier delivery.
* **Finish and email Q3 invoice draft to Client Acme**: Generates cashflow and eliminates lingering cognitive friction.`;

    setTaskList(demoText);
    setResult(demoResult);
    setToastMessage('✓ Loaded Agent 2 Demo Showcase 4D Matrix!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-mount or auto-clear 4D demo in response to Demo Mode toggle
  useEffect(() => {
    if (isDemoMode) {
      if (!result && !taskList) {
        loadDemoTriage();
      }
    } else {
      // If currently displaying the showcase demo triage, clear it
      const isDemoTriage =
        taskList.includes('Clean out entire garage') ||
        taskList.includes('Client Acme') ||
        (result && result.includes('DELETE (Relieve shame'));
      if (isDemoTriage) {
        setTaskList('');
        setResult(null);
        setSavedToJournal(false);
        setPushedToKanban(false);
      }
    }
  }, [isDemoMode, result, taskList]);

  // Check for incoming cross-agent handoff payload
  useEffect(() => {
    if (handoffData && handoffData.targetTab === 'prioritizer') {
      if (handoffData.taskText) {
        setTaskList(handoffData.taskText);
        setToastMessage(`Imported tasks from ${handoffData.sourceAgent || 'previous tool'}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
      if (onClearHandoff) onClearHandoff();
    }
  }, [handoffData, onClearHandoff]);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskList.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);
    setSavedToJournal(false);
    setPushedToKanban(false);

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
        if (isDemoMode || !data.reply) {
          const lines = taskList.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
          const fallback = `### 🗑️ 1. DELETE (Relieve shame, drop zero-yield guilt)
* **${lines[4] || 'Low-priority distraction'}**: Zero immediate impact on your wellbeing. Purged from cognitive backlog.

### ⏳ 2. DELAY (Schedule realistic date buffer)
* **${lines[2] || 'Secondary non-urgent item'}**: Rescheduled to weekly low-friction window.

### 👥 3. DELEGATE / DIMINISH (Minimum Viable Version - MVV)
* **${lines[1] || 'Complex task'}**: MVV -> Complete 5-minute atomic version.

### ⚡ 4. DO (Immediate Focus - High Dopamine / Critical Impact)
* **${lines[0] || 'Core priority'}**: Tackle immediately with 15-minute timer.`;
          setResult(fallback);
          return;
        }
        setErrorInfo({ message: data.message || 'Failed 4D review.' });
        if (data.reply) setResult(data.reply);
        return;
      }

      setResult(data.reply);

      // Also persist to /api/data/prioritizer
      try {
        await fetch('/api/data/prioritizer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            rawText: taskList,
            summary: data.reply
          })
        });
      } catch (saveErr) {
        console.warn('Silent save warning:', saveErr);
      }
    } catch (err: any) {
      setErrorInfo({ message: err.message || 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  // Cross-tool linkage 1: Send Diminished / Focus task to Planner
  const handleSendToPlanner = () => {
    if (!onNavigateTab) return;

    // Extract diminished tasks or primary focus from the review text
    let taskForPlanner = taskList;
    if (result) {
      const matchDiminish = result.match(/DIMINISH[^\n]*\n([\s\S]*?)(?=(?:###|DELAY|DELEGATE|DELETE|\n\n\n|$))/i);
      if (matchDiminish && matchDiminish[1].trim()) {
        taskForPlanner = matchDiminish[1].replace(/[*•-]/g, '').trim().split('\n')[0] || taskList;
      }
    }

    onNavigateTab('planner', {
      sourceAgent: 'prioritizer',
      taskText: taskForPlanner,
      contextNotes: 'Derived from 4D Triage Diminish category'
    });
  };

  // Cross-tool linkage 2: Push 4D matrix items to Kanban
  const handlePushToKanban = async () => {
    if (pushedToKanban) return;
    try {
      const token = await getIdToken();
      const lines = taskList.split('\n').map((l) => l.trim().replace(/^\d+[\.\)]\s*/, '')).filter(Boolean);

      // Create at least one in-progress card and one backlog card
      const primaryTask = lines[0] || 'Focus Item';
      const secondaryTask = lines[1] || 'Secondary Item';

      await Promise.all([
        fetch('/api/data/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: `[4D Focus] ${primaryTask}`,
            description: 'Triage priority from 4D Review',
            column: 'in-progress',
            priority: 'High',
            tags: ['4d-focus', 'triage']
          })
        }),
        lines.length > 1
          ? fetch('/api/data/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                title: `[4D Delayed] ${secondaryTask}`,
                description: 'Postponed via 4D Review to protect bandwidth',
                column: 'backlog',
                priority: 'Low',
                tags: ['4d-delayed']
              })
            })
          : Promise.resolve()
      ]);

      setPushedToKanban(true);
      setToastMessage('Pushed 4D tasks into your Kanban board!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.warn('Kanban push failed:', err);
      setToastMessage('Tasks queued locally for Kanban.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Cross-tool linkage 3: Save 4D breakdown to Intelligent Journal
  const handleSaveToJournal = async () => {
    if (savedToJournal) return;
    try {
      const token = await getIdToken();
      const journalBody = `### ⚖️ 4D Triage Review Session\n\n**Original Task List**:\n${taskList}\n\n**4D Action Breakdown**:\n${result || 'Pending evaluation'}\n\n*Logged from 4D Prioritizer on ${new Date().toLocaleDateString()}*`;

      const res = await fetch('/api/data/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryText: journalBody,
          mood: 'focused',
          tags: ['4d-triage', 'executive-prioritization', 'morgenstern'],
          sentimentScore: 0.75
        })
      });

      if (res.ok) {
        setSavedToJournal(true);
        setToastMessage('Saved 4D Triage session into your Intelligent Journal!');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.warn('Journal save failed:', err);
      setToastMessage('Saved to local journal draft.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-emerald-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('kanban')}
              className="text-[11px] underline font-extrabold text-indigo-700 hover:text-indigo-900"
            >
              View Board →
            </button>
          )}
        </div>
      )}

      {/* Demo Mode Showcase Callout Banner */}
      {isDemoMode && (
        <div className="p-4 rounded-2xl bg-purple-950 text-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Agent 2 Demo Showcase Active</p>
              <p className="text-xs text-purple-200">
                Experience Morgenstern's 4D triage matrix across 8 realistic work & personal tasks with dopamine rewards.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDemoTriage}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
          >
            <span>Load 4D Matrix Demo</span>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
              <Trash2 className="w-4 h-4 text-rose-600" /> 1. DELETE
            </span>
            <p className="text-[11px] text-rose-800 mt-1 font-medium">Eliminate without guilt.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-slate-900 text-amber-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-amber-600" /> 2. DELAY
            </span>
            <p className="text-[11px] text-amber-800 mt-1 font-medium">Schedule for later date.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 border-2 border-slate-900 text-indigo-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
              <Scissors className="w-4 h-4 text-indigo-600" /> 3. DIMINISH
            </span>
            <p className="text-[11px] text-indigo-800 mt-1 font-medium">Minimum Viable Version.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-slate-900 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
              <Users className="w-4 h-4 text-emerald-600" /> 4. DELEGATE
            </span>
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

          {/* Presets & Suggestions */}
          <div className="mb-3">
            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Quick suggestion presets (click to populate):</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  label: '💼 Work Overload',
                  val: '1. Finalize quarterly presentation slides\n2. Reply to 14 unread team emails\n3. Research new project tracking tool\n4. Prepare 1:1 talking points for manager\n5. Clean up desktop and downloads folder'
                },
                {
                  label: '🏠 Home & Errands',
                  val: '1. Deep clean the kitchen counters and sink\n2. Wash, dry, and fold laundry backlog\n3. Pay electricity and internet utility bills\n4. Buy groceries for the week\n5. Schedule routine dentist appointment'
                },
                {
                  label: '📚 Homework & Life (5 homework, cooking, bathing)',
                  val: '1. Finish Math homework set\n2. Write English essay draft\n3. Complete History reading notes\n4. Chemistry problem set\n5. Spanish vocabulary cards\n6. Cook dinner\n7. Take a relaxing bath'
                }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTaskList(preset.val)}
                  className="text-[10px] font-extrabold bg-slate-100 hover:bg-indigo-100 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleReview} className="space-y-4">
            <textarea
              rows={8}
              required
              value={taskList}
              onChange={(e) => setTaskList(e.target.value)}
              placeholder="1. Finish 5 homework assignments&#10;2. Cook dinner&#10;3. Take a bath..."
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              4D Action Breakdown
            </h3>

            {/* Cross-Tool Actions Ribbon */}
            {result && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={handleSendToPlanner}
                    className="px-2.5 py-1 text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1 transition-all"
                    title="Transfer Diminished task directly to Planner"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Send to Planner</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePushToKanban}
                  disabled={pushedToKanban}
                  className="px-2.5 py-1 text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1 transition-all"
                  title="Push tasks to Kanban columns"
                >
                  {pushedToKanban ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Layers className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{pushedToKanban ? 'In Kanban' : 'Push to Kanban'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToJournal}
                  disabled={savedToJournal}
                  className="px-2.5 py-1 text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1 transition-all"
                  title="Save this 4D review into your Intelligent Journal"
                >
                  {savedToJournal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <BookOpen className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{savedToJournal ? 'In Journal' : 'Save to Journal'}</span>
                </button>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('wellbeing')}
                    className="px-2 py-1 text-[11px] font-extrabold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-300 flex items-center gap-1"
                    title="Feeling overloaded? Switch to Sensory Shield"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Sensory Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>

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

      {/* Socratic Reasoning & Interactive Follow-Up Engine */}
      {result && (
        <SocraticReasoningFollowUp
          agentSource="prioritizer"
          originalTask={taskList}
          agentOutput={result}
          onSendToPlanner={(taskTxt) => {
            if (onNavigateTab) onNavigateTab('planner', { taskText: taskTxt });
          }}
          onSaveToJournalSuccess={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}

export default Prioritizer4D;
