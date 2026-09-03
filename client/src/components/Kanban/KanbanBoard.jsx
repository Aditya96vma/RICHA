// FILE: client/src/components/Kanban/KanbanBoard.jsx
// SECURITY: User Isolation & Stagnation Detection
// AGENT: Kanban Agent (Agent 6)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Layers, Plus, ArrowRight, ArrowLeft, Trash2, Clock, AlertTriangle } from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'this_week', title: 'This Week' },
  { id: 'in_progress', title: 'In Progress (Max 2)' },
  { id: 'done', title: 'Done' },
  { id: 'recurring', title: 'Recurring' }
];

export function KanbanBoard() {
  const { getIdToken } = useAuth();
  const [cards, setCards] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  const fetchCards = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/kanban', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const token = await getIdToken();
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle, column: 'this_week', domain: 'work', estimatedMinutes: 25 })
      });
      if (res.ok) {
        setNewTitle('');
        fetchCards();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMove = async (cardId, col) => {
    try {
      const token = await getIdToken();
      await fetch(`/api/kanban/${cardId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ column: col })
      });
      fetchCards();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>Interactive Kanban Board</span>
        </h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add quick task..."
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold">
            Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[400px]">
            <h4 className="font-bold text-xs uppercase text-slate-700 mb-2">{col.title}</h4>
            <div className="space-y-2">
              {cards.filter(c => c.column === col.id).map(card => (
                <div key={card.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-xs">
                  {card.isStagnant && <div className="text-rose-600 font-bold mb-1">⚠️ Stuck &gt; 3 days</div>}
                  <div className="font-bold text-slate-800">{card.title}</div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-slate-400">
                    <span>{card.estimatedMinutes || 25}m</span>
                    <div className="flex gap-1">
                      {col.id !== 'backlog' && <button onClick={() => handleMove(card.id, 'backlog')} className="hover:text-slate-800">◀</button>}
                      {col.id !== 'done' && <button onClick={() => handleMove(card.id, 'done')} className="hover:text-slate-800">▶</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KanbanBoard;
