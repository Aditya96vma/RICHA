// FILE: src/components/Habits/HabitTracker.tsx
// SECURITY: Directive 2 (OWASP A01), Directive 3 (User Isolation)
// AGENT: Kanban & Habit Agent (Agent 6)

import React, { useState, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Flame, CheckCircle, Plus, Sparkles, Trophy, Calendar, Trash2 } from 'lucide-react';

interface HabitItem {
  id: string;
  name: string;
  domain: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completedToday?: boolean;
}

const DEFAULT_HABITS: HabitItem[] = [
  { id: 'h1', name: 'Drink full glass of water upon waking', domain: 'self', frequency: 'daily', streak: 5, completedToday: true },
  { id: 'h2', name: '10-minute outdoor sensory walk', domain: 'lifestyle', frequency: 'daily', streak: 3, completedToday: false },
  { id: 'h3', name: 'Check bank balance without anxiety', domain: 'work', frequency: 'weekly', streak: 2, completedToday: false },
  { id: 'h4', name: 'Send 1 low-pressure check-in text', domain: 'contacts', frequency: 'weekly', streak: 4, completedToday: true }
];

export function HabitTracker() {
  const { data: remoteHabits, addDocument, removeDocument, loading: habitsLoading } = useFirestore<HabitItem>('habits');
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [newHabitName, setNewHabitName] = useState('');
  const [newDomain, setNewDomain] = useState('self');
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (remoteHabits && remoteHabits.length > 0) {
      setHabits(remoteHabits);
    }
  }, [remoteHabits]);

  const toggleHabit = async (id: string) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        const nextCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: nextCompleted,
          streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    });
    setHabits(updated);

    const changed = updated.find((h) => h.id === id);
    if (changed) {
      try {
        await addDocument(changed);
      } catch (err) {
        console.warn('Failed to sync habit toggle:', err);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newH: HabitItem = {
      id: `habit_${Date.now()}`,
      name: newHabitName,
      domain: newDomain,
      frequency: newFreq,
      streak: 0,
      completedToday: false
    };

    setHabits((prev) => [newH, ...prev]);
    setNewHabitName('');

    try {
      await addDocument(newH);
    } catch (err) {
      console.warn('Failed to save habit to database:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await removeDocument(id);
    } catch (err) {
      console.warn('Failed to delete habit from database:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bento Tile */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Agent 6 • Micro-Routines
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-indigo-600" />
            <span>Habit & Micro-Routine Momentum</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Gentle habit tracking designed without shame. Build positive reinforcement streaks.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 text-amber-950 rounded-xl text-xs font-extrabold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>Momentum: {habits.reduce((acc, h) => acc + (h.completedToday ? 1 : 0), 0)} / {habits.length} Done Today</span>
        </div>
      </div>

      {/* Add Habit Bento Form */}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="New micro-habit (e.g. 5 deep diaphragmatic breaths)..."
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-medium bg-slate-50 text-slate-900"
        />

        <select
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          className="px-3 py-2 text-xs font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none"
        >
          <option value="self">Self Care</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="work">Work & Focus</option>
          <option value="contacts">Relationships</option>
          <option value="hobbies">Hobbies</option>
        </select>

        <select
          value={newFreq}
          onChange={(e) => setNewFreq(e.target.value as any)}
          className="px-3 py-2 text-xs font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>

        <button
          type="submit"
          disabled={!newHabitName.trim()}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Add Habit</span>
        </button>
      </form>

      {/* Habit List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`p-5 rounded-2xl border-2 border-slate-900 transition-all flex items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] ${
              habit.completedToday
                ? 'bg-emerald-50/90'
                : 'bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleHabit(habit.id)}
                className={`w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center transition-all shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] ${
                  habit.completedToday
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-transparent'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
              </button>

              <div>
                <h4 className={`text-sm font-extrabold ${habit.completedToday ? 'text-slate-700 line-through decoration-emerald-600 decoration-2' : 'text-slate-900'}`}>
                  {habit.name}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-bold">
                  <span className="capitalize px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-slate-700">
                    {habit.domain}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{habit.frequency}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>{habit.streak}d streak</span>
              </div>

              <button
                onClick={() => handleDelete(habit.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-slate-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HabitTracker;
