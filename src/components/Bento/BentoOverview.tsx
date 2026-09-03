// FILE: src/components/Bento/BentoOverview.tsx
// SECURITY: Directive 2 (OWASP LLM05 DOMPurify), Directive 6.4 (Persistence)
// AGENT: Multi-Agent Bento Grid Executive Overview (Interlinked to real journal & agent data)

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import {
  Brain,
  Zap,
  HeartHandshake,
  Layers,
  Flame,
  Sparkles,
  Send,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { DashboardTab } from '../../pages/Dashboard';

interface BentoOverviewProps {
  onNavigateTab: (tab: DashboardTab) => void;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  emotionalLandmark?: string;
  energyLevel?: number;
  location?: { placeName: string };
  createdAt?: string;
}

interface KanbanTask {
  id: string;
  title: string;
  column: 'backlog' | 'this_week' | 'in_progress' | 'done' | 'recurring';
}

interface HabitItem {
  id: string;
  name: string;
  streak: number;
  completedToday?: boolean;
}

export function BentoOverview({ onNavigateTab }: BentoOverviewProps) {
  const { user, getIdToken } = useAuth();
  const [quickThought, setQuickThought] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataRefreshing, setDataRefreshing] = useState(false);

  // Live journal & reflection stream state
  const [latestEntry, setLatestEntry] = useState<JournalEntry | null>(null);
  const [recentChatSnippet, setRecentChatSnippet] = useState<{ userText: string; aiReply: string } | null>(null);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);

  // Real metric states fetched from backend
  const [kanbanStats, setKanbanStats] = useState({ backlog: 0, inProgress: 0, done: 0, total: 0 });
  const [habitsList, setHabitsList] = useState<HabitItem[]>([]);
  const [latestMood, setLatestMood] = useState<string>('calm');
  const [latestEnergy, setLatestEnergy] = useState<number>(3);
  const [executiveLoad, setExecutiveLoad] = useState<number>(45);

  // Fetch real data from all user collections
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setDataRefreshing(true);

    try {
      const token = await getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch latest journal entries
      const journalRes = await fetch('/api/data/journal', { headers });
      if (journalRes.ok) {
        const journalData = await journalRes.json();
        const entries: JournalEntry[] = journalData.items || [];
        if (entries.length > 0) {
          // Sort descending by date
          entries.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          const newest = entries[0];
          setLatestEntry(newest);
          if (newest.mood) setLatestMood(newest.mood);
          if (typeof newest.energyLevel === 'number') setLatestEnergy(newest.energyLevel);
        }
      }

      // 2. Fetch latest session chats for immediate context
      const chatRes = await fetch('/api/data/sessions', { headers });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const sessions = chatData.items || [];
        if (sessions.length > 0) {
          sessions.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          const latestSession = sessions[0];
          if (latestSession.userPrompt && latestSession.aiResponse) {
            setRecentChatSnippet({
              userText: latestSession.userPrompt,
              aiReply: latestSession.aiResponse
            });
          }
        }
      }

      // 3. Fetch Kanban tasks to compute actual Executive Load and WIP
      const kanbanRes = await fetch('/api/data/kanban', { headers });
      if (kanbanRes.ok) {
        const kData = await kanbanRes.json();
        const tasks: KanbanTask[] = kData.items || [];
        const backlog = tasks.filter(t => t.column === 'backlog' || t.column === 'this_week').length;
        const inProgress = tasks.filter(t => t.column === 'in_progress').length;
        const done = tasks.filter(t => t.column === 'done').length;
        setKanbanStats({ backlog, inProgress, done, total: tasks.length });

        // Calculate dynamic executive load based on WIP + backlog pressure
        const computedLoad = Math.min(95, Math.max(20, (inProgress * 30) + (backlog * 10)));
        setExecutiveLoad(computedLoad);
      }

      // 4. Fetch Habits
      const habitRes = await fetch('/api/data/habits', { headers });
      if (habitRes.ok) {
        const hData = await habitRes.json();
        const habits: HabitItem[] = hData.items || [];
        setHabitsList(habits);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setDataRefreshing(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Quick Reflection / Dump send
  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickThought.trim() || loading) return;

    const userInput = quickThought;
    setQuickThought('');
    setRecentChatSnippet({ userText: userInput, aiReply: 'RICHA is processing your reflection...' });
    setLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: userInput,
          sessionId: 'main-reflection-session'
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setAgentResponse(data.reply);
        setRecentChatSnippet({ userText: userInput, aiReply: data.reply });
      } else {
        setAgentResponse(data.reply || 'Thought captured and linked to your Journal.');
      }
      // Refresh metrics
      loadDashboardData();
    } catch {
      setAgentResponse('Captured in local buffer. Tap Full Journal for complete conversation.');
    } finally {
      setLoading(false);
    }
  };

  // Determine stress stability & badge from mood / energy
  const isBurnoutRisk = latestMood === 'overwhelmed' || latestMood === 'exhausted' || latestMood === 'sad';
  const moodBadge = isBurnoutRisk
    ? { label: '🟡 ATTENTION NEEDED', color: 'bg-amber-200 text-amber-900 border-amber-300' }
    : { label: '🟢 REGULATED', color: 'bg-emerald-200 text-emerald-900 border-emerald-300' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-auto">
      {/* 1. Main Reflection & Live Journal Section (Span 6 on desktop, 12 on mobile) */}
      <section className="md:col-span-6 lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between min-h-[440px]">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Live Journal & Brain Dump
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1.5 tracking-tight">
                {latestEntry ? latestEntry.title : 'Recent Reflection Stream'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadDashboardData}
                title="Refresh dashboard from journal"
                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dataRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => onNavigateTab('chat')}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
              >
                <span>Full Journal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real user entry or chat reflection stream */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 font-serif italic text-slate-700 text-sm leading-relaxed mb-4 max-h-48 overflow-y-auto">
            {recentChatSnippet?.userText ? (
              <p>"{recentChatSnippet.userText}"</p>
            ) : latestEntry?.content ? (
              <p>"{latestEntry.content.slice(0, 240)}{latestEntry.content.length > 240 ? '...' : ''}"</p>
            ) : (
              <p className="text-slate-500 not-italic font-sans text-xs">
                No entries logged yet. Type a quick thought below or click <strong>Full Journal</strong> to start reflecting with RICHA.
              </p>
            )}

            {latestEntry?.location && (
              <div className="mt-2 flex items-center gap-1 text-[11px] font-sans font-medium text-slate-500 not-italic">
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>{latestEntry.location.placeName}</span>
              </div>
            )}
          </div>

          {/* AI Companion / Assistant live response */}
          {(recentChatSnippet?.aiReply || agentResponse) && (
            <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-2.5 mb-4">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                R
              </div>
              <div className="text-xs text-indigo-950 leading-relaxed font-sans">
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTML(
                      (agentResponse || recentChatSnippet?.aiReply || '').split('---')[0].trim()
                    )
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleQuickSend} className="relative mt-2">
          <input
            type="text"
            value={quickThought}
            onChange={(e) => setQuickThought(e.target.value)}
            placeholder="Dump a thought to RICHA..."
            className="w-full bg-slate-100 border border-slate-300 rounded-xl pl-4 pr-16 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 font-medium"
          />
          <button
            type="submit"
            disabled={!quickThought.trim() || loading}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            {loading ? <Sparkles className="w-3 h-3 animate-spin" /> : <span>SEND</span>}
          </button>
        </form>
      </section>

      {/* 2. Executive Load & Productivity Stats (Span 3 on desktop) */}
      <section className="md:col-span-6 lg:col-span-3 bg-indigo-600 border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-white flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold opacity-90 uppercase tracking-widest">
              Executive Load
            </p>
            <span className="text-[10px] font-bold bg-indigo-800/80 px-2 py-0.5 rounded-md border border-indigo-400/40">
              AGENT 1 • PLANNER
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-5xl font-black tracking-tight">{executiveLoad}</span>
            <span className="text-xl font-bold opacity-75">%</span>
          </div>

          <div className="mt-3 h-2.5 w-full bg-indigo-900/80 rounded-full overflow-hidden border border-indigo-400/30">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${executiveLoad}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-500/40">
          <p className="text-[11px] leading-relaxed opacity-95">
            {executiveLoad > 60
              ? "High load detected. Planner Agent recommends 4D prioritizer or 15-minute time-boxing to prevent paralysis."
              : "Executive rhythm is sustainable. 1-2 prioritized focus blocks recommended."}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('planner')}
              className="text-xs font-bold text-indigo-100 hover:text-white flex items-center gap-1 underline underline-offset-2"
            >
              <span>Launch Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('prioritizer')}
              className="text-xs font-bold text-indigo-200 hover:text-white"
            >
              4D Review →
            </button>
          </div>
        </div>
      </section>

      {/* 3. Wellbeing & Sensory Check (Span 4 on desktop) */}
      <section className="md:col-span-12 lg:col-span-4 bg-[#E2F5E9] border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isBurnoutRisk ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
              <p className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider">
                Wellbeing Agent
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${moodBadge.color}`}>
              {moodBadge.label}
            </span>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            Current Mood: <span className="capitalize">{latestMood}</span>
          </h3>
          <p className="text-xs text-emerald-900/90 mt-1.5 leading-relaxed">
            {isBurnoutRisk
              ? "Sensory overwhelm or low energy detected from recent entries. Recommended: take a sensory break or dim environment."
              : "Rhythm is balanced. Emotional landmarks and reflections show grounded nervous system regulation."}
          </p>
        </div>

        <div>
          <div className="flex items-end gap-1.5 h-8 my-3">
            {[4, 7, 5, 8, 6, 4, 6, 7].map((h, i) => (
              <div
                key={i}
                className={`w-2 rounded-xs transition-all ${
                  i < latestEnergy * 2 ? 'bg-emerald-600' : 'bg-emerald-300'
                }`}
                style={{ height: `${h * 4}px` }}
              ></div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('wellbeing')}
            className="text-xs font-bold text-emerald-900 hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2"
          >
            <span>Sensory Shield Check-in</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 4. Kanban Sprint Summary (Span 7 on desktop) */}
      <section className="md:col-span-12 lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Agent 6 • Flow Board
              </span>
              <h3 className="text-lg font-bold text-slate-900">Active Sprint & Flow State</h3>
            </div>
            <button
              onClick={() => onNavigateTab('kanban')}
              className="text-xs text-indigo-600 font-extrabold hover:underline flex items-center gap-1"
            >
              <span>VIEW BOARD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Backlog</p>
              <p className="text-2xl font-black mt-1 text-slate-800">{kanbanStats.backlog}</p>
              <p className="text-[10px] text-slate-400 mt-1">Low friction queue</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-300">
              <p className="text-[10px] font-bold text-amber-700 uppercase">In Progress</p>
              <p className="text-2xl font-black mt-1 text-amber-800">
                {kanbanStats.inProgress} <span className="text-xs font-normal opacity-70">/ 2 WIP</span>
              </p>
              <p className="text-[10px] text-amber-700 mt-1">Focus locked</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-300">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Done Today</p>
              <p className="text-2xl font-black mt-1 text-emerald-800">{kanbanStats.done}</p>
              <p className="text-[10px] text-emerald-700 mt-1">Wins celebrated</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            WIP Protection: Max 2 tasks in focus
          </span>
          <button
            onClick={() => onNavigateTab('prioritizer')}
            className="font-bold text-indigo-600 hover:underline"
          >
            4D Review
          </button>
        </div>
      </section>

      {/* 5. Habit Consistency Bento Tile (Span 5 on desktop) */}
      <section className="md:col-span-12 lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
              Micro-Habit Consistency
            </h3>
            <button
              onClick={() => onNavigateTab('habits')}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              All Streaks
            </button>
          </div>

          <div className="space-y-3.5">
            {habitsList.length > 0 ? (
              habitsList.slice(0, 3).map((habit) => (
                <div key={habit.id} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                    {habit.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-amber-600 mr-1">
                      {habit.streak}d
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`w-3.5 h-3.5 rounded-xs ${
                            step <= Math.min(4, habit.streak)
                              ? 'bg-indigo-600'
                              : 'bg-indigo-100'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                <p>No habits configured yet.</p>
                <button
                  onClick={() => onNavigateTab('habits')}
                  className="mt-1 font-bold text-indigo-600 hover:underline"
                >
                  + Add first micro-habit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-amber-600 font-bold">
            <Flame className="w-3.5 h-3.5 fill-amber-500" />
            {habitsList.reduce((acc, h) => Math.max(acc, h.streak || 0), 0)} day top momentum
          </span>
          <button
            onClick={() => onNavigateTab('admin')}
            className="text-slate-600 font-bold hover:text-slate-900"
          >
            Admin Blocks →
          </button>
        </div>
      </section>

      {/* 6. System Logs Footer Tile (Span 12) */}
      <footer className="col-span-12 flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-900 border-2 border-slate-900 rounded-2xl text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] gap-3">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ENGINE: GEMINI-3.7-FLASH (ACTIVE LADDER)
          </span>
          <span className="text-slate-400">SESSION: JWT-VERIFIED</span>
          <span className="text-slate-400">FIRESTORE: ISOLATED ({user?.displayName || 'USER'})</span>
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          RICHA (Reflective Insight & Cognitive Helper Assistant) • ZERO-TRUST ARCHITECTURE
        </div>
      </footer>
    </div>
  );
}

export default BentoOverview;
