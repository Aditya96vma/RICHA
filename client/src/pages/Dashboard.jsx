// FILE: client/src/pages/Dashboard.jsx
// SECURITY: User Isolation
// AGENT: Dashboard Hub

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { ReflectionChat } from '../components/Journal/ReflectionChat.jsx';
import { KanbanBoard } from '../components/Kanban/KanbanBoard.jsx';
import { Brain, MessageSquare, Layers, LogOut } from 'lucide-react';

export function Dashboard({ onLogout }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('chat');

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-indigo-600" />
          <span className="font-extrabold text-slate-900">ARIA Executive Function Hub</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{user?.displayName || user?.email || 'Guest'}</span>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-lg">
            <LogOut className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-6 py-2 flex gap-2">
        <button
          onClick={() => setTab('chat')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === 'chat' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
        >
          Reflection Journal
        </button>
        <button
          onClick={() => setTab('kanban')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
        >
          Flow Kanban
        </button>
      </div>

      <main className="max-w-6xl w-full mx-auto p-6 flex-1">
        {tab === 'chat' && <ReflectionChat />}
        {tab === 'kanban' && <KanbanBoard />}
      </main>
    </div>
  );
}

export default Dashboard;
