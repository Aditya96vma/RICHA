// FILE: src/components/Kanban/KanbanBoard.tsx
// SECURITY: Directive 2 (OWASP A01), Directive 3 (User Isolation)
// AGENT: Kanban Agent (Agent 6) Interactive Board

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
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
  Sparkles
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

export function KanbanBoard() {
  const { getIdToken } = useAuth();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
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

  const fetchCards = async () => {
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
        setCards(data.cards || []);
      }
    } catch (e) {
      console.error('Failed to load kanban cards:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.title.trim()) return;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCard)
      });

      if (res.ok) {
        const data = await res.json();
        setCards((prev) => [data.card, ...prev]);
        setShowAddModal(false);
        setNewCard({
          title: '',
          description: '',
          column: 'this_week',
          domain: 'work',
          estimatedMinutes: 25,
          priority: 'medium'
        });
      }
    } catch (e) {
      console.error('Failed to create card:', e);
    }
  };

  const handleMoveCard = async (cardId: string, destColumn: KanbanCard['column']) => {
    // Check WIP limit on In Progress
    if (destColumn === 'in_progress') {
      const inProgressCount = cards.filter((c) => c.column === 'in_progress').length;
      if (inProgressCount >= 2) {
        alert('⚠️ WIP Limit Alert: Neurodivergent focus protection suggests working on max 2 items at once. Finish or delay an active item first!');
      }
    }

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/kanban/${cardId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ column: destColumn })
      });

      if (res.ok) {
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
      }
    } catch (e) {
      console.error('Failed to move card:', e);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/kanban/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      }
    } catch (e) {
      console.error('Failed to delete card:', e);
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
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed font-medium">
                          {card.description}
                        </p>
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
    </div>
  );
}

export default KanbanBoard;
