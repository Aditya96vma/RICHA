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
import { OverwhelmModal } from '../components/shared/OverwhelmModal';
import { CognitiveSupportSelector } from '../components/shared/CognitiveSupportSelector';
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
  Info,
  Moon
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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [handoffData, setHandoffData] = useState<AgentHandoffPayload | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showOverwhelmModal, setShowOverwhelmModal] = useState(false);

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
    setActionMenuOpen(false);
  };

  const ACTION_TABS: { id: DashboardTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'planner', label: 'Micro-Planner', icon: Zap, desc: 'Sub-20m atomic execution steps' },
    { id: 'prioritizer', label: '4D Review', icon: RefreshCw, desc: 'Minimum Viable Versions (MVV)' },
    { id: 'kanban', label: 'Kanban Flow', icon: Layers, desc: '3-card WIP limit container' },
    { id: 'braindump', label: 'Bullet Log', icon: BookOpen, desc: 'Rapid logging & dump' }
  ];

  const TABS: { id: DashboardTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'chat', label: 'Journal', icon: MessageSquare, badge: 'Hearth' },
    { id: 'overview', label: 'Your Orbit', icon: LayoutGrid, badge: 'Bento' },
    { id: 'habits', label: 'Habits', icon: Flame, badge: 'Anchors' },
    { id: 'wellbeing', label: 'Wellbeing', icon: HeartHandshake, badge: 'Sensory' },
    { id: 'admin', label: 'Life Admin', icon: Calendar, badge: 'Routines' }
  ];

  const isActionTabActive = ACTION_TABS.some((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-30 bg-white border-b-2 border-slate-900 flex-shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => setActiveTab('chat')}
            title="Return to Journal"
          >
            <div className="w-8 h-8 bg-indigo-600 border-2 border-slate-900 rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
              <span className="text-white font-black text-sm">R</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight uppercase leading-none whitespace-nowrap">
              RICHA <span className="text-indigo-600">Journal</span>
            </h1>
          </div>

          {/* Calm 3-Hub Segmented Navigation */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            {/* Primary Hearth (Conversational Journal) */}
            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border border-slate-900 text-indigo-700 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>Journal</span>
            </button>

            {/* Action Space Dropdown Hub */}
            <div className="relative">
              <button
                id="tab-actions-menu"
                onClick={() => setActionMenuOpen(!actionMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActionTabActive
                    ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border border-slate-900 text-indigo-700 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${isActionTabActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>Action Space</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {actionMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 p-2 space-y-1 animate-fadeIn">
                  <div className="px-2.5 py-1 border-b border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Focus & Scaffold Tools
                    </p>
                  </div>
                  {ACTION_TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setActionMenuOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center gap-2.5 transition-all ${
                          isActive ? 'bg-indigo-50/80 border border-indigo-300 font-extrabold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <TabIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{tab.label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight">{tab.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Orbit / Bento Dashboard */}
            <button
              id="tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border border-slate-900 text-indigo-700 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className={`w-3.5 h-3.5 ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>Your Orbit</span>
            </button>

            {/* Satellites */}
            <button
              id="tab-habits"
              onClick={() => setActiveTab('habits')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'habits'
                  ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border border-slate-900 text-indigo-700 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Habits</span>
            </button>

            <button
              id="tab-wellbeing"
              onClick={() => setActiveTab('wellbeing')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'wellbeing'
                  ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] border border-slate-900 text-indigo-700 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
              <span>Wellbeing</span>
            </button>
          </div>

          {/* Right Header: Overwhelm SOS, Global Controls, Cognitive Support Level */}
          <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-3">
            {/* The "I'm Overwhelmed" Single-Tap Safe Harbor */}
            <button
              id="dashboard-overwhelm-btn"
              onClick={() => setShowOverwhelmModal(true)}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs rounded-lg border-2 border-rose-800 shadow-[2px_2px_0px_0px_rgba(159,18,57,1)] flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="Zero-demand calm harbor & somatic vagus reset"
            >
              <Moon className="w-3.5 h-3.5 text-rose-700" />
              <span className="font-extrabold">I'm Overwhelmed</span>
            </button>

            {/* Global Toggles: Theme & Demo Mode */}
            <GlobalControls onNavigateTab={handleNavigateWithHandoff} />

            {/* Cognitive Support Level (Replaces Corporate Executive Mode) */}
            <CognitiveSupportSelector />

            {/* Storage Architecture & Data Sovereignty Trigger */}
            <button
              id="dashboard-storage-btn"
              onClick={() => setShowStorageModal(true)}
              className="hidden md:flex px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 items-center gap-1 cursor-pointer transition-all shrink-0"
              title="How your data is stored, isolated, and protected"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">Storage</span>
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-900 flex items-center justify-center font-bold text-xs text-slate-700 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>

            <button
              id="dashboard-logout-btn"
              onClick={handleUserLogout}
              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-300 shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-900 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] bg-white shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t-2 border-slate-900 bg-white p-3 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Quick Pacing</span>
              <CognitiveSupportSelector />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[...TABS, ...ACTION_TABS].map((tab) => {
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

      {/* The "I'm Overwhelmed" Zero-Demand Calm Harbor */}
      <OverwhelmModal
        isOpen={showOverwhelmModal}
        onClose={() => setShowOverwhelmModal(false)}
        onNavigateTab={handleNavigateWithHandoff}
      />
    </div>
  );
}

export default Dashboard;
