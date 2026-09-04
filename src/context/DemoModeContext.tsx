// FILE: src/context/DemoModeContext.tsx
// Global Demo Mode Provider — Showcases all features with rich examples and interactive walkthrough

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEMO_SHOWCASE_DATA, DemoFeatureExample } from '../data/demoShowcaseData';
import { purgeDemoStorage } from '../utils/userStorage';

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
  showcaseData: typeof DEMO_SHOWCASE_DATA;
  activeFeatureTab: string;
  setActiveFeatureTab: (tab: string) => void;
}

const DemoModeContext = createContext<DemoModeContextType | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('richa_demo_mode');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [activeFeatureTab, setActiveFeatureTab] = useState<string>('overview');

  useEffect(() => {
    try {
      localStorage.setItem('richa_demo_mode', isDemoMode ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to persist demo mode state', e);
    }
  }, [isDemoMode]);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoModeState(enabled);
    try {
      localStorage.setItem('richa_demo_mode', enabled ? 'true' : 'false');
      if (!enabled) {
        purgeDemoStorage();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('richa_demo_mode_changed', { detail: { isDemoMode: enabled } }));
      }
    } catch (e) {
      console.warn('Failed to update demo mode state', e);
    }
  };

  const toggleDemoMode = () => {
    setDemoMode(!isDemoMode);
  };

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        setDemoMode,
        showcaseData: DEMO_SHOWCASE_DATA,
        activeFeatureTab,
        setActiveFeatureTab
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextType {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
