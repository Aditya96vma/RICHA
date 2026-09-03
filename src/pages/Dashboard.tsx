// FILE: src/pages/Dashboard.tsx
// SECURITY: Directive 2 (OWASP A01), Directive 3 (User-Isolated Views)
// AGENT: Core Application Dashboard & Multi-Agent Bento Grid Hub

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BentoOverview } from '../components/Bento/BentoOverview';
import { ReflectionChat } from '../components/Journal/ReflectionChat';
import { KanbanBoard } from '../components/Kanban/KanbanBoard';
import { BrainDump } from '../components/BulletJournal/BrainDump';
import { PlannerView } from '../components/Planner/PlannerView';
import { Prioritizer4D } from '../components/Prioritizer/Prioritizer4D';
import { HabitTracker } from '../components/Habits/HabitTracker';
import { LifeAdminView } from '../components/Admin/LifeAdminView';
import { WellbeingView } from '../components/Wellbeing/WellbeingView';
import {
  Brain,
  LayoutGrid,
  MessageSquare,
  Zap,
  RefreshCw,
  Layers,
  BookOpen,
  Flame,
  Calendar,
  HeartHandshake,
  LogOut,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export type DashboardTab =
  | 'overview'
  | 'chat'
  | 'planner'
  | 'prioritizer'
  | 'kanban'
  | 'braindump'
  | 'habits'
  | 'admin'
  | 'wellbeing';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleUserLogout = async () => {
    await logout();
    onLogout();
  };

  const TABS: { id: DashboardTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Bento Grid', icon: LayoutGrid, badge: 'Hub' },
    { id: 'chat', label: 'Journal', icon: MessageSquare, badge: 'Agent 5' },
    { id: 'planner', label: 'Planner', icon: Zap, badge: 'Agent 1' },
    { id: 'prioritizer', label: '4D Review', icon: RefreshCw, badge: 'Agent 2' },
    { id: 'kanban', label: 'Kanban', icon: Layers, badge: 'Agent 6' },
    { id: 'braindump', label: 'Bullet Log', icon: BookOpen, badge: 'Agent 7' },
    { id: 'habits', label: 'Habits', icon: Flame, badge: 'Agent 6' },
    { id: 'admin', label: 'Life Admin', icon: Calendar, badge: 'Agent 3' },
    { id: 'wellbeing', label: 'Wellbeing', icon: HeartHandshake, badge: 'Agent 4' }
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Bento Header Navigation */}
      <nav className="sticky top-0 z-30 bg-white border-b-2 border-slate-900 flex-shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 border-2 border-slate-900 rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-white font-black text-sm">R</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase">
              RICHA <span className="text-indigo-600">Journal</span>
            </h1>
          </div>

          {/* Bento Navigation Bar / Segmented Controls */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border border-slate-900 text-indigo-700 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Profile & Mode Indicator */}
          <div className="flex items-center gap-4 border-l border-slate-200 pl-4 sm:pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-slate-900 tracking-tight">
                {user?.displayName || user?.email || 'Alex Sterling'}
              </p>
              <p className="text-[10px] font-extrabold text-indigo-600 tracking-wider uppercase">
                EXECUTIVE MODE
              </p>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-900 flex items-center justify-center font-bold text-xs text-slate-700 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              {user?.displayName?.charAt(0) || 'U'}
            </div>

            <button
              id="dashboard-logout-btn"
              onClick={handleUserLogout}
              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-300"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-900 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] bg-white"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t-2 border-slate-900 bg-white p-3 space-y-1">
            <div className="grid grid-cols-2 gap-1.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-indigo-50 border-2 border-slate-900 text-indigo-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-600" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'overview' && <BentoOverview onNavigateTab={(t) => setActiveTab(t)} />}
        {activeTab === 'chat' && <ReflectionChat onNavigateTab={(t) => setActiveTab(t)} />}
        {activeTab === 'planner' && <PlannerView />}
        {activeTab === 'prioritizer' && <Prioritizer4D />}
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'braindump' && <BrainDump />}
        {activeTab === 'habits' && <HabitTracker />}
        {activeTab === 'admin' && <LifeAdminView />}
        {activeTab === 'wellbeing' && <WellbeingView />}
      </main>
    </div>
  );
}

export default Dashboard;
