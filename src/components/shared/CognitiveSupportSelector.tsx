// FILE: src/components/shared/CognitiveSupportSelector.tsx
// AGENT: Cognitive Support Level & Pacing Selector

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUserStorageItem, setUserStorageItem } from '../../utils/userStorage';
import { Feather, Compass, Cpu, ChevronDown, Check } from 'lucide-react';

export type CognitiveLevel = 'gentle' | 'steady' | 'architect';

interface CognitiveSupportSelectorProps {
  onChangeLevel?: (level: CognitiveLevel) => void;
}

export const COGNITIVE_LEVELS: Record<CognitiveLevel, { title: string; subtitle: string; icon: any; color: string; badge: string }> = {
  gentle: {
    title: 'Gentle Horizon',
    subtitle: 'Low energy & recovery • Sub-10m steps, zero demand',
    icon: Feather,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    badge: '🌿 Gentle'
  },
  steady: {
    title: 'Steady Flow',
    subtitle: 'Standard daily rhythm • 3-card WIP, habit anchors',
    icon: Compass,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    badge: '🌊 Steady'
  },
  architect: {
    title: 'Deep Architecture',
    subtitle: 'High energy sprint • 4D review, deep planning & dump',
    icon: Cpu,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    badge: '⚡ Architect'
  }
};

export function CognitiveSupportSelector({ onChangeLevel }: CognitiveSupportSelectorProps) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [level, setLevel] = useState<CognitiveLevel>('steady');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const stored = getUserStorageItem(uid, 'cognitive_support_level') as CognitiveLevel;
    if (stored && COGNITIVE_LEVELS[stored]) {
      setLevel(stored);
    }
  }, [uid]);

  const handleSelect = (newLevel: CognitiveLevel) => {
    setLevel(newLevel);
    if (uid) {
      setUserStorageItem(uid, 'cognitive_support_level', newLevel);
    }
    if (onChangeLevel) {
      onChangeLevel(newLevel);
    }
    setIsOpen(false);
  };

  const current = COGNITIVE_LEVELS[level];
  const Icon = current.icon;

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50 transition-all text-xs font-bold text-slate-800"
        title="Change Cognitive Support Level"
      >
        <Icon className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline font-extrabold">{current.badge}</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 p-2 space-y-1">
          <div className="px-2.5 py-1.5 border-b border-slate-100">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Cognitive Support Level
            </p>
            <p className="text-[10px] text-slate-400">Adapts pacing and demands to current energy</p>
          </div>

          {(Object.keys(COGNITIVE_LEVELS) as CognitiveLevel[]).map((key) => {
            const item = COGNITIVE_LEVELS[key];
            const ItemIcon = item.icon;
            const isSelected = level === key;

            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`w-full text-left p-2 rounded-xl flex items-start gap-2.5 transition-all ${
                  isSelected ? 'bg-indigo-50/80 border border-indigo-300' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${item.color} mt-0.5`}>
                  <ItemIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">{item.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
