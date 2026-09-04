// FILE: src/components/shared/DemoShowcaseBanner.tsx
// Interactive Demo Mode Banner & Walkthrough Showcase Navigator

import React, { useState } from 'react';
import { useDemoMode } from '../../context/DemoModeContext';
import { DashboardTab } from '../../pages/Dashboard';
import {
  Sparkles,
  Zap,
  RefreshCw,
  Layers,
  MessageSquare,
  BookOpen,
  Flame,
  Calendar,
  HeartHandshake,
  LayoutGrid,
  ChevronRight,
  Info,
  X,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface DemoShowcaseBannerProps {
  activeTab: DashboardTab;
  onNavigateTab: (tab: DashboardTab, payload?: any) => void;
  onInjectDemoData?: (tab: DashboardTab) => void;
}

export function DemoShowcaseBanner({
  activeTab,
  onNavigateTab,
  onInjectDemoData
}: DemoShowcaseBannerProps) {
  const { isDemoMode, toggleDemoMode, showcaseData } = useDemoMode();
  const [expandedInfo, setExpandedInfo] = useState(false);

  if (!isDemoMode) return null;

  // Map active tab to showcase metadata
  let currentMeta = showcaseData.planner;
  if (activeTab === 'chat') currentMeta = showcaseData.journal as any;
  else if (activeTab === 'prioritizer') currentMeta = showcaseData.prioritizer as any;
  else if (activeTab === 'kanban') currentMeta = showcaseData.kanban as any;
  else if (activeTab === 'braindump') currentMeta = showcaseData.braindump as any;
  else if (activeTab === 'habits') currentMeta = showcaseData.habits as any;
  else if (activeTab === 'admin') currentMeta = showcaseData.admin as any;
  else if (activeTab === 'wellbeing') currentMeta = showcaseData.wellbeing as any;

  const SHOWCASE_TABS: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Bento Hub', icon: LayoutGrid },
    { id: 'planner', label: '1. Planner', icon: Zap },
    { id: 'prioritizer', label: '2. 4D Triage', icon: RefreshCw },
    { id: 'admin', label: '3. Life Admin', icon: Calendar },
    { id: 'wellbeing', label: '4. Wellbeing', icon: HeartHandshake },
    { id: 'chat', label: '5. Socratic Journal', icon: MessageSquare },
    { id: 'kanban', label: '6. Kanban', icon: Layers },
    { id: 'braindump', label: '7. Bullet Log', icon: BookOpen },
    { id: 'habits', label: 'Habits', icon: Flame }
  ];

  return (
    <div className="mb-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-2 border-slate-900 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden transition-all">
      {/* Decorative ambient shine */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10 pb-3 border-b border-purple-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-purple-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
            <Sparkles className="w-4 h-4 fill-purple-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-purple-950 px-2 py-0.5 rounded-md border border-slate-900">
                Demo Mode Active
              </span>
              <h2 className="text-sm font-extrabold tracking-tight">
                Interactive Feature Showcase & Live Examples
              </h2>
            </div>
            <p className="text-xs text-purple-200 mt-0.5">
              Click any agent below to tour real-world neurodivergent productivity examples.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpandedInfo(!expandedInfo)}
            className="px-3 py-1.5 bg-purple-800/80 hover:bg-purple-700 text-purple-100 font-extrabold text-xs rounded-xl border border-purple-500/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-amber-300" />
            <span>{expandedInfo ? 'Hide Details' : 'What Makes This Special?'}</span>
          </button>

          <button
            type="button"
            onClick={toggleDemoMode}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-rose-900/80 text-slate-300 hover:text-white font-extrabold text-xs rounded-xl border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            title="Exit demo showcase and return to regular mode"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Demo</span>
          </button>
        </div>
      </div>

      {/* Feature Showcase Pills Navigator */}
      <div className="pt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {SHOWCASE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigateTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                isCurrent
                  ? 'bg-amber-400 text-purple-950 font-black border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] scale-102'
                  : 'bg-purple-950/70 hover:bg-purple-800 text-purple-200 border-purple-700/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-purple-950' : 'text-purple-300'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Collapsible Explainer Card */}
      {expandedInfo && currentMeta && (
        <div className="mt-3 p-3.5 bg-purple-950/90 border border-purple-600/50 rounded-xl space-y-2 text-xs text-purple-100">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-amber-300 tracking-wide uppercase text-[11px]">
              {currentMeta.agentBadge}
            </span>
            <span className="text-[10px] text-purple-300 italic">{currentMeta.tagline}</span>
          </div>
          <p className="leading-relaxed">{currentMeta.description}</p>
          <div className="p-2.5 bg-purple-900/60 rounded-lg border border-purple-700/60 flex items-start gap-2 text-amber-200">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="font-medium text-[11px] leading-snug">
              <strong>Example Highlight:</strong> {currentMeta.highlightInsight}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
