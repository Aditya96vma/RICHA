// FILE: src/components/Planner/PlannerView.tsx
// SECURITY: Directive 2 (OWASP LLM05 Sanitization), Directive 6.4 (Persistence)
// AGENT: Planner Agent (Agent 1) — Interactive Execution Engine & Time-Blindness Protocol

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { generateHumanExecutionPlan } from '../../utils/humanTaskProcessor';
import { SocraticReasoningFollowUp } from '../shared/SocraticReasoningFollowUp';
import {
  getUserStorageItem,
  setUserStorageItem,
  removeUserStorageItem
} from '../../utils/userStorage';
import {
  Zap,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Target,
  RotateCcw,
  Split,
  Play,
  Pause,
  ListChecks,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Send,
  Volume2,
  VolumeX,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Layers,
  HelpCircle,
  BookOpen,
  ShieldCheck
} from 'lucide-react';

export interface PlanStep {
  id: string;
  title: string;
  action: string;
  timeMinutes: number;
  energy: 'Low' | 'Medium' | 'High';
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
}

export interface PlannerViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
  handoffData?: any;
  onClearHandoff?: () => void;
}

// Gentle Web Audio API synthesizer for neurodivergent completion feedback
function playGentleChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Soothing chime: 528Hz -> 660Hz (solfeggio grounding harmony)
    [528, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      
      gain.gain.setValueAtTime(0, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.7);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.8);
    });
  } catch {
    // Gracefully handle browser autoplay blocks
  }
}

export function PlannerView({ onNavigateTab, handoffData, onClearHandoff }: PlannerViewProps = {}) {
  const { user, getIdToken } = useAuth();
  const { isDemoMode } = useDemoMode();
  const uid = user?.uid;

  // Inputs
  const [taskInput, setTaskInput] = useState(() => {
    return getUserStorageItem(uid, 'planner_task_input') || '';
  });
  const [deadline, setDeadline] = useState('');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [savedToJournal, setSavedToJournal] = useState(false);

  // Incoming Cross-Agent Handoff
  useEffect(() => {
    if (handoffData && handoffData.targetTab === 'planner') {
      if (handoffData.taskText) {
        setTaskInput(handoffData.taskText);
        setToastMessage(`Imported "${handoffData.taskText.slice(0, 32)}..." from ${handoffData.sourceAgent || '4D Prioritizer'}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
      if (onClearHandoff) onClearHandoff();
    }
  }, [handoffData, onClearHandoff]);

  // Plan State & Persistence
  const [planResult, setPlanResult] = useState<string | null>(() => {
    return getUserStorageItem(uid, 'planner_plan_raw') || null;
  });
  const [parsedSteps, setParsedSteps] = useState<PlanStep[]>(() => {
    try {
      const saved = getUserStorageItem(uid, 'planner_steps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [suggestedNextStep, setSuggestedNextStep] = useState<string | null>(() => {
    return getUserStorageItem(uid, 'planner_suggested') || null;
  });

  // UI Modes: 'checklist' | 'single' | 'full'
  const [activeView, setActiveView] = useState<'checklist' | 'single' | 'full'>('checklist');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Loading & Action States
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);
  const [breakingDownStepId, setBreakingDownStepId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendingToKanban, setSendingToKanban] = useState<{ [id: string]: boolean }>({});
  const [kanbanSuccess, setKanbanSuccess] = useState<{ [id: string]: boolean }>({});
  const [allKanbanSending, setAllKanbanSending] = useState(false);

  // Custom step modal
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customStepTitle, setCustomStepTitle] = useState('');
  const [customStepMinutes, setCustomStepMinutes] = useState(15);

  // Built-in Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerInitial, setTimerInitial] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerStepTitle, setTimerStepTitle] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const timerRef = useRef<any>(null);

  // Save steps to user-isolated storage
  const saveSteps = (steps: PlanStep[]) => {
    setParsedSteps(steps);
    if (!isDemoMode) {
      setUserStorageItem(uid, 'planner_steps', JSON.stringify(steps));
    }
  };

  // Demo Mode pre-loader
  const loadDemoPlan = () => {
    const demoTask = 'Submit Quarterly Invoices & Reconcile Healthcare Receipts';
    setTaskInput(demoTask);
    setDeadline('Today by 5:00 PM');
    const demoSteps: PlanStep[] = [
      {
        id: 'demo-step-1',
        title: 'Gather invoices & open billing portal',
        action: 'Log into your invoicing dashboard and open the 3 unpaid draft client contracts.',
        timeMinutes: 10,
        energy: 'Low',
        priority: 'High',
        completed: true
      },
      {
        id: 'demo-step-2',
        title: 'Verify hours worked against Google Calendar',
        action: 'Cross-check the 4 major sprint milestones logged in your calendar notes.',
        timeMinutes: 15,
        energy: 'Medium',
        priority: 'High',
        completed: true
      },
      {
        id: 'demo-step-3',
        title: 'Generate PDF summaries and hit Send',
        action: 'Click "Batch Send" with standard template. Put phone on DND for 5 minutes.',
        timeMinutes: 12,
        energy: 'Low',
        priority: 'High',
        completed: false
      },
      {
        id: 'demo-step-4',
        title: 'File PDF receipts into Cloud folder',
        action: 'Drag downloaded receipts into 2026/Q3 Expenses folder. Take 10 min break.',
        timeMinutes: 8,
        energy: 'Low',
        priority: 'Medium',
        completed: false
      }
    ];
    setParsedSteps(demoSteps);
    setPlanResult(`### Phase 1: Preparation\n* **Gather invoices & open billing portal** (10m, Low Energy)\n* **Verify hours worked against Google Calendar** (15m, Medium Energy)\n\n### Phase 2: Execution\n* **Generate PDF summaries and hit Send** (12m, Low Energy)\n* **File PDF receipts into Cloud folder** (8m, Low Energy)`);
    setSuggestedNextStep('Generate PDF summaries and hit Send');
    setToastMessage('✓ Loaded Agent 1 Demo Showcase Plan!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auto-mount or auto-clear demo plan based on Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      if (parsedSteps.length === 0 && !planResult) {
        loadDemoPlan();
      }
    } else {
      // Switched off demo mode: if current plan is the demo plan, clear it!
      const isCurrentlyDemo =
        taskInput === 'Submit Quarterly Invoices & Reconcile Healthcare Receipts' ||
        parsedSteps.some((s) => s.id.startsWith('demo-step-'));
      if (isCurrentlyDemo) {
        setTaskInput('');
        setDeadline('');
        setParsedSteps([]);
        setPlanResult(null);
        setSuggestedNextStep(null);
        setCurrentStepIndex(0);
        removeUserStorageItem(uid, 'planner_task_input');
        removeUserStorageItem(uid, 'planner_task');
        removeUserStorageItem(uid, 'planner_steps');
        removeUserStorageItem(uid, 'planner_result');
        removeUserStorageItem(uid, 'planner_plan_raw');
        removeUserStorageItem(uid, 'planner_suggested');
      }
    }
  }, [isDemoMode, parsedSteps, planResult, taskInput, uid]);

  // Sync with remote plan if available for this specific authenticated user
  useEffect(() => {
    let isMounted = true;
    async function loadRemotePlan() {
      if (!uid) return;
      try {
        const token = await getIdToken();
        const res = await fetch('/api/data/planner', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          const items = data.items || [];
          const active = items.find((i: any) => i.id === 'active_plan') || items[0];
          if (active && (!parsedSteps || parsedSteps.length === 0) && !taskInput) {
            if (active.taskInput) setTaskInput(active.taskInput);
            if (active.planResult) setPlanResult(active.planResult);
            if (active.steps && Array.isArray(active.steps)) setParsedSteps(active.steps);
            if (active.suggestedNextStep) setSuggestedNextStep(active.suggestedNextStep);
          }
        }
      } catch (e) {
        // silent fallback
      }
    }
    loadRemotePlan();
    return () => { isMounted = false; };
  }, [uid, getIdToken]);

  // Timer interval hook
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerRunning(false);
            if (soundEnabled) playGentleChime();
            setToastMessage('🎉 Timer complete! Great work honoring your focus time.');
            setTimeout(() => setToastMessage(null), 5000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerSeconds, soundEnabled]);

  // Robust step extraction that dynamically works directly on the user's input and model markdown
  const extractSteps = (text: string, originalTask: string): PlanStep[] => {
    const lines = text.split('\n');
    const steps: PlanStep[] = [];
    let currentStep: Partial<PlanStep> | null = null;

    const IGNORE_PATTERNS = [
      'perfectionism', 'minimum viable', 'done this session', 'saved to:', 
      'suggested next step', 'quick tips', 'for success', 'one-touch rule',
      'overview', 'summary', 'context', 'footer'
    ];

    const ATTRIBUTE_KEYS = [
      'action', 'goal', 'time', 'time-box', 'duration', 'energy', 'energy level', 'priority', 'tools', 'note', 'notes'
    ];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      const lower = trimmed.toLowerCase();
      if (IGNORE_PATTERNS.some((p) => lower.includes(p))) continue;

      // Check for attribute line (e.g. * **Action:** ... or **Time:** 30 min)
      const attrMatch = trimmed.match(/^(?:(?:\*|-|\d+\.))\s*\*\*?([a-zA-Z\s-]+?)(?::\*\*|\*\*:|\*\*|:)\s*(.+)$/i) ||
                        trimmed.match(/^\*\*?([a-zA-Z\s-]+?)(?::\*\*|\*\*:|\*\*|:)\s*(.+)$/i);

      if (attrMatch) {
        const key = attrMatch[1].trim().toLowerCase();
        const val = attrMatch[2].trim();

        if (ATTRIBUTE_KEYS.some((k) => key === k || key.startsWith(k))) {
          if (currentStep) {
            if (key.includes('action') || key.includes('goal')) {
              const cleanVal = val.replace(/[*_`]/g, '').trim();
              if (currentStep.action && currentStep.action !== currentStep.title) {
                currentStep.action += ' ' + cleanVal;
              } else {
                currentStep.action = cleanVal;
              }
            }
            if (key.includes('time') || key.includes('duration')) {
              const tm = val.match(/(\d+)\s*(?:min|minute|hour|hr)/i);
              if (tm) {
                const num = parseInt(tm[1], 10);
                currentStep.timeMinutes = tm[0].toLowerCase().includes('hour') || tm[0].toLowerCase().includes('hr') ? num * 60 : num;
              }
            }
            if (key.includes('energy')) {
              const em = val.match(/(low|med|medium|high)/i);
              if (em) {
                const e = em[1].toLowerCase();
                currentStep.energy = (e.startsWith('med') ? 'Medium' : e.charAt(0).toUpperCase() + e.slice(1)) as any;
              }
            }
            if (key.includes('priority')) {
              const pm = val.match(/(low|med|medium|high)/i);
              if (pm) {
                const p = pm[1].toLowerCase();
                currentStep.priority = (p.startsWith('med') ? 'Medium' : p.charAt(0).toUpperCase() + p.slice(1)) as any;
              }
            }
          }
          continue;
        }
      }

      // Header Match:
      // ### **Phase 1: Title** or ### Phase 1: Title or ## Step 1 - Title or # 1. Title
      const headerMatch = trimmed.match(/^#{1,4}\s*(?:\*\*)?(?:(?:Phase|Step|Block|Part)\s*(\d+|[A-Z])(?::|\.|\s*-)?\s*([^*#]+)|\d+\.\s*([^*#]+)|([^*#]+))(?:\*\*)?$/i);

      // Bullet Step Match:
      // * **Phase 1: Title** or 1. **Phase 1: Title** or * **Step 1 - Title**
      const bulletPhaseMatch = trimmed.match(/^(?:(?:\*|-|\d+\.))\s*\*\*(?:Phase|Step|Block|Part)\s*(\d+|[A-Z])(?::|\.|\s*-)?\s*([^*]+)\*\*(.*)$/i);

      // Bold title at bullet start:
      let boldStepMatch = null;
      if (!headerMatch && !bulletPhaseMatch) {
        const bMatch = trimmed.match(/^(?:(?:\*|-|\d+\.))\s*\*\*([^*:]+)\*\*(.*)$/);
        if (bMatch) {
          const candidateTitle = bMatch[1].trim().toLowerCase();
          if (!ATTRIBUTE_KEYS.some((k) => candidateTitle === k || candidateTitle.startsWith(k))) {
            boldStepMatch = bMatch;
          }
        }
      }

      if (headerMatch || bulletPhaseMatch || boldStepMatch) {
        if (currentStep && currentStep.title) {
          steps.push(currentStep as PlanStep);
        }

        let rawTitle = '';
        let rest = '';

        if (headerMatch) {
          rawTitle = (headerMatch[2] || headerMatch[3] || headerMatch[4] || headerMatch[0]).replace(/[*#_`]/g, '').trim();
        } else if (bulletPhaseMatch) {
          rawTitle = (bulletPhaseMatch[2] ? bulletPhaseMatch[2].trim() : `Step ${bulletPhaseMatch[1]}`).replace(/[*#_`]/g, '').trim();
          rest = bulletPhaseMatch[3] || '';
        } else if (boldStepMatch) {
          rawTitle = boldStepMatch[1].replace(/[*#_`]/g, '').trim();
          rest = boldStepMatch[2] || '';
        }

        // Skip non-step headings
        const rawTitleLower = rawTitle.toLowerCase();
        if (IGNORE_PATTERNS.some((p) => rawTitleLower.includes(p)) || rawTitleLower.length < 2) {
          continue;
        }

        const combined = (trimmed + ' ' + rest).replace(/[*#_`]/g, '');
        const timeMatch = combined.match(/(\d+)\s*(?:min|minute|hour|hr)/i);
        let timeMinutes = 15;
        if (timeMatch) {
          const num = parseInt(timeMatch[1], 10);
          timeMinutes = timeMatch[0].toLowerCase().includes('hour') || timeMatch[0].toLowerCase().includes('hr') ? num * 60 : num;
        }
        const energyMatch = combined.match(/energy(?:\s*level)?:\s*(low|med|medium|high)/i) || combined.match(/\b(low|medium|high)\s+energy\b/i);
        let energy: 'Low' | 'Medium' | 'High' = 'Medium';
        if (energyMatch) {
          const e = (energyMatch[1] || '').toLowerCase();
          energy = (e.startsWith('med') ? 'Medium' : e.charAt(0).toUpperCase() + e.slice(1)) as any;
        }
        const priorityMatch = combined.match(/priority:\s*(low|med|medium|high)/i);
        let priority: 'Low' | 'Medium' | 'High' = 'Medium';
        if (priorityMatch) {
          const p = priorityMatch[1].toLowerCase();
          priority = (p.startsWith('med') ? 'Medium' : p.charAt(0).toUpperCase() + p.slice(1)) as any;
        }

        currentStep = {
          id: `step_${Date.now()}_${steps.length + 1}`,
          title: rawTitle.replace(/^Phase\s*\d+:?\s*/i, '').replace(/^Step\s*\d+:?\s*/i, '').trim() || rawTitle,
          action: rawTitle,
          timeMinutes,
          energy,
          priority,
          completed: false
        };
        continue;
      }

      // Sub-bullet descriptive detail for the active step
      if (currentStep && (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•'))) {
        const cleanSub = trimmed.replace(/^[\s*•-]+/, '').replace(/[*_`]/g, '').trim();
        if (cleanSub.length > 5 && !IGNORE_PATTERNS.some((p) => cleanSub.toLowerCase().includes(p))) {
          if (currentStep.action && currentStep.action !== currentStep.title) {
            currentStep.action += ' • ' + cleanSub;
          } else {
            currentStep.action = cleanSub;
          }
        }
      }
    }

    if (currentStep && currentStep.title) {
      steps.push(currentStep as PlanStep);
    }

    // Secondary fallback: Parse standard bullet lines
    if (steps.length === 0) {
      for (const line of lines) {
        const m = line.trim().match(/^(?:(?:\*|-|\d+\.))\s*(.+)$/);
        if (
          m &&
          m[1] &&
          m[1].length > 8 &&
          !IGNORE_PATTERNS.some((p) => m[1].toLowerCase().includes(p))
        ) {
          const clean = m[1].replace(/[*#_`]/g, '').trim();
          const timeMatch = clean.match(/(\d+)\s*(?:min|minute)/i);
          steps.push({
            id: `step_${Date.now()}_${steps.length + 1}`,
            title: `Step ${steps.length + 1}`,
            action: clean,
            timeMinutes: timeMatch ? parseInt(timeMatch[1], 10) : 15,
            energy: 'Medium',
            priority: 'Medium',
            completed: false
          });
        }
      }
    }

    // Ensure action field exists
    for (const s of steps) {
      if (!s.action) s.action = s.title;
    }

    // Check if parsed steps contain robotic/generic jargon
    const hasRoboticJargon = steps.some(s => 
      (s.action && (s.action.toLowerCase().includes('primary deliverable') || s.action.toLowerCase().includes('central deliverable') || s.action.toLowerCase().includes('prep environment for'))) ||
      (s.title && (s.title.toLowerCase().includes('primary deliverable') || s.title.toLowerCase().includes('prep & environment for')))
    );

    // Dynamic, task-grounded human execution plan if parsing produced 0 steps or contained robotic jargon
    if (steps.length === 0 || hasRoboticJargon) {
      const humanPlan = generateHumanExecutionPlan(originalTask);
      return humanPlan.phases.map(p => ({
        id: p.id,
        title: p.title,
        action: p.action,
        timeMinutes: p.timeMinutes,
        energy: p.energy,
        priority: p.priority,
        completed: p.completed
      }));
    }

    return steps;
  };

  // Submit Plan Request
  const handlePlanTask = async (e?: React.FormEvent, presetTask?: string) => {
    if (e) e.preventDefault();
    const taskToPlan = presetTask || taskInput;
    if (!taskToPlan.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);
    const payloadPrompt = `TASK TO PLAN:\nTask: ${taskToPlan}\nDeadline: ${deadline || 'Not specified'}\nUser Energy Level: ${energyLevel}\nPlease break this down into 15/25/45-minute blocks with time-boxing and give me ONE next step.`;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: payloadPrompt,
          sessionId: 'planner-session',
          contextHint: 'planning_request'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (isDemoMode || !data.reply) {
          const humanPlan = generateHumanExecutionPlan(taskToPlan);
          const formattedFallback = humanPlan.phases.map(p => `### ${p.title} (${p.timeMinutes} min | ${p.energy} Energy)\n* **Action:** ${p.action}`).join('\n\n');
          setPlanResult(formattedFallback);
          saveSteps(humanPlan.phases.map(p => ({
            id: p.id,
            title: p.title,
            action: p.action,
            timeMinutes: p.timeMinutes,
            energy: p.energy,
            priority: p.priority,
            completed: p.completed
          })));
          const firstAction = humanPlan.phases[0]?.title || 'Begin step 1';
          setSuggestedNextStep(firstAction);
          setCurrentStepIndex(0);
          setActiveView('checklist');
          return;
        }
        setErrorInfo({ message: data.message || 'Failed to generate task plan.' });
        if (data.reply) setPlanResult(data.reply);
        return;
      }

      setPlanResult(data.reply);
      setUserStorageItem(uid, 'planner_plan_raw', data.reply);
      setUserStorageItem(uid, 'planner_task_input', taskToPlan);

      // Extract structured steps
      let steps: PlanStep[] = [];
      if (data.metadata?.steps && Array.isArray(data.metadata.steps) && data.metadata.steps.length > 0) {
        steps = data.metadata.steps.map((s: any, idx: number) => ({
          id: s.id || `step_${Date.now()}_${idx}`,
          title: s.title || `Step ${idx + 1}`,
          action: s.action || s.title || '',
          timeMinutes: s.timeMinutes || 15,
          energy: s.energy || 'Medium',
          priority: s.priority || 'Medium',
          completed: false
        }));

        // Guard against any leftover robotic jargon in backend response
        const hasRobotic = steps.some(s => 
          s.action.toLowerCase().includes('primary deliverable') || 
          s.action.toLowerCase().includes('central deliverable') ||
          s.title.toLowerCase().includes('primary deliverable')
        );
        if (hasRobotic) {
          steps = extractSteps(data.reply, taskToPlan);
        }
      } else {
        steps = extractSteps(data.reply, taskToPlan);
      }

      saveSteps(steps);

      // Extract suggested next step
      let nextStep = data.metadata?.suggestedNextStep || null;
      if (!nextStep) {
        const match = data.reply.match(/🔜\s*Suggested\s+next\s+step:\s*([^\n]+)/i);
        if (match) nextStep = match[1].replace(/[*#_`[\]]/g, '').trim();
      }
      setSuggestedNextStep(nextStep);
      if (nextStep) setUserStorageItem(uid, 'planner_suggested', nextStep);

      // Async cloud sync for logged-in users
      try {
        const token = await getIdToken();
        fetch('/api/data/planner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: 'active_plan',
            taskInput: taskToPlan,
            planResult: data.reply,
            steps,
            suggestedNextStep: nextStep,
            updatedAt: new Date().toISOString()
          })
        }).catch(() => {});
      } catch (e) {
        // Silent background sync
      }

      setCurrentStepIndex(0);
      setActiveView('checklist');
    } catch (err: any) {
      if (isDemoMode) {
        const humanPlan = generateHumanExecutionPlan(taskToPlan);
        const formattedFallback = humanPlan.phases.map(p => `### ${p.title} (${p.timeMinutes} min | ${p.energy} Energy)\n* **Action:** ${p.action}`).join('\n\n');
        setPlanResult(formattedFallback);
        saveSteps(humanPlan.phases.map(p => ({
          id: p.id,
          title: p.title,
          action: p.action,
          timeMinutes: p.timeMinutes,
          energy: p.energy,
          priority: p.priority,
          completed: p.completed
        })));
        const firstAction = humanPlan.phases[0]?.title || 'Begin step 1';
        setSuggestedNextStep(firstAction);
        setCurrentStepIndex(0);
        setActiveView('checklist');
      } else {
        setErrorInfo({ message: err.message || 'Network error.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle step completion
  const handleToggleComplete = (stepId: string) => {
    const updated = parsedSteps.map((s) => {
      if (s.id === stepId) {
        const nextState = !s.completed;
        if (nextState && soundEnabled) {
          playGentleChime();
        }
        return { ...s, completed: nextState };
      }
      return s;
    });
    saveSteps(updated);
  };

  // Start Focus Timer for a step
  const handleStartTimer = (title: string, minutes: number) => {
    const secs = minutes * 60;
    setTimerInitial(secs);
    setTimerSeconds(secs);
    setTimerStepTitle(title);
    setTimerRunning(true);
    setToastMessage(`⏱️ Started ${minutes}-minute timer for: "${title}"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Send single step to Kanban
  const handleSendToKanban = async (step: PlanStep) => {
    setSendingToKanban((prev) => ({ ...prev, [step.id]: true }));
    try {
      const token = await getIdToken();
      // Infer domain from task
      const t = taskInput.toLowerCase();
      const domain = (t.includes('clean') || t.includes('room') || t.includes('bath') || t.includes('shower') || t.includes('chore') || t.includes('cook') || t.includes('dish'))
        ? 'lifestyle'
        : (t.includes('meditat') || t.includes('exercise') || t.includes('habit'))
        ? 'habits'
        : 'work';

      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `${step.title}: ${step.action.slice(0, 120)}`,
          description: step.action,
          column: 'this_week',
          domain,
          timeEstimateMinutes: step.timeMinutes,
          priority: step.priority.toLowerCase() === 'high' ? 'high' : step.priority.toLowerCase() === 'low' ? 'low' : 'medium'
        })
      });

      if (res.ok) {
        setKanbanSuccess((prev) => ({ ...prev, [step.id]: true }));
        setToastMessage(`✓ Added "${step.title}" to Kanban board!`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.warn('Kanban send failed:', err);
    } finally {
      setSendingToKanban((prev) => ({ ...prev, [step.id]: false }));
    }
  };

  // Send all remaining incomplete steps to Kanban
  const handleSendAllToKanban = async () => {
    const incomplete = parsedSteps.filter((s) => !s.completed);
    if (incomplete.length === 0) return;
    setAllKanbanSending(true);

    try {
      const token = await getIdToken();
      for (const step of incomplete) {
        await fetch('/api/kanban', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: `${step.title}: ${step.action.slice(0, 120)}`,
            description: step.action,
            column: 'this_week',
            domain: 'lifestyle',
            timeEstimateMinutes: step.timeMinutes,
            priority: 'medium'
          })
        });
      }
      setToastMessage(`✓ Successfully added all ${incomplete.length} steps to Kanban!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.warn('Batch Kanban send failed:', err);
    } finally {
      setAllKanbanSending(false);
    }
  };

  // "Too Hard, Make Smaller" handler
  const handleMakeSmaller = async (stepId: string) => {
    const step = parsedSteps.find((s) => s.id === stepId);
    if (!step) return;
    setBreakingDownStepId(stepId);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: `This step is too intimidating or mentally heavy: "${step.action || step.title}". Break it down into 2 or 3 frictionless, micro-actions that take under 2 minutes each.`,
          sessionId: 'planner-session',
          contextHint: 'planning_request'
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const microSteps = extractSteps(data.reply, taskInput);
        if (microSteps.length > 0) {
          const stepIndex = parsedSteps.findIndex((s) => s.id === stepId);
          const newSteps = [...parsedSteps];
          newSteps.splice(stepIndex, 1, ...microSteps);
          saveSteps(newSteps);
          setToastMessage(`✓ Chunked "${step.title}" into smaller micro-actions!`);
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    } catch (err) {
      console.warn('Failed to break down step further:', err);
    } finally {
      setBreakingDownStepId(null);
    }
  };

  // Add custom micro-step
  const handleAddCustomStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStepTitle.trim()) return;
    const newStep: PlanStep = {
      id: `step_${Date.now()}`,
      title: customStepTitle.trim(),
      action: customStepTitle.trim(),
      timeMinutes: customStepMinutes,
      energy: 'Low',
      priority: 'Medium',
      completed: false
    };
    saveSteps([...parsedSteps, newStep]);
    setCustomStepTitle('');
    setShowAddCustom(false);
    setToastMessage('✓ Added custom micro-step!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Reset plan to start fresh
  const handleStartFresh = () => {
    setPlanResult(null);
    setParsedSteps([]);
    setSuggestedNextStep(null);
    setTaskInput('');
    setDeadline('');
    setTimerRunning(false);
    setTimerSeconds(0);
    removeUserStorageItem(uid, 'planner_plan_raw');
    removeUserStorageItem(uid, 'planner_steps');
    removeUserStorageItem(uid, 'planner_task_input');
    removeUserStorageItem(uid, 'planner_suggested');
  };

  // Helper formatting for timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Cross-agent: Send to 4D Prioritizer
  const handleSendTo4DReview = () => {
    if (!onNavigateTab) return;
    onNavigateTab('prioritizer', {
      sourceAgent: 'planner',
      taskText: taskInput,
      contextNotes: 'Transferred from Planner for Morgenstern 4D triage'
    });
  };

  // Cross-agent: Save Plan to Intelligent Journal
  const handleSavePlanToJournal = async () => {
    if (savedToJournal) return;
    try {
      const token = await getIdToken();
      const planSummary = `### 📋 Interactive Action Plan\n**Goal**: ${taskInput}\n\n**Steps**:\n${parsedSteps.map((s, idx) => `${idx + 1}. **${s.title}** (${s.timeMinutes}m, Energy: ${s.energy}) — ${s.action} ${s.completed ? '✅' : '⏳'}`).join('\n')}\n\n*Saved from Planner on ${new Date().toLocaleDateString()}*`;

      const res = await fetch('/api/data/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryText: planSummary,
          mood: 'determined',
          tags: ['planner', 'action-plan', 'executive-steps'],
          sentimentScore: 0.8
        })
      });

      if (res.ok) {
        setSavedToJournal(true);
        setToastMessage('Saved plan to your Intelligent Journal!');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.warn('Failed to save plan to journal:', err);
      setToastMessage('Saved to local draft.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const completedCount = parsedSteps.filter((s) => s.completed).length;
  const progressPercent = parsedSteps.length > 0 ? Math.round((completedCount / parsedSteps.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-3 text-xs font-black animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Demo Mode Showcase Callout Banner */}
      {isDemoMode && (
        <div className="p-4 rounded-2xl bg-purple-950 text-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Agent 1 Demo Showcase Active</p>
              <p className="text-xs text-purple-200">
                Explore a live 4-step invoice plan with interactive check-offs, 15m timer, and Next-Action prompts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDemoPlan}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
          >
            <span>Load Demo Plan</span>
            <Zap className="w-3.5 h-3.5 fill-purple-950" />
          </button>
        </div>
      )}

      {/* Header Bento Tile */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Agent 1 • Execution Engine
            </span>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              ADHD / Time-Blindness Friendly
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <span>Planner & Task Execution Dashboard</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Turn paralyzing chores & projects into friction-free, time-boxed micro-actions with integrated focus timers.
          </p>
        </div>

        {planResult && (
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher Pills */}
            <div className="bg-slate-100 p-1 rounded-xl border-2 border-slate-900 flex items-center gap-1">
              <button
                onClick={() => setActiveView('checklist')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeView === 'checklist'
                    ? 'bg-indigo-600 text-white shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Checklist ({completedCount}/{parsedSteps.length})</span>
              </button>
              <button
                onClick={() => setActiveView('single')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeView === 'single'
                    ? 'bg-amber-400 text-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-slate-900" />
                <span>Single-Thing</span>
              </button>
              <button
                onClick={() => setActiveView('full')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeView === 'full'
                    ? 'bg-slate-900 text-white shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Strategy</span>
              </button>
            </div>

            <button
              onClick={handleStartFresh}
              title="Clear and plan a new task"
              className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border-2 border-slate-900 transition-all text-xs font-bold"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {onNavigateTab && (
              <button
                onClick={handleSendTo4DReview}
                title="Send task to 4D Prioritizer (Delete, Delay, Diminish, Delegate)"
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl border-2 border-slate-900 transition-all text-xs font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">4D Triage</span>
              </button>
            )}

            <button
              onClick={handleSavePlanToJournal}
              disabled={savedToJournal}
              title="Save plan as an entry in your Intelligent Journal"
              className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 transition-all text-xs font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] ${
                savedToJournal
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-900 cursor-default'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
              <span>{savedToJournal ? 'Saved to Journal' : 'Save to Journal'}</span>
            </button>
          </div>
        )}
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={() => handlePlanTask()}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      {/* ACTIVE FOCUS TIMER FLOATING BAR (If Timer is Running or Paused) */}
      {timerInitial > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border-2 border-white/20 ${timerRunning ? 'bg-amber-400 text-slate-900 animate-pulse' : 'bg-slate-800 text-white'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                Active Focus Timer {timerRunning ? '• Running' : '• Paused'}
              </span>
              <h4 className="text-sm font-black truncate max-w-md">
                {timerStepTitle || 'Current Focus Block'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-wider">
              {formatTimer(timerSeconds)}
            </div>

            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl border-2 border-slate-900 font-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={() => {
                setTimerSeconds(timerInitial);
                setTimerRunning(false);
              }}
              title="Reset Timer"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border-2 border-white/20 text-xs font-bold"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border-2 border-white/20 text-xs font-bold"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            <button
              onClick={() => {
                setTimerSeconds(0);
                setTimerInitial(0);
                setTimerRunning(false);
              }}
              title="Dismiss Timer"
              className="text-xs text-slate-400 hover:text-white underline font-bold ml-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SUGGESTED NEXT STEP HERO CARD ("Do This Right Now" - Anti-Paralysis Anchor) */}
      {suggestedNextStep && (
        <div className="bg-gradient-to-br from-amber-100/90 via-orange-50 to-amber-50 p-6 rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Single Next Step • Start Right Here (2-5 Mins)</span>
              </span>
            </div>
            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-400 px-2 py-0.5 rounded-full uppercase">
              Zero Friction
            </span>
          </div>

          <p className="text-lg sm:text-xl font-black text-slate-900 leading-snug my-3">
            {suggestedNextStep}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleStartTimer('Single Next Step', 5)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <Play className="w-4 h-4 text-amber-400 fill-current" />
              <span>Start 5-Min Timer</span>
            </button>

            <button
              onClick={() => {
                if (soundEnabled) playGentleChime();
                setToastMessage('🎉 Fantastic job completing the first friction-free step!');
                setTimeout(() => setToastMessage(null), 3500);
                if (parsedSteps.length > 0) {
                  handleToggleComplete(parsedSteps[0].id);
                }
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>✓ I Did This!</span>
            </button>

            <button
              onClick={async () => {
                const token = await getIdToken();
                fetch('/api/kanban', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({
                    title: `⚡ Next: ${suggestedNextStep.slice(0, 120)}`,
                    description: suggestedNextStep,
                    column: 'in_progress',
                    domain: 'lifestyle',
                    timeEstimateMinutes: 5,
                    priority: 'high'
                  })
                });
                setToastMessage('✓ Sent to Kanban "In Progress" column!');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-indigo-600" />
              <span>To Kanban</span>
            </button>
          </div>
        </div>
      )}

      {/* SINGLE-THING FOCUS MODE (Dimension 7: Ultra-Low Cognitive Load) */}
      {activeView === 'single' && parsedSteps.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-8 rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-900">
                Single-Thing Focus Mode • Step {currentStepIndex + 1} of {parsedSteps.length}
              </span>
            </div>
            <button
              onClick={() => setActiveView('checklist')}
              className="text-xs font-extrabold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1"
            >
              <span>Back to Checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Step Card */}
          {parsedSteps[currentStepIndex] ? (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  {parsedSteps[currentStepIndex].title}
                </span>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{parsedSteps[currentStepIndex].timeMinutes} Mins</span>
                </span>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  ⚡ {parsedSteps[currentStepIndex].energy} Energy
                </span>
              </div>

              <p className="text-xs font-black text-indigo-600 tracking-wider uppercase mb-2">
                Do Only This One Thing:
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {parsedSteps[currentStepIndex].action}
              </h3>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border-2 border-slate-900 text-center space-y-3">
              <Sparkles className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-xl font-black text-slate-900">All Steps Completed!</h3>
              <p className="text-xs text-slate-600 font-medium">
                You successfully honored your bandwidth and broke through task paralysis.
              </p>
              <button
                onClick={() => {
                  setCurrentStepIndex(0);
                  setActiveView('checklist');
                }}
                className="px-5 py-2.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900"
              >
                Review Checklist
              </button>
            </div>
          )}

          {/* Action Row */}
          {parsedSteps[currentStepIndex] && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  handleToggleComplete(parsedSteps[currentStepIndex].id);
                  if (currentStepIndex < parsedSteps.length - 1) {
                    setCurrentStepIndex((prev) => prev + 1);
                  } else {
                    setToastMessage('🎉 All steps complete! Great work honoring your executive bandwidth.');
                    setTimeout(() => setToastMessage(null), 4000);
                  }
                }}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2 uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>
                  {parsedSteps[currentStepIndex].completed
                    ? '✓ Completed • Next'
                    : currentStepIndex < parsedSteps.length - 1
                    ? '✓ Did It • Next Step'
                    : '✓ All Done!'}
                </span>
              </button>

              <button
                onClick={() => handleStartTimer(parsedSteps[currentStepIndex].title, parsedSteps[currentStepIndex].timeMinutes)}
                className="px-4 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start {parsedSteps[currentStepIndex].timeMinutes}m Timer</span>
              </button>

              <button
                onClick={() => handleMakeSmaller(parsedSteps[currentStepIndex].id)}
                disabled={breakingDownStepId === parsedSteps[currentStepIndex].id}
                className="px-4 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2"
                title="If you feel friction or dread, RICHA makes this step smaller"
              >
                <Split className={`w-4 h-4 text-indigo-600 ${breakingDownStepId === parsedSteps[currentStepIndex].id ? 'animate-spin' : ''}`} />
                <span>{breakingDownStepId === parsedSteps[currentStepIndex].id ? 'Chunking smaller...' : 'Too Hard, Make Smaller'}</span>
              </button>

              {currentStepIndex > 0 && (
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-3.5 text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form Bento Tile */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
              <span>Task Breakdown Request</span>
            </h3>

            {/* Quick Inspiration Chips for ADHD Paralysis */}
            <div className="mb-4">
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">Common task paralysis presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '🧹 Clean room & bathe', val: 'cleaning my room and bathing' },
                  { label: '🧺 Laundry mountain', val: 'wash, fold, and put away laundry backlog' },
                  { label: '🍽️ Dishes & kitchen', val: 'wash dirty dishes and clear kitchen counters' },
                  { label: '📑 Email backlog', val: 'respond to urgent unread emails in my inbox' },
                  { label: '💻 Work project', val: 'start drafting quarterly report presentation' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setTaskInput(preset.val);
                      handlePlanTask(undefined, preset.val);
                    }}
                    className="text-[10px] font-extrabold bg-slate-100 hover:bg-indigo-100 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handlePlanTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  What task feels too big or hard to start?
                </label>
                <textarea
                  rows={3}
                  required
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="e.g. cleaning my room and bathing, finish client report, tidy messy kitchen..."
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none font-medium bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  When does this need to happen? (Optional)
                </label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="e.g. Today before 6pm, or by tomorrow"
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-medium bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Current Energy Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEnergyLevel(level)}
                      className={`py-2 text-xs font-extrabold capitalize rounded-xl border-2 transition-all ${
                        energyLevel === level
                          ? 'bg-indigo-600 border-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                          : 'bg-white border-slate-900 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {level} Energy
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="planner-submit-btn"
                type="submit"
                disabled={!taskInput.trim() || loading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Chunking with RICHA...' : 'Chunk Task & Time-Box'}</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-[11px] text-slate-700 space-y-1">
              <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>How to interact with your plan:</span>
              </span>
              <p className="leading-relaxed">
                Click <strong>[Checkboxes]</strong> to mark steps done with audio chime. Click <strong>[Start Timer]</strong> to run an integrated focus block. Click <strong>[To Kanban]</strong> to track on your board. If a step feels intimidating, click <strong>[Too Hard, Make Smaller]</strong>!
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Plan & Execution View */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Interactive Execution Steps</span>
              {parsedSteps.length > 0 && (
                <span className="text-[10px] font-black text-indigo-800 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full">
                  {completedCount} / {parsedSteps.length} Complete
                </span>
              )}
            </h3>

            {parsedSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendAllToKanban}
                  disabled={allKanbanSending}
                  className="text-[11px] font-extrabold text-slate-800 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                  title="Send all incomplete steps to your Kanban board"
                >
                  <Send className={`w-3 h-3 ${allKanbanSending ? 'animate-spin' : ''}`} />
                  <span>{allKanbanSending ? 'Adding...' : 'Send All to Kanban'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {parsedSteps.length > 0 && (
            <div className="mb-4">
              <div className="w-full bg-slate-200 rounded-full h-2.5 border border-slate-900 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Plan View Modes */}
          <div className="flex-1 overflow-y-auto min-h-[360px]">
            {parsedSteps.length > 0 ? (
              activeView === 'full' ? (
                /* Full Markdown View */
                <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-5">
                  <div
                    className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(planResult || '') }}
                  />
                </div>
              ) : (
                /* Interactive Checklist View */
                <div className="space-y-3">
                  {parsedSteps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        step.completed
                          ? 'bg-emerald-50/70 border-emerald-400 opacity-80'
                          : 'bg-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Custom Checkbox Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(step.id)}
                            className="mt-0.5 text-slate-700 hover:text-emerald-600 transition-all cursor-pointer"
                            title={step.completed ? 'Mark incomplete' : 'Mark done'}
                          >
                            {step.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <div className="w-5 h-5 rounded-md border-2 border-slate-900 bg-white hover:bg-slate-100" />
                            )}
                          </button>

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-black text-slate-500">
                                #{idx + 1}
                              </span>
                              <h4
                                className={`text-sm font-black ${
                                  step.completed ? 'line-through text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {step.title}
                              </h4>
                              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.2 rounded-full">
                                {step.timeMinutes}m
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.2 rounded-md">
                                {step.energy} Energy
                              </span>
                            </div>

                            <p
                              className={`text-xs leading-relaxed font-medium ${
                                step.completed ? 'line-through text-slate-400' : 'text-slate-700'
                              }`}
                            >
                              {step.action}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCurrentStepIndex(idx);
                              setActiveView('single');
                            }}
                            className="px-2.5 py-1 text-[11px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg flex items-center gap-1 transition-all"
                            title="Focus purely on this step with zero distraction"
                          >
                            <Target className="w-3 h-3 text-indigo-600" />
                            <span>Focus Only This</span>
                          </button>

                          <button
                            onClick={() => handleStartTimer(step.title, step.timeMinutes)}
                            className="px-2.5 py-1 text-[11px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1 transition-all"
                            title="Start countdown focus timer"
                          >
                            <Play className="w-3 h-3 text-amber-600 fill-current" />
                            <span>{step.timeMinutes}m Timer</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSendToKanban(step)}
                            disabled={sendingToKanban[step.id] || kanbanSuccess[step.id]}
                            className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all flex items-center gap-1 ${
                              kanbanSuccess[step.id]
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                            }`}
                            title="Add this card to Kanban This Week"
                          >
                            <Send className={`w-3 h-3 ${sendingToKanban[step.id] ? 'animate-spin' : ''}`} />
                            <span>{kanbanSuccess[step.id] ? '✓ In Kanban' : 'To Kanban'}</span>
                          </button>

                          <button
                            onClick={() => handleMakeSmaller(step.id)}
                            disabled={breakingDownStepId === step.id}
                            className="px-2 py-1 text-[11px] font-extrabold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg flex items-center gap-1 transition-all"
                            title="Too hard? Break into 2-minute micro actions"
                          >
                            <Split className={`w-3 h-3 text-indigo-600 ${breakingDownStepId === step.id ? 'animate-spin' : ''}`} />
                            <span>{breakingDownStepId === step.id ? 'Chunking...' : 'Smaller'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Custom Micro-Step Control */}
                  {showAddCustom ? (
                    <form onSubmit={handleAddCustomStep} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">Add Custom Micro-Step:</span>
                        <button
                          type="button"
                          onClick={() => setShowAddCustom(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Put dirty glasses in sink, take out trash bag..."
                        value={customStepTitle}
                        onChange={(e) => setCustomStepTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border-2 border-slate-900 rounded-lg bg-white"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700">Time estimate:</span>
                          <select
                            value={customStepMinutes}
                            onChange={(e) => setCustomStepMinutes(parseInt(e.target.value, 10))}
                            className="text-xs border border-slate-900 rounded-md px-2 py-1 bg-white font-bold"
                          >
                            <option value={5}>5 mins</option>
                            <option value={10}>10 mins</option>
                            <option value={15}>15 mins</option>
                            <option value={25}>25 mins</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-slate-900 text-white font-black text-xs rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                        >
                          Add Step
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowAddCustom(true)}
                      className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-slate-900 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Another Custom Micro-Step</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8 space-y-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Clock className="w-10 h-10 text-slate-400 stroke-2" />
                <div className="max-w-sm">
                  <h4 className="text-sm font-bold text-slate-700">No active plan generated yet</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Type any task on the left (e.g. <em>cleaning my room and bathing</em>) or click a quick preset to break it down into interactive micro-steps.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Socratic Cognitive Companion & Executive Function Follow-Up */}
      {planResult && (
        <SocraticReasoningFollowUp
          agentSource="planner"
          originalTask={taskInput}
          agentOutput={planResult}
          onSendToPlanner={(revisedTask) => {
            setTaskInput(revisedTask);
            setToastMessage(`Updated task to "${revisedTask.slice(0, 32)}..."`);
            setTimeout(() => setToastMessage(null), 3500);
          }}
          onSaveToJournalSuccess={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}

export default PlannerView;
