// FILE: src/components/Kanban/KanbanBoard.tsx
// SECURITY: Directive 2 (OWASP A01), Directive 3 (User Isolation)
// AGENT: Kanban Agent (Agent 6) Interactive Board

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import {
  getUserStorageItem,
  setUserStorageItem,
  removeUserStorageItem,
  emitDataUpdated
} from '../../utils/userStorage';
import { SocraticReasoningFollowUp } from '../shared/SocraticReasoningFollowUp';
import {
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Tag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Flame,
  Layers,
  Sparkles,
  Pause,
  Play,
  ShieldAlert,
  Zap,
  X
} from 'lucide-react';

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  column: 'backlog' | 'this_week' | 'in_progress' | 'done' | 'recurring';
  domain: 'habits' | 'hobbies' | 'work' | 'contacts' | 'lifestyle' | 'self';
  priority?: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  enteredInProgressAt?: string | null;
  isStagnant?: boolean;
  isBlocked?: boolean;
  blockedReason?: string | null;
  createdAt?: string;
}

const COLUMNS: { id: KanbanCard['column']; title: string; color: string; desc: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'border-2 border-slate-900 bg-slate-100', desc: 'Unscheduled ideas' },
  { id: 'this_week', title: 'This Week', color: 'border-2 border-slate-900 bg-indigo-50/70', desc: 'Committed tasks' },
  { id: 'in_progress', title: 'In Progress (Max 2)', color: 'border-2 border-slate-900 bg-amber-50/80', desc: 'WIP limit protection' },
  { id: 'done', title: 'Done', color: 'border-2 border-slate-900 bg-emerald-50/80', desc: 'Celebrated wins' },
  { id: 'recurring', title: 'Recurring', color: 'border-2 border-slate-900 bg-purple-50/70', desc: 'Habits & routines' }
];

const DOMAINS: { id: KanbanCard['domain']; label: string; badge: string }[] = [
  { id: 'work', label: 'Work', badge: 'bg-blue-100 text-blue-900 border border-blue-300' },
  { id: 'habits', label: 'Habits', badge: 'bg-emerald-100 text-emerald-900 border border-emerald-300' },
  { id: 'hobbies', label: 'Hobbies', badge: 'bg-purple-100 text-purple-900 border border-purple-300' },
  { id: 'contacts', label: 'Contacts', badge: 'bg-pink-100 text-pink-900 border border-pink-300' },
  { id: 'lifestyle', label: 'Lifestyle', badge: 'bg-amber-100 text-amber-900 border border-amber-300' },
  { id: 'self', label: 'Self', badge: 'bg-teal-100 text-teal-900 border border-teal-300' }
];

export const DEMO_KANBAN_CARDS: KanbanCard[] = [
  {
    id: 'demo-k-1',
    title: 'Research noise-canceling headphones for open office',
    description: 'Sensory shield tool to block conversational noise and auditory overload during afternoon hours.',
    column: 'backlog',
    domain: 'hobbies',
    priority: 'low',
    estimatedMinutes: 20,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: 'demo-k-2',
    title: 'Reconcile healthcare receipts for tax credit',
    description: 'Collect digital PDF bills from doctor portal and download receipts into Tax 2026 folder.',
    column: 'backlog',
    domain: 'work',
    priority: 'medium',
    estimatedMinutes: 30,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'demo-k-3',
    title: 'Review Q3 Executive Summary slide deck',
    description: 'Check milestone charts and bullet points before tomorrow morning meeting with CEO.',
    column: 'this_week',
    domain: 'work',
    priority: 'high',
    estimatedMinutes: 25,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'demo-k-4',
    title: 'Order weekly grocery essentials (oats, berries, coffee)',
    description: 'Use 3-minute online re-order list to eliminate late-night decision fatigue.',
    column: 'this_week',
    domain: 'lifestyle',
    priority: 'medium',
    estimatedMinutes: 15,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: 'demo-k-5',
    title: 'Finalize & send Client Acme invoices',
    description: 'Currently in progress. 4 steps sliced with Agent 1 (Micro-Step Planner).',
    column: 'in_progress',
    domain: 'work',
    priority: 'high',
    estimatedMinutes: 20,
    enteredInProgressAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'demo-k-6',
    title: 'Morning sunlight & 10m outdoor reset walk',
    description: 'Circadian anchor completed before beginning desk work. Feel refreshed.',
    column: 'done',
    domain: 'habits',
    priority: 'low',
    estimatedMinutes: 10,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'demo-k-7',
    title: 'Pay monthly cloud server bill',
    description: 'Reconciled and receipt archived in drive.',
    column: 'done',
    domain: 'work',
    priority: 'high',
    estimatedMinutes: 5,
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString()
  },
  {
    id: 'demo-k-8',
    title: 'Daily 5:00 PM desktop shutdown ritual',
    description: 'Close all open tabs, wipe keyboard, jot top priority for tomorrow.',
    column: 'recurring',
    domain: 'habits',
    priority: 'medium',
    estimatedMinutes: 15,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export function KanbanBoard() {
  const { user, getIdToken } = useAuth();
  const { isDemoMode } = useDemoMode();
  const uid = user?.uid;
  const [cards, setCards] = useState<KanbanCard[]>(() => {
    if (isDemoMode) {
      try {
        const savedDemo = getUserStorageItem(uid, 'kanban_cards_demo');
        if (savedDemo) {
          const parsed = JSON.parse(savedDemo);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return DEMO_KANBAN_CARDS;
    }
    try {
      const saved = getUserStorageItem(uid, 'kanban_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: KanbanCard) => !c.id.startsWith('demo-k-'));
        }
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  
  // Dimension 6 (Rigid Constraints): WIP Soft Gate & 2-Hour Capacity Override
  const [wipOverrideUntil, setWipOverrideUntil] = useState<number>(() => {
    try {
      const saved = getUserStorageItem(uid, 'wip_override');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [softGateModal, setSoftGateModal] = useState<{
    pendingCardId: string;
    destColumn: KanbanCard['column'];
  } | null>(null);

  const isOverrideActive = Date.now() < wipOverrideUntil;

  const handleActivateOverride = () => {
    const twoHoursLater = Date.now() + 2 * 60 * 60 * 1000;
    setWipOverrideUntil(twoHoursLater);
    setUserStorageItem(uid, 'wip_override', twoHoursLater.toString());
    if (softGateModal) {
      executeMove(softGateModal.pendingCardId, softGateModal.destColumn);
      setSoftGateModal(null);
    }
  };

  const handleClearOverride = () => {
    setWipOverrideUntil(0);
    removeUserStorageItem(uid, 'wip_override');
  };
  const [newCard, setNewCard] = useState<{
    title: string;
    description: string;
    column: KanbanCard['column'];
    domain: KanbanCard['domain'];
    estimatedMinutes: number;
    priority: 'low' | 'medium' | 'high';
  }>({
    title: '',
    description: '',
    column: 'this_week',
    domain: 'work',
    estimatedMinutes: 25,
    priority: 'medium'
  });

  const fetchCards = useCallback(async () => {
    if (isDemoMode) {
      if (cards.length === 0) {
        setCards(DEMO_KANBAN_CARDS);
      }
      setLoading(false);
      return;
    }
    if (!uid) {
      setCards((prev) => prev.filter((c) => !c.id.startsWith('demo-k-')));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/kanban', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cards && data.cards.length > 0) {
          const realOnly = data.cards.filter((c: KanbanCard) => !c.id.startsWith('demo-k-'));
          setCards(realOnly);
        } else {
          setCards([]);
        }
      } else {
        setCards((prev) => prev.filter((c) => !c.id.startsWith('demo-k-')));
      }
    } catch (e) {
      console.error('Failed to load kanban cards:', e);
      setCards((prev) => prev.filter((c) => !c.id.startsWith('demo-k-')));
    } finally {
      setLoading(false);
    }
  }, [uid, getIdToken, isDemoMode, cards.length]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Reactive transition between demo mode and standard user workspace
  useEffect(() => {
    if (isDemoMode) {
      try {
        const savedDemo = getUserStorageItem(uid, 'kanban_cards_demo');
        if (savedDemo) {
          const parsed = JSON.parse(savedDemo);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCards(parsed);
            return;
          }
        }
      } catch {}
      setCards(DEMO_KANBAN_CARDS);
    } else {
      // Exiting demo mode: immediately remove all demo cards
      setCards((prev) => {
        const real = prev.filter((c) => !c.id.startsWith('demo-k-'));
        return real;
      });
      fetchCards();
    }
  }, [isDemoMode, uid]);

  // Persist cards locally in partitioned storage (demo separated from authentic cards)
  useEffect(() => {
    if (isDemoMode) {
      if (cards.length > 0) {
        try {
          setUserStorageItem(uid, 'kanban_cards_demo', JSON.stringify(cards));
        } catch {}
      }
    } else {
      const realCards = cards.filter((c) => !c.id.startsWith('demo-k-'));
      try {
        if (realCards.length > 0) {
          setUserStorageItem(uid, 'kanban_cards', JSON.stringify(realCards));
        } else {
          removeUserStorageItem(uid, 'kanban_cards');
        }
      } catch {}
    }
    emitDataUpdated('kanban');
  }, [cards, uid, isDemoMode]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.title.trim()) return;

    const createdCard: KanbanCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newCard.title.trim(),
      description: newCard.description.trim(),
      column: newCard.column,
      domain: newCard.domain,
      estimatedMinutes: newCard.estimatedMinutes,
      priority: newCard.priority,
      createdAt: new Date().toISOString(),
      enteredInProgressAt: newCard.column === 'in_progress' ? new Date().toISOString() : null
    };

    // Optimistic immediate UI update
    setCards((prev) => [createdCard, ...prev]);
    setShowAddModal(false);
    setNewCard({
      title: '',
      description: '',
      column: 'this_week',
      domain: 'work',
      estimatedMinutes: 25,
      priority: 'medium'
    });

    try {
      const token = await getIdToken();
      await fetch('/api/kanban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCard)
      });
    } catch (e) {
      console.warn('Backend sync notice (card preserved locally):', e);
    }
  };

  const executeMove = async (cardId: string, destColumn: KanbanCard['column']) => {
    // Optimistic immediate UI update
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              column: destColumn,
              enteredInProgressAt: destColumn === 'in_progress' ? new Date().toISOString() : null,
              isStagnant: false
            }
          : c
      )
    );

    try {
      const token = await getIdToken();
      await fetch(`/api/kanban/${cardId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ column: destColumn })
      });
    } catch (e) {
      console.warn('Backend move sync notice (card moved locally):', e);
    }
  };

  const handleMoveCard = async (cardId: string, destColumn: KanbanCard['column']) => {
    // Dimension 6: Soft Gate instead of hard block/alert
    if (destColumn === 'in_progress') {
      const activeInProgress = cards.filter((c) => c.column === 'in_progress' && !c.isBlocked);
      if (activeInProgress.length >= 2 && !isOverrideActive && !activeInProgress.some((c) => c.id === cardId)) {
        setSoftGateModal({ pendingCardId: cardId, destColumn });
        return;
      }
    }

    await executeMove(cardId, destColumn);
  };

  const handleToggleBlock = async (card: KanbanCard) => {
    const nextBlocked = !card.isBlocked;
    // Optimistic immediate UI update
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              isBlocked: nextBlocked,
              blockedReason: nextBlocked ? 'Waiting on external input / reply' : null
            }
          : c
      )
    );

    try {
      const token = await getIdToken();
      await fetch(`/api/kanban/${card.id}/block`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isBlocked: nextBlocked,
          blockedReason: nextBlocked ? 'Waiting on external input / reply' : null
        })
      });
    } catch (e) {
      console.warn('Backend block sync notice (card toggled locally):', e);
    }
  };

  const handleParkAndMove = async (cardToParkId: string) => {
    if (!softGateModal) return;
    await executeMove(cardToParkId, 'backlog');
    await executeMove(softGateModal.pendingCardId, 'in_progress');
    setSoftGateModal(null);
  };

  const handleBlockAndMove = async (cardToBlock: KanbanCard) => {
    if (!softGateModal) return;
    await handleToggleBlock(cardToBlock);
    await executeMove(softGateModal.pendingCardId, 'in_progress');
    setSoftGateModal(null);
  };

  const handleDeleteCard = async (cardId: string) => {
    // Optimistic immediate UI update
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      const token = await getIdToken();
      await fetch(`/api/kanban/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.warn('Backend delete sync notice (card deleted locally):', e);
    }
  };

  const filteredCards = cards.filter(
    (c) => selectedDomain === 'all' || c.domain === selectedDomain
  );

  return (
    <div className="space-y-6">
      {/* Board Header & Domain Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Agent 6 • Neurodivergent Flow
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Executive Flow Kanban & Domain Tracker</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Designed for executive function: WIP limits, time estimates, and stagnation warnings.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedDomain('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-slate-900 transition-all ${
                selectedDomain === 'all'
                  ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  : 'bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              All
            </button>
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDomain(d.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 border-slate-900 transition-all ${
                  selectedDomain === d.id
                    ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            id="add-kanban-card-btn"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex-shrink-0 uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Capacity Override Banner (Dimension 6: No Shame / Flexible Constraint) */}
      {isOverrideActive && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(245,158,11,1)]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                ⚡ 2-Hour Capacity Override Active
              </p>
              <p className="text-xs text-amber-800 font-medium">
                WIP limits are relaxed without penalty or guilt until {new Date(wipOverrideUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>
          </div>
          <button
            onClick={handleClearOverride}
            className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl self-start sm:self-auto transition-all"
          >
            Reset Focus Mode
          </button>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const colCards = filteredCards.filter((c) => c.column === col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl p-4 min-h-[500px] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${col.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{col.title}</h3>
                  <p className="text-[11px] text-slate-600 font-medium">{col.desc}</p>
                </div>
                <span className="w-6 h-6 rounded-full bg-white border-2 border-slate-900 text-slate-900 text-xs font-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                  {colCards.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 mt-2 overflow-y-auto">
                {colCards.map((card) => {
                  const domainInfo = DOMAINS.find((d) => d.id === card.domain);

                  return (
                    <div
                      key={card.id}
                      className={`bg-white p-4 rounded-xl border-2 border-slate-900 transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] relative ${
                        card.isStagnant
                          ? 'bg-rose-50/40 ring-2 ring-rose-400'
                          : ''
                      }`}
                    >
                      {/* Stagnation Badge (>3 days in progress) */}
                      {card.isStagnant && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md mb-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Stuck &gt; 3 days: Too big or blocked?</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${domainInfo?.badge || 'bg-slate-100'}`}>
                          {domainInfo?.label || card.domain}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-bold">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{card.estimatedMinutes || 25}m</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug mb-1">{card.title}</h4>
                      {card.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed font-medium">
                          {card.description}
                        </p>
                      )}

                      {/* Blocked / Waiting on External Indicator */}
                      {card.isBlocked && (
                        <div className="mb-2.5 px-2.5 py-1 bg-purple-100 text-purple-950 border border-purple-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(147,51,234,0.5)]">
                          <Pause className="w-3 h-3 text-purple-700 shrink-0" />
                          <span className="truncate">Waiting On: {card.blockedReason || 'External dependency'}</span>
                        </div>
                      )}

                      {/* Card Actions & Column Movers */}
                      <div className="flex items-center justify-between border-t-2 border-slate-100 pt-2.5 mt-2">
                        <div className="flex items-center gap-1">
                          {col.id !== 'backlog' && (
                            <button
                              onClick={() => {
                                const currentIndex = COLUMNS.findIndex((c) => c.id === col.id);
                                if (currentIndex > 0) {
                                  handleMoveCard(card.id, COLUMNS[currentIndex - 1].id);
                                }
                              }}
                              title="Move left"
                              className="p-1 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {col.id !== 'recurring' && (
                            <button
                              onClick={() => {
                                const currentIndex = COLUMNS.findIndex((c) => c.id === col.id);
                                if (currentIndex < COLUMNS.length - 1) {
                                  handleMoveCard(card.id, COLUMNS[currentIndex + 1].id);
                                }
                              }}
                              title="Move right"
                              className="p-1 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Blocked / Waiting Toggle */}
                          <button
                            onClick={() => handleToggleBlock(card)}
                            title={card.isBlocked ? 'Resume task' : 'Mark as waiting on external reply / input'}
                            className={`p-1 rounded-md border transition-colors ${
                              card.isBlocked
                                ? 'bg-purple-600 text-white border-purple-800'
                                : 'hover:bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {card.isBlocked ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          title="Delete card"
                          className="p-1 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {colCards.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-500 font-bold text-center p-4">
                    Empty column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 animate-fadeIn">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 uppercase tracking-wider">Create New Task Card</h3>

            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule dental appointment"
                  value={newCard.title}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Notes / Micro-steps</label>
                <textarea
                  rows={2}
                  placeholder="Single first step or context"
                  value={newCard.description}
                  onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Life Domain</label>
                  <select
                    value={newCard.domain}
                    onChange={(e) => setNewCard({ ...newCard, domain: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-900 rounded-xl bg-white focus:outline-none font-medium"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Initial Column</label>
                  <select
                    value={newCard.column}
                    onChange={(e) => setNewCard({ ...newCard, column: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-900 rounded-xl bg-white focus:outline-none font-medium"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Time Estimate</label>
                  <select
                    value={newCard.estimatedMinutes}
                    onChange={(e) => setNewCard({ ...newCard, estimatedMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-900 rounded-xl bg-white focus:outline-none font-medium"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={25}>25 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Priority</label>
                  <select
                    value={newCard.priority}
                    onChange={(e) => setNewCard({ ...newCard, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-900 rounded-xl bg-white focus:outline-none font-medium"
                  >
                    <option value="low">Low Energy</option>
                    <option value="medium">Medium</option>
                    <option value="high">High / Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOFT-GATE WIP MODAL (Dimension 6: Rigid Constraint Softening) */}
      {softGateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] border-3 border-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                </span>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Executive Bandwidth Check</h3>
              </div>
              <button
                onClick={() => setSoftGateModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
              You currently have 2 tasks active in progress. Multitasking often introduces cognitive friction, but <strong>you are in full control</strong>. What feels easiest right now?
            </p>

            {/* Currently Active In-Progress Cards */}
            <div className="space-y-2.5 mb-5">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Currently in Progress:</p>
              {cards
                .filter((c) => c.column === 'in_progress' && !c.isBlocked)
                .map((activeCard) => (
                  <div
                    key={activeCard.id}
                    className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{activeCard.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{activeCard.estimatedMinutes || 25}m estimate</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleParkAndMove(activeCard.id)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg transition-all"
                        title="Park this back to Backlog so you can focus on the new task"
                      >
                        Park to Backlog
                      </button>
                      <button
                        onClick={() => handleBlockAndMove(activeCard)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg transition-all"
                        title="Exempt this from active WIP because you are waiting on someone else"
                      >
                        Mark Waiting On
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Third Alternative: 2-Hour Capacity Override (Zero Guilt) */}
            <div className="pt-3 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleActivateOverride}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 text-slate-900" />
                <span>⚡ 2-Hour Capacity Override (No Penalty)</span>
              </button>

              <button
                onClick={() => setSoftGateModal(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Socratic Flow & Resistance Inquiry */}
      <div className="mt-8">
        <SocraticReasoningFollowUp
          agentSource="kanban"
          originalTask={
            cards.filter(c => c.column === 'in_progress').map(c => c.title).join(', ') ||
            cards.filter(c => c.column === 'this_week').map(c => c.title).join(', ') ||
            'Kanban Flow & WIP Management'
          }
          agentOutput="Executive Flow State, WIP Soft-Gating, and Stagnation Prevention"
        />
      </div>
    </div>
  );
}

export default KanbanBoard;
