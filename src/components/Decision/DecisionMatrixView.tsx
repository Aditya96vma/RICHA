// FILE: src/components/Decision/DecisionMatrixView.tsx
// AGENT: Decision Matrix & Suggestion Advisor View (Herbert Simon, Chip & Dan Heath, Kahneman & Tversky, Antonio Damasio)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import { sanitizeHTML } from '../../lib/sanitize';
import { getStoredDecision, setStoredDecision } from '../../utils/userStorage';
import {
  Scale,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  Sliders,
  Compass,
  Heart,
  DoorOpen,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  HelpCircle,
  Award
} from 'lucide-react';

interface DecisionMatrixViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
  handoffData?: any;
  onClearHandoff?: () => void;
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
  icon: any;
}

interface OptionItem {
  id: string;
  title: string;
  scores: Record<string, number>; // criterionId -> score (1-5)
}

const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: 'energy',
    name: 'Energy & Cognitive Battery',
    weight: 1.2,
    description: 'Lower nervous system drain & lower friction = 5',
    icon: Zap
  },
  {
    id: 'reversibility',
    name: 'Reversibility (Two-Way Door)',
    weight: 1.0,
    description: 'Easy to undo or pivot without penalty = 5',
    icon: DoorOpen
  },
  {
    id: 'values',
    name: 'Core Values & Authenticity',
    weight: 1.5,
    description: 'Genuine internal desire vs. external guilt = 5',
    icon: Compass
  },
  {
    id: 'relief',
    name: 'Immediate Relief from Freeze',
    weight: 1.1,
    description: 'Breaks deadlock and unlocks forward motion now = 5',
    icon: Heart
  },
  {
    id: 'regret',
    name: '10-Month Regret Minimization',
    weight: 1.3,
    description: 'Suzy Welch 10/10/10 rule: Minimal regret in 10 months = 5',
    icon: Clock
  }
];

const PRESET_DILEMMAS = [
  {
    label: 'Rest vs. Push Through',
    dilemma: 'Should I push through my fatigue to finish my task or pause now to recover my nervous system?',
    optA: 'Push through until finished',
    optB: 'Completely stop and rest',
    optC: '15-minute micro-sprint then guaranteed rest'
  },
  {
    label: 'Saying No vs. Obligation',
    dilemma: 'Should I say yes to an extra request to avoid feeling guilty, or decline to protect my baseline?',
    optA: 'Say yes and take on the load',
    optB: 'Firmly decline with a polite boundary',
    optC: 'Offer a delayed or diminished compromise'
  },
  {
    label: 'Ship Minimum vs. Perfect',
    dilemma: 'Should I ship the rough minimum viable version today or delay until it feels perfect?',
    optA: 'Delay until flawless (Maximizing)',
    optB: 'Ship the 80% good-enough version today (Satisficing)',
    optC: 'Share a private preview with 1 trusted peer first'
  }
];

export const DEMO_DILEMMA = 'Should I push through to finish the quarterly sprint report tonight, or stop now and recover baseline energy?';

export const DEMO_OPTIONS: OptionItem[] = [
  {
    id: 'opt_1',
    title: 'Option A: Push through to finish tonight (Maximizing)',
    scores: { energy: 2, reversibility: 3, values: 4, relief: 2, regret: 3 }
  },
  {
    id: 'opt_2',
    title: 'Option B: Stop now and recover baseline (Self-Care)',
    scores: { energy: 5, reversibility: 5, values: 4, relief: 5, regret: 3 }
  },
  {
    id: 'opt_3',
    title: 'Option C: 15-minute low-stakes trial + shut down (Satisficing)',
    scores: { energy: 4, reversibility: 5, values: 5, relief: 4, regret: 5 }
  }
];

export const DEMO_ANALYSIS = `### ⚖️ Decision Matrix & Cognitive Analysis

**The Dilemma**: "Should I push through to finish the quarterly sprint report tonight, or stop now and recover baseline energy?"

#### 📊 Multi-Criteria Decision Analysis (MCDA)
| Option | Energy Drain (x1.2) | Reversibility (x1.0) | Core Values (x1.5) | Relief (x1.1) | 10-Mo Regret (x1.3) | Weighted Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Option A: Push through to finish tonight** | 2 | 3 | 4 | 2 | 3 | **16.2/25** |
| **Option B: Stop now and recover baseline** | 5 | 5 | 4 | 5 | 3 | **20.8/25** |
| **Option C: 15-minute low-stakes trial + shut down** | 4 | 5 | 5 | 4 | 5 | **23.2/25** |

#### 🧠 Psychological Insights (W.R.A.P. Lens)
- 🚪 **Reversibility Check (Two-Way Door)**: This is a classic Type 2 decision — completely reversible. You do not need to lock in a lifetime commitment; test a small iteration today.
- 🔮 **The 10/10/10 Perspective (Heath & Welch)**:
  * *10 minutes from now*: Immediate relief from breaking the loop of dread and perfectionism.
  * *10 months from now*: You will remember your balanced pacing, not whether this specific hour was maximized.
  * *10 years from now*: This decision reinforces your ability to set compassionate boundaries with hyperfocus.
- 💡 **Satisficing Anchor (Herbert Simon)**: Aim for a "good enough" baseline rather than maximizing every paragraph. Perfectionism is cognitive friction disguised as quality.
- 🪙 **Somatic Gut Check (Antonio Damasio)**: If a coin toss forced you into Option A right now, does your stomach tighten? That somatic response is valuable executive data.

#### 🎯 RICHA's Suggested Path & Recommendation
**Recommended Option**: **Option C: 15-minute low-stakes trial + shut down (Satisficing)**
*Why this path wins*: It breaks executive inertia while fiercely defending your nervous system from burnout. Maximum reversibility and highest value alignment.

**Minimum Viable Commitment (MVC)**:
Open the document, outline the 3 missing bullet points for 15 minutes, then deliberately close your laptop and rest.

---
✅ Done this session: Evaluated decision dilemma via MCDA & cognitive psychology frameworks
🔜 Suggested next step: Commit to the 15-minute MVC and transfer to Micro-Planner
💾 Saved to: Decision Matrix Archive`;

export function DecisionMatrixView({ onNavigateTab, handoffData, onClearHandoff }: DecisionMatrixViewProps) {
  const { user, getIdToken } = useAuth();
  const { isDemoMode } = useDemoMode();

  const [dilemma, setDilemma] = useState(() => {
    if (handoffData?.taskText || handoffData?.contextNotes) {
      return handoffData.taskText || handoffData.contextNotes || '';
    }
    const stored = getStoredDecision(user?.uid, isDemoMode);
    if (stored?.dilemma) return stored.dilemma;
    return isDemoMode ? DEMO_DILEMMA : '';
  });

  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  
  const [options, setOptions] = useState<OptionItem[]>(() => {
    const stored = getStoredDecision(user?.uid, isDemoMode);
    if (stored?.options && stored.options.length > 0) return stored.options;
    return isDemoMode ? DEMO_OPTIONS : [
      {
        id: 'opt_1',
        title: 'Option A: Push through to finish today',
        scores: { energy: 2, reversibility: 3, values: 4, relief: 2, regret: 3 }
      },
      {
        id: 'opt_2',
        title: 'Option B: Stop now and recover baseline',
        scores: { energy: 5, reversibility: 5, values: 4, relief: 5, regret: 3 }
      },
      {
        id: 'opt_3',
        title: 'Option C: 15-minute low-demand trial',
        scores: { energy: 4, reversibility: 5, values: 5, relief: 4, regret: 5 }
      }
    ];
  });

  const [loading, setLoading] = useState(false);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(() => {
    const stored = getStoredDecision(user?.uid, isDemoMode);
    if (stored?.analysis) return stored.analysis;
    return isDemoMode ? DEMO_ANALYSIS : null;
  });

  const [recommendedOption, setRecommendedOption] = useState<string | null>(() => {
    return isDemoMode ? 'Option C: 15-minute low-stakes trial + shut down (Satisficing)' : null;
  });

  const [mvcStep, setMvcStep] = useState<string | null>(() => {
    const stored = getStoredDecision(user?.uid, isDemoMode);
    if (stored?.mvc) return stored.mvc;
    return isDemoMode ? 'Open the document, outline the 3 missing bullet points for 15 minutes, then deliberately close your laptop and rest.' : null;
  });

  const [showCriteriaWeights, setShowCriteriaWeights] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync demo mode transitions
  useEffect(() => {
    if (isDemoMode) {
      if (!dilemma) setDilemma(DEMO_DILEMMA);
      if (!aiAnalysis) setAiAnalysis(DEMO_ANALYSIS);
      if (!mvcStep) setMvcStep('Open the document, outline the 3 missing bullet points for 15 minutes, then deliberately close your laptop and rest.');
    }
  }, [isDemoMode]);

  // Persist decision state updates
  useEffect(() => {
    setStoredDecision(user?.uid, isDemoMode, {
      dilemma,
      options,
      analysis: aiAnalysis || undefined,
      mvc: mvcStep || undefined
    });
  }, [dilemma, options, aiAnalysis, mvcStep, user?.uid, isDemoMode]);

  // Initialize with handoff data if passed from another view
  useEffect(() => {
    if (handoffData?.taskText || handoffData?.contextNotes) {
      const initialText = handoffData.taskText || handoffData.contextNotes || '';
      setDilemma(initialText);
      if (onClearHandoff) onClearHandoff();
    }
  }, [handoffData, onClearHandoff]);

  // Compute weighted score for an option
  const calculateScore = (opt: OptionItem) => {
    let totalScore = 0;
    let maxPossible = 0;
    criteria.forEach((c) => {
      const score = opt.scores[c.id] || 3;
      totalScore += score * c.weight;
      maxPossible += 5 * c.weight;
    });
    return {
      raw: totalScore,
      percentage: Math.round((totalScore / maxPossible) * 100),
      display: totalScore.toFixed(1)
    };
  };

  // Find winning option
  const winningOption = [...options].sort(
    (a, b) => calculateScore(b).raw - calculateScore(a).raw
  )[0];

  const handleScoreChange = (optionId: string, criterionId: string, value: number) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id === optionId) {
          return {
            ...opt,
            scores: {
              ...opt.scores,
              [criterionId]: value
            }
          };
        }
        return opt;
      })
    );
  };

  const handleTitleChange = (optionId: string, title: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === optionId ? { ...opt, title } : opt))
    );
  };

  const handleWeightChange = (criterionId: string, delta: number) => {
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.id === criterionId) {
          const newWeight = Math.max(0.5, Math.min(2.5, +(c.weight + delta).toFixed(1)));
          return { ...c, weight: newWeight };
        }
        return c;
      })
    );
  };

  const applyPreset = (preset: typeof PRESET_DILEMMAS[0]) => {
    setDilemma(preset.dilemma);
    setOptions([
      {
        id: 'opt_1',
        title: preset.optA,
        scores: { energy: 2, reversibility: 3, values: 4, relief: 2, regret: 3 }
      },
      {
        id: 'opt_2',
        title: preset.optB,
        scores: { energy: 5, reversibility: 5, values: 4, relief: 5, regret: 3 }
      },
      {
        id: 'opt_3',
        title: preset.optC,
        scores: { energy: 4, reversibility: 5, values: 5, relief: 4, regret: 5 }
      }
    ]);
    setAiAnalysis(null);
  };

  const handleAnalyzeWithAI = async () => {
    const textToAnalyze = dilemma.trim() || options.map((o) => o.title).join(' vs ');
    if (!textToAnalyze) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 800));
        const demoAnalysis = `### ⚖️ Decision Matrix & Cognitive Analysis

**The Dilemma**: "${textToAnalyze}"

#### 📊 Multi-Criteria Decision Analysis (MCDA)
| Option | Energy Drain (x1.2) | Reversibility (x1.0) | Core Values (x1.5) | Relief (x1.1) | 10-Mo Regret (x1.3) | Weighted Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **${options[0]?.title || 'Option A'}** | 2 | 3 | 4 | 2 | 3 | **16.2/25** |
| **${options[1]?.title || 'Option B'}** | 5 | 5 | 4 | 5 | 3 | **20.8/25** |
| **${options[2]?.title || 'Option C: Hybrid'}** | 4 | 5 | 5 | 4 | 5 | **23.2/25** |

#### 🧠 Psychological Insights (W.R.A.P. Lens)
- 🚪 **Reversibility Check (Two-Way Door)**: This is a classic Type 2 decision — completely reversible. You do not need to lock in a lifetime commitment; test a small iteration today.
- 🔮 **The 10/10/10 Perspective**:
  * *10 minutes from now*: Immense cognitive relief from ending the analysis paralysis loop.
  * *10 months from now*: You will remember your balanced pacing, not whether this specific hour was maximized.
  * *10 years from now*: This decision serves as practice for trusting your internal compass.
- 💡 **Satisficing Anchor**: Herbert Simon's "Good Enough" threshold applies here. Perfection is a cognitive trap.
- 🪙 **Somatic Gut Check**: Flip an imaginary coin. Notice what you hope lands face up before it hits the ground.

#### 🎯 RICHA's Suggested Path & Recommendation
**Recommended Option**: **${options[2]?.title || options[1]?.title}**
*Why this path wins*: It breaks executive inertia while fiercely defending your nervous system from burnout. Maximum reversibility and highest value alignment.

**Minimum Viable Commitment (MVC)**:
Execute the first 15 minutes with zero obligation to continue past the timer.

---
✅ Done this session: Evaluated decision dilemma via MCDA & cognitive psychology frameworks
🔜 Suggested next step: Start the 15-minute low-stakes trial
💾 Saved to: Decision Matrix Archive`;

        setAiAnalysis(demoAnalysis);
        setRecommendedOption(options[2]?.title || options[1]?.title);
        setMvcStep('Execute the first 15 minutes with zero obligation to continue past the timer.');
        return;
      }

      const token = await getIdToken();
      const response = await fetch('/api/decision/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dilemma: textToAnalyze,
          options: options.map((o) => o.title)
        })
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        setAiAnalysis(data.reply);
        if (data.metadata?.recommendedOption) {
          setRecommendedOption(data.metadata.recommendedOption);
        }
        if (data.metadata?.mvc) {
          setMvcStep(data.metadata.mvc);
        }
      } else {
        setStatusMessage(data.message || 'Could not analyze with AI.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWinningToPlanner = () => {
    if (!onNavigateTab) return;
    const task = mvcStep || winningOption.title;
    onNavigateTab('planner', {
      sourceAgent: 'decision',
      taskText: `[Decision Winning Path] ${task}`,
      contextNotes: `Resolved from Decision Matrix dilemma: ${dilemma}`
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111a2e] border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 border-2 border-slate-900 dark:border-slate-700 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] shrink-0">
              <Scale className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Decision Psychology Engine
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Herbert Simon • Chip & Dan Heath • Daniel Kahneman
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Multi-Criteria Decision Matrix & Advisor
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Break analysis paralysis using quantitative Multi-Criteria Decision Analysis (MCDA), Two-Way Doors, and Satisficing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDemoMode && (
              <button
                onClick={() => {
                  setDilemma(DEMO_DILEMMA);
                  setOptions(DEMO_OPTIONS);
                  setAiAnalysis(DEMO_ANALYSIS);
                  setRecommendedOption('Option C: 15-minute low-stakes trial + shut down (Satisficing)');
                  setMvcStep('Open the document, outline the 3 missing bullet points for 15 minutes, then deliberately close your laptop and rest.');
                  setCriteria(DEFAULT_CRITERIA);
                  setStatusMessage('Reset matrix to Demo Showcase scenario.');
                  setTimeout(() => setStatusMessage(null), 3000);
                }}
                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-2 border-indigo-500 rounded-xl text-xs font-extrabold text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(99,102,241,1)]"
                title="Reset to showcase demo state"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Reset Demo Matrix</span>
              </button>
            )}
            <button
              onClick={() => setShowCriteriaWeights(!showCriteriaWeights)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showCriteriaWeights ? 'Hide Weights' : 'Adjust Criteria'}</span>
            </button>
          </div>
        </div>

        {/* Preset dilemma starter chips */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Common Dilemmas:</span>
          </span>
          {PRESET_DILEMMAS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(preset)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-300 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Criteria Weight Adjuster Panel (Collapsible) */}
      {showCriteriaWeights && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Psychological Criteria Importance Weights</span>
            </h3>
            <button
              onClick={() => setCriteria(DEFAULT_CRITERIA)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {criteria.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-[#111a2e] border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-2xs space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {c.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      x{c.weight.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleWeightChange(c.id, -0.1)}
                        className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        title="Decrease weight"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleWeightChange(c.id, 0.1)}
                        className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        title="Increase weight"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dilemma Input Box */}
      <div className="bg-white dark:bg-[#111a2e] border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            1. Describe the Dilemma or Decision You Are Facing
          </label>
          <div className="relative">
            <textarea
              rows={2}
              value={dilemma}
              onChange={(e) => setDilemma(e.target.value)}
              placeholder="e.g. I am torn between spending the next 3 hours cleaning my room or starting my client presentation..."
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
            />
          </div>
        </div>

        {/* The 3 Options Config */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Competing Options (Including the W.R.A.P. Hidden Option C)
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Score 1 (Poor) to 5 (Excellent) on each criterion
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {options.map((opt, idx) => {
              const isLead = opt.id === winningOption.id;
              const scoreData = calculateScore(opt);
              return (
                <div
                  key={opt.id}
                  className={`border-2 rounded-xl p-3.5 transition-all ${
                    isLead
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-[2px_2px_0px_0px_rgba(99,102,241,1)]'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {idx === 2 ? '✨ Option C (Hybrid)' : `Option ${String.fromCharCode(65 + idx)}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isLead && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                          <Award className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Winning</span>
                        </span>
                      )}
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {scoreData.display} pts
                      </span>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={opt.title}
                    onChange={(e) => handleTitleChange(opt.id, e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 mb-3"
                  />

                  {/* Criteria Scoring Chips */}
                  <div className="space-y-2">
                    {criteria.map((c) => {
                      const currentVal = opt.scores[c.id] || 3;
                      return (
                        <div key={c.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px]" title={c.name}>
                            {c.name.split(' ')[0]}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                onClick={() => handleScoreChange(opt.id, c.id, val)}
                                className={`w-5 h-5 rounded text-[10px] font-black transition-all cursor-pointer ${
                                  currentVal === val
                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Action Button Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Leading Choice: <strong>{winningOption.title}</strong> ({calculateScore(winningOption).percentage}% fit)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleAnalyzeWithAI}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Consulting Cognitive Advisor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Psychological Breakdown (/decide)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Psychological Analysis Result Card */}
      {aiAnalysis && (
        <div className="bg-white dark:bg-[#111a2e] border-2 border-indigo-600 dark:border-indigo-500 rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(99,102,241,1)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                R
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  RICHA Decision Advisor • Cognitive Evaluation
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                  Herbert Simon Satisficing • Two-Way Doors • W.R.A.P. Synthesis
                </p>
              </div>
            </div>

            <button
              onClick={handleSendWinningToPlanner}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Send MVC to Planner</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div
            className="prose prose-sm max-w-none dark:prose-invert text-slate-800 dark:text-slate-100 leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(aiAnalysis) }}
          />

          {/* Quick Execution Bridges */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Action Bridges:
              </span>
              <button
                onClick={handleSendWinningToPlanner}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Adopt in Micro-Planner</span>
              </button>

              <button
                onClick={() =>
                  onNavigateTab &&
                  onNavigateTab('chat', {
                    contextNotes: `Decision resolved: ${recommendedOption || winningOption.title}`
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Log Resolution to Journal</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Saved automatically to your sovereign decision record
            </div>
          </div>
        </div>
      )}

      {/* Psychological Toolkit Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111a2e] border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Satisficing vs. Maximizing
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Nobel laureate Herbert Simon proved that maximizing (searching for the single perfect option) creates chronic dread and regret. Satisficing defines "good enough" criteria to unlock immediate action.
          </p>
        </div>

        <div className="bg-white dark:bg-[#111a2e] border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold">
            <DoorOpen className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Two-Way Doors (Reversibility)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Type 1 decisions are irreversible one-way doors. Type 2 decisions are two-way doors: you can step through, test for 24 hours, and step back if needed. Treat almost all daily tasks as Type 2.
          </p>
        </div>

        <div className="bg-white dark:bg-[#111a2e] border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Suzy Welch's 10/10/10 Rule
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Gain immediate emotional distance by asking: How will I feel about this in 10 minutes? In 10 months? In 10 years? This collapses acute panic and puts short-term discomfort into true perspective.
          </p>
        </div>
      </div>
    </div>
  );
}
