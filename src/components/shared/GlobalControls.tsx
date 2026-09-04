// FILE: src/components/shared/GlobalControls.tsx
// Two Global Toggles:
// 1. Dark and Light mode toggle
// 2. Demo mode toggle (showcases all features with examples)

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useDemoMode } from '../../context/DemoModeContext';
import { Sun, Moon, Sparkles, Check, Eye } from 'lucide-react';

interface GlobalControlsProps {
  variant?: 'navbar' | 'floating' | 'compact';
  onNavigateTab?: (tab: any) => void;
}

export function GlobalControls({ variant = 'navbar', onNavigateTab }: GlobalControlsProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <div className="flex items-center gap-2">
      {/* Toggle 1: Dark and Light Mode */}
      <button
        id="global-theme-toggle"
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 border-slate-900 transition-all font-bold text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
            : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
        }`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        {isDark ? (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/30" />
            <span className="hidden sm:inline font-extrabold text-[11px] uppercase tracking-wider text-indigo-200">
              Dark
            </span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20" />
            <span className="hidden sm:inline font-extrabold text-[11px] uppercase tracking-wider text-amber-900">
              Light
            </span>
          </>
        )}
      </button>

      {/* Toggle 2: Demo Mode (Showcases all features with examples) */}
      <button
        id="global-demo-mode-toggle"
        type="button"
        onClick={toggleDemoMode}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 border-slate-900 transition-all font-bold text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
          isDemoMode
            ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse-slow ring-2 ring-purple-400/50'
            : isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-white hover:bg-slate-50 text-slate-800'
        }`}
        title={isDemoMode ? 'Turn off Demo Showcase' : 'Turn on Demo Mode: Showcase all features with rich live examples'}
        aria-label="Toggle Demo Mode"
      >
        <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-300' : 'text-purple-600'}`} />
        <div className="flex items-center gap-1">
          <span className="font-extrabold text-[11px] uppercase tracking-wider">
            Demo Mode
          </span>
          <span
            className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-widest ${
              isDemoMode
                ? 'bg-amber-400 text-purple-950 font-black'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isDemoMode ? 'ON' : 'OFF'}
          </span>
        </div>
      </button>
    </div>
  );
}
