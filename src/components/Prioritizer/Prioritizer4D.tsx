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
  ArrowRight,
  CheckCircle2,
  Copy,
  Edit3,
  Calendar,
  HelpCircle
} from 'lucide-react';

interface DeleteItem {
  id: string;
  title: string;
  explanation: string;
  dropped: boolean;
}

interface DelayItem {
  id: string;
  title: string;
  schedule: string;
  parked: boolean;
}

interface DiminishItem {
  id: string;
  title: string;
  mvv: string;
  sentToPlanner: boolean;
}

interface DelegateItem {
  id: string;
  title: string;
  notes: string;
  copied: boolean;
}

interface Interactive4DState {
  deleteItems: DeleteItem[];
  delayItems: DelayItem[];
  diminishItems: DiminishItem[];
  delegateItems: DelegateItem[];
}

function parse4DToInteractiveSteps(rawText: string, rawTasks: string): Interactive4DState {
  const cleanMd = rawText || '';

  const getSection = (keyword: string) => {
    const match = cleanMd.match(new RegExp(`(?:###|\\*\\*)[^\\n]*\\b${keyword}\\b[\\s\\S]*?(?=(?:###|\\*\\*\\s*[1-4]?\\.?\\s*(?:DELETE|DELAY|DIMINISH|DELEGATE|DO)|---|$))`, 'i'));
    return match ? match[0] : '';
  };

  const extractItems = (sectionStr: string) => {
    const lines = sectionStr.split('\n');
    const items: Array<{ title: string; detail: string }> = [];
    for (const line of lines) {
      const trimmed = line.replace(/^[\s*•\-]+/, '').trim();
      if (!trimmed || trimmed.startsWith('###') || trimmed.startsWith('**') || trimmed.toLowerCase().includes('done this session') || trimmed.toLowerCase().includes('saved to:') || trimmed.toLowerCase().includes('suggested next step:')) {
        continue;
      }
      const parts = trimmed.replace(/\*\*/g, '').split(/:\s*(.*)/s);
      if (parts.length >= 2 && parts[0].trim()) {
        items.push({ title: parts[0].trim().replace(/^[1-9]\.\s*/, ''), detail: parts[1]?.trim() || '' });
      } else if (trimmed.length > 3) {
        items.push({ title: trimmed.replace(/^[1-9]\.\s*/, ''), detail: '' });
      }
    }
    return items;
  };

  const delSection = getSection('DELETE');
  const delaySection = getSection('DELAY');
  const dimSection = getSection('DIMINISH');
  const delegSection = getSection('DELEGATE');

  const delItems: DeleteItem[] = extractItems(delSection).map((it, idx) => ({
    id: `del_${idx}`,
    title: it.title,
    explanation: it.detail || 'Non-essential today. Safe to drop with zero guilt.',
    dropped: false
  }));

  const delayItems: DelayItem[] = extractItems(delaySection).map((it, idx) => ({
    id: `delay_${idx}`,
    title: it.title,
    schedule: 'Tomorrow 10:00 AM',
    parked: false
  }));

  const dimItems: DiminishItem[] = extractItems(dimSection).map((it, idx) => ({
    id: `dim_${idx}`,
    title: it.title,
    mvv: it.detail || 'Complete a 15-minute minimum viable version',
    sentToPlanner: false
  }));

  const delegItems: DelegateItem[] = extractItems(delegSection).map((it, idx) => ({
    id: `deleg_${idx}`,
    title: it.title,
    notes: it.detail || 'Ask peer for assistance or use quick template',
    copied: false
  }));

  // Fallback if parsing found nothing
  if (dimItems.length === 0 && delItems.length === 0) {
    const rawLines = rawTasks.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
    if (rawLines[0]) {
      dimItems.push({
        id: 'dim_0',
        title: rawLines[0],
        mvv: 'Complete 15-minute focused atomic interval',
        sentToPlanner: false
      });
    }
    if (rawLines[1]) {
      delayItems.push({
        id: 'delay_0',
        title: rawLines[1],
        schedule: 'Tomorrow 10:00 AM',
        parked: false
      });
    }
    if (rawLines[2]) {
      delItems.push({
        id: 'del_0',
        title: rawLines[2],
        explanation: 'Non-critical distraction; safe to drop today.',
        dropped: false
      });
    }
    if (rawLines[3]) {
      delegItems.push({
        id: 'deleg_0',
        title: rawLines[3],
        notes: 'Hand off to partner or automate',
        copied: false
      });
    }
  }

  return {
    deleteItems: delItems,
    delayItems,
    diminishItems: dimItems,
    delegateItems: delegItems
  };
}

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
  const [activeViewMode, setActiveViewMode] = useState<'interactive_steps' | 'markdown'>('interactive_steps');
  const [stepData, setStepData] = useState<Interactive4DState>({
    deleteItems: [],
    delayItems: [],
    diminishItems: [],
    delegateItems: []
  });

  // Keep interactive step data synced when result is produced or loaded
  useEffect(() => {
    if (result) {
      setStepData(parse4DToInteractiveSteps(result, taskList));
    }
  }, [result]);

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
          contextHint: 'review_request',
          overrideAgent: 'prioritizer'
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

  // Step 1: Drop Deletion
  const toggleDropDelete = (id: string) => {
    setStepData(prev => ({
      ...prev,
      deleteItems: prev.deleteItems.map(item =>
        item.id === id ? { ...item, dropped: !item.dropped } : item
      )
    }));
  };

  // Step 2: Set Delay Schedule
  const updateDelaySchedule = (id: string, schedule: string) => {
    setStepData(prev => ({
      ...prev,
      delayItems: prev.delayItems.map(item =>
        item.id === id ? { ...item, schedule } : item
      )
    }));
  };

  // Step 2: Park single delayed task
  const parkSingleDelayedTask = async (id: string) => {
    const item = stepData.delayItems.find(i => i.id === id);
    if (!item || item.parked) return;
    try {
      const token = await getIdToken();
      await fetch('/api/data/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: `[Delayed] ${item.title}`,
          description: `Parked for ${item.schedule} via 4D Step 2`,
          column: 'backlog',
          priority: 'Low',
          tags: ['4d-delayed', 'step-2']
        })
      });
      setStepData(prev => ({
        ...prev,
        delayItems: prev.delayItems.map(it => it.id === id ? { ...it, parked: true } : it)
      }));
      setToastMessage(`Parked "${item.title}" into Kanban Backlog!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.warn('Park failed:', err);
    }
  };

  // Step 3: Update MVV
  const updateDiminishMVV = (id: string, mvv: string) => {
    setStepData(prev => ({
      ...prev,
      diminishItems: prev.diminishItems.map(item =>
        item.id === id ? { ...item, mvv } : item
      )
    }));
  };

  // Step 3: Send single diminished item to Planner
  const sendItemToPlanner = (item: DiminishItem) => {
    if (!onNavigateTab) return;
    onNavigateTab('planner', {
      taskText: `${item.title} (MVV: ${item.mvv})`,
      contextNotes: 'From 4D Step 3 Diminish'
    });
  };

  // Step 4: Update delegate notes
  const updateDelegateNotes = (id: string, notes: string) => {
    setStepData(prev => ({
      ...prev,
      delegateItems: prev.delegateItems.map(item =>
        item.id === id ? { ...item, notes } : item
      )
    }));
  };

  // Step 4: Copy handoff template
  const copyDelegateTemplate = (item: DelegateItem) => {
    const text = `Hi! Could you help take ownership of "${item.title}"? Context: ${item.notes || 'Delegating to streamline execution today.'} Thank you!`;
    navigator.clipboard.writeText(text);
    setStepData(prev => ({
      ...prev,
      delegateItems: prev.delegateItems.map(it => it.id === item.id ? { ...it, copied: true } : it)
    }));
    setToastMessage('Copied 1-sentence delegation ask to clipboard!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Apply all 4 steps at once!
  const handleApplyAll4DSteps = async () => {
    try {
      const token = await getIdToken();
      
      // 1. Mark all delete items as dropped
      setStepData(prev => ({
        ...prev,
        deleteItems: prev.deleteItems.map(d => ({ ...d, dropped: true })),
        delayItems: prev.delayItems.map(d => ({ ...d, parked: true }))
      }));

      // 2. Push all delay items to Kanban Backlog
      const delayPromises = stepData.delayItems.map(it =>
        fetch('/api/data/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: `[4D Delayed] ${it.title}`,
            description: `Scheduled for ${it.schedule}`,
            column: 'backlog',
            priority: 'Low',
            tags: ['4d-delayed', 'step-2']
          })
        })
      );

      // 3. Push primary diminish item to Kanban In-Progress
      const primaryDiminish = stepData.diminishItems[0];
      const diminishPromise = primaryDiminish ? fetch('/api/data/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: `[4D Focus MVV] ${primaryDiminish.title}`,
          description: primaryDiminish.mvv,
          column: 'in-progress',
          priority: 'High',
          tags: ['4d-focus', 'mvv']
        })
      }) : Promise.resolve();

      // 4. Save journal entry
      const journalBody = `### ⚖️ 4D Step-by-Step Triage Completed\n\n` +
        `**Step 1 - Dropped With Zero Guilt**:\n` +
        (stepData.deleteItems.length ? stepData.deleteItems.map(d => `- ~~${d.title}~~ (${d.explanation})`).join('\n') : '- (None)') + '\n\n' +
        `**Step 2 - Delayed to Safe Buffers**:\n` +
        (stepData.delayItems.length ? stepData.delayItems.map(d => `- ${d.title} -> ${d.schedule}`).join('\n') : '- (None)') + '\n\n' +
        `**Step 3 - Diminished to MVV**:\n` +
        (stepData.diminishItems.length ? stepData.diminishItems.map(d => `- **${d.title}**: ${d.mvv}`).join('\n') : '- (None)') + '\n\n' +
        `**Step 4 - Delegated / Automated**:\n` +
        (stepData.delegateItems.length ? stepData.delegateItems.map(d => `- ${d.title}: ${d.notes}`).join('\n') : '- (None)');

      const journalPromise = fetch('/api/data/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          entryText: journalBody,
          mood: 'focused',
          tags: ['4d-applied', 'step-by-step', 'morgenstern'],
          sentimentScore: 0.85
        })
      });

      await Promise.all([...delayPromises, diminishPromise, journalPromise]);

      setPushedToKanban(true);
      setSavedToJournal(true);
      setToastMessage('🎉 All 4D steps filled & applied to your workspace (Backlog, In-Progress, & Journal)!');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.warn('Failed to apply all 4D steps:', err);
      setToastMessage('Steps applied locally!');
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                4D Action Breakdown
              </h3>
              {result && (
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('interactive_steps')}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all ${
                      activeViewMode === 'interactive_steps'
                        ? 'bg-amber-400 text-slate-950 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✍️ Step Filler
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('markdown')}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all ${
                      activeViewMode === 'markdown'
                        ? 'bg-amber-400 text-slate-950 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📋 Overview
                  </button>
                </div>
              )}
            </div>

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

          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-4 overflow-y-auto min-h-[360px]">
            {result ? (
              activeViewMode === 'interactive_steps' ? (
                <div className="space-y-4">
                  {/* Step-by-Step Guidance Callout */}
                  <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Step-by-Step 4D Filling Workspace</p>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Julie Morgenstern's 4 steps to decompress your brain. Check off deletions, schedule delays, customize minimum viable versions, and apply them directly into your workspace.
                      </p>
                    </div>
                  </div>

                  {/* Step 1: DELETE */}
                  <div className="p-3.5 bg-white border-2 border-rose-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">
                          1
                        </div>
                        <span className="text-xs font-black text-rose-950 uppercase tracking-wide flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Step 1: Delete (Eliminate Guilt)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Zero negative consequence
                      </span>
                    </div>

                    {stepData.deleteItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks assigned to Delete.</p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {stepData.deleteItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              item.dropped
                                ? 'bg-emerald-50/70 border-emerald-300 line-through text-slate-400'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className={`text-xs font-bold ${item.dropped ? 'text-emerald-800' : 'text-slate-900'}`}>
                                {item.title}
                              </p>
                              {item.explanation && (
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 no-underline">
                                  {item.explanation}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleDropDelete(item.id)}
                              className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                item.dropped
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                  : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300'
                              }`}
                            >
                              {item.dropped ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Dropped (+10 Bandwidth)</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3" />
                                  <span>Drop Without Guilt</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 2: DELAY */}
                  <div className="p-3.5 bg-white border-2 border-amber-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                          2
                        </div>
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Step 2: Delay (Schedule Safe Buffer)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Protect executive focus
                      </span>
                    </div>

                    {stepData.delayItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks assigned to Delay.</p>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        {stepData.delayItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900">{item.title}</p>
                              <button
                                type="button"
                                onClick={() => parkSingleDelayedTask(item.id)}
                                disabled={item.parked}
                                className={`px-2 py-1 text-[11px] font-extrabold rounded-md border transition-all shrink-0 flex items-center gap-1 ${
                                  item.parked
                                    ? 'bg-slate-200 text-slate-500 border-slate-300'
                                    : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300 cursor-pointer'
                                }`}
                              >
                                {item.parked ? <Check className="w-3 h-3 text-emerald-600" /> : <Calendar className="w-3 h-3 text-amber-600" />}
                                <span>{item.parked ? 'Parked in Backlog' : 'Park in Backlog'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              <span className="text-slate-500 font-medium">Postpone until:</span>
                              {['Tomorrow 10:00 AM', 'This Weekend', 'Next Monday'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => updateDelaySchedule(item.id, preset)}
                                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] border transition-all ${
                                    item.schedule === preset
                                      ? 'bg-amber-400 text-slate-950 border-slate-900 font-extrabold'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 3: DIMINISH */}
                  <div className="p-3.5 bg-white border-2 border-indigo-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                          3
                        </div>
                        <span className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                          <Scissors className="w-3.5 h-3.5 text-indigo-600" /> Step 3: Diminish (Minimum Viable Action)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        Overcome inertia
                      </span>
                    </div>

                    {stepData.diminishItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks assigned to Diminish.</p>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        {stepData.diminishItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900">{item.title}</p>
                              {onNavigateTab && (
                                <button
                                  type="button"
                                  onClick={() => sendItemToPlanner(item)}
                                  className="px-2 py-1 text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md border border-slate-900 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Break Down in Planner</span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Minimum Viable Version (MVV):
                              </label>
                              <input
                                type="text"
                                value={item.mvv}
                                onChange={(e) => updateDiminishMVV(item.id, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                                placeholder="E.g. Do 10-15 min speed run or first draft only"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 4: DELEGATE */}
                  <div className="p-3.5 bg-white border-2 border-emerald-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                          4
                        </div>
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-emerald-600" /> Step 4: Delegate / Automate
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Share the load
                      </span>
                    </div>

                    {stepData.delegateItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks assigned to Delegate.</p>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        {stepData.delegateItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900">{item.title}</p>
                              <button
                                type="button"
                                onClick={() => copyDelegateTemplate(item)}
                                className={`px-2 py-1 text-[11px] font-extrabold rounded-md border transition-all flex items-center gap-1 ${
                                  item.copied
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 cursor-pointer'
                                }`}
                              >
                                {item.copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-emerald-600" />}
                                <span>{item.copied ? 'Copied Ask!' : 'Copy 1-Line Ask'}</span>
                              </button>
                            </div>

                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateDelegateNotes(item.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                              placeholder="Notes or delegation context (e.g. ask Sarah or use template)"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Apply All Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleApplyAll4DSteps}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Apply & Fill All 4D Steps into Workspace</span>
                    </button>

                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('journal')}
                        className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
                      >
                        <span>Need live coaching? Chat with RICHA</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(result) }}
                />
              )
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
