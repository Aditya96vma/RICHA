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
import { GlobalControls } from '../components/shared/GlobalControls';
import { DemoShowcaseBanner } from '../components/shared/DemoShowcaseBanner';
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
  X,
  HardDrive,
  Database,
  Check,
  Download,
  Info
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

export interface AgentHandoffPayload {
  sourceAgent: string;
  targetTab: DashboardTab;
  taskText?: string;
  tasks?: string[];
  contextNotes?: string;
  actionType?: 'send_to_planner' | 'push_to_kanban' | 'log_to_journal' | 'triage_in_4d' | 'sensory_shield';
  timestamp?: number;
}

interface DashboardProps {
  onLogout: () => void;
  key?: React.Key;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [handoffData, setHandoffData] = useState<AgentHandoffPayload | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);

  const handleUserLogout = async () => {
    await logout();
    onLogout();
  };

  const handleNavigateWithHandoff = (tab: DashboardTab, payload?: Partial<AgentHandoffPayload>) => {
    if (payload) {
      setHandoffData({
        sourceAgent: payload.sourceAgent || activeTab,
        targetTab: tab,
        taskText: payload.taskText,
        tasks: payload.tasks,
        contextNotes: payload.contextNotes,
        actionType: payload.actionType,
        timestamp: Date.now()
      });
    }
    setActiveTab(tab);
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

          {/* 2 Global Toggles & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-3 sm:pl-5">
            {/* 2 Global Toggles: 1 for Dark/Light mode, 1 for Demo Mode */}
            <GlobalControls onNavigateTab={handleNavigateWithHandoff} />

            {/* Sensory Shield Fast Action Trigger (Dimension 2) */}
            <button
              id="dashboard-shield-btn"
              onClick={() => setActiveTab('wellbeing')}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="Fast-path Sensory Shield & Overwhelm Protection"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span className="hidden xl:inline">🛡️ Sensory Shield</span>
            </button>

            {/* Storage Architecture & Data Sovereignty Trigger */}
            <button
              id="dashboard-storage-btn"
              onClick={() => setShowStorageModal(true)}
              className="hidden md:flex px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="How your data is stored, isolated, and protected"
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span className="hidden lg:inline">Storage</span>
            </button>

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
          <div className="lg:hidden border-t-2 border-slate-900 bg-white p-3 space-y-3">
            {/* Global Toggles in Mobile Menu */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Toggles</span>
              <GlobalControls onNavigateTab={handleNavigateWithHandoff} />
            </div>

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
        {/* Interactive Demo Showcase Banner with Example Navigation */}
        <DemoShowcaseBanner
          activeTab={activeTab}
          onNavigateTab={(tab) => handleNavigateWithHandoff(tab)}
        />

        {activeTab === 'overview' && (
          <BentoOverview
            onNavigateTab={(t, payload) => handleNavigateWithHandoff(t as DashboardTab, payload)}
          />
        )}
        {activeTab === 'chat' && (
          <ReflectionChat
            onNavigateTab={(t, payload) => handleNavigateWithHandoff(t as DashboardTab, payload)}
            handoffData={handoffData}
          />
        )}
        {activeTab === 'planner' && (
          <PlannerView
            onNavigateTab={(t, payload) => handleNavigateWithHandoff(t as DashboardTab, payload)}
            handoffData={handoffData}
            onClearHandoff={() => setHandoffData(null)}
          />
        )}
        {activeTab === 'prioritizer' && (
          <Prioritizer4D
            onNavigateTab={(t, payload) => handleNavigateWithHandoff(t as DashboardTab, payload)}
            handoffData={handoffData}
            onClearHandoff={() => setHandoffData(null)}
          />
        )}
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'braindump' && (
          <BrainDump
            onNavigateTab={(t, payload) => handleNavigateWithHandoff(t as DashboardTab, payload)}
            handoffData={handoffData}
          />
        )}
        {activeTab === 'habits' && <HabitTracker />}
        {activeTab === 'admin' && <LifeAdminView />}
        {activeTab === 'wellbeing' && <WellbeingView />}
      </main>

      {/* Storage Architecture & Intelligent Journaling Sovereignty Modal */}
      {showStorageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <Database className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    RICHA Storage & Intelligent Journaling Architecture
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Dual-layer persistence, data isolation, and cognitive synthesis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-medium">
              <div className="p-4 bg-indigo-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <h4 className="font-extrabold text-indigo-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-700" />
                  1. How Storage Works (Multi-Layer Cloud + Memory Architecture)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-800">
                  <li><strong>Primary Cloud Persistence</strong>: Powered by Google Cloud Firestore. Every user has an isolated subcollection sandbox: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-[11px] font-mono text-indigo-900">users/{'{uid}'}/[collection]</code>.</li>
                  <li><strong>Stored Collections</strong>: Isolated collections exist for <code className="font-mono">journal</code>, <code className="font-mono">tasks</code>, <code className="font-mono">kanban</code>, <code className="font-mono">habits</code>, <code className="font-mono">prioritizer</code>, <code className="font-mono">socratic_sessions</code>, and <code className="font-mono">synthesized_journal</code>.</li>
                  <li><strong>Row-Level Security</strong>: Backend token verification enforces that users can only read, write, or delete their own documents.</li>
                  <li><strong>Local Resilience Fallback</strong>: If offline or running without cloud credentials, an in-memory document store + local draft auto-saver caches every keystroke so no thought is lost.</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <h4 className="font-extrabold text-amber-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-amber-800" />
                  2. What Makes It &quot;Intelligent Journaling&quot;?
                </h4>
                <p className="text-slate-800 mb-2">
                  Traditional journaling is a passive archive. In RICHA, <strong>Intelligent Journaling</strong> is a living executive engine:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-800">
                  <li><strong>Cross-Tool Synthesis</strong>: It unites 4D Triage decisions, Planner micro-steps, and Socratic dialogues into your reflective record.</li>
                  <li><strong>AI Pattern Detection</strong>: Run 1-click pattern analysis on your entries to uncover recurring cognitive friction, peak energy windows, and task combination traps.</li>
                  <li><strong>Cognitive Reframing</strong>: Identifies perfectionism and all-or-nothing thinking, proposing compassionate micro-adjustments.</li>
                  <li><strong>Socratic Probes of the Day</strong>: Dynamic prompts targeting gentle reflection rather than demanding productivity.</li>
                </ul>
              </div>

              <div className="p-4 bg-emerald-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <h4 className="font-extrabold text-emerald-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  3. Full User Sovereignty & Control
                </h4>
                <p className="text-slate-800">
                  You own 100% of your data. You can review your private Memory Vault in the Journal tab, selectively erase individual memories with one click, or export your full session history anytime.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] uppercase tracking-wider"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
