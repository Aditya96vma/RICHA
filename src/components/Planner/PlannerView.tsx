// FILE: src/components/Planner/PlannerView.tsx
// SECURITY: Directive 2 (OWASP LLM05 Sanitization), Directive 6.4 (Persistence)
// AGENT: Planner Agent (Agent 1) — Time-Blindness Protocol & Chunking

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { Zap, Clock, Sparkles, CheckCircle2, ArrowRight, Target, RotateCcw, Split } from 'lucide-react';

export function PlannerView() {
  const { getIdToken } = useAuth();
  const [taskInput, setTaskInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [planResult, setPlanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);
  
  // Single-Thing Focus Mode State (Dimension 7: Cognitive Load & Accessibility)
  const [singleThingMode, setSingleThingMode] = useState<boolean>(false);
  const [parsedSteps, setParsedSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [breakingDownStep, setBreakingDownStep] = useState<boolean>(false);

  // Parse structured micro-steps from markdown plan result
  const extractSteps = (text: string) => {
    const lines = text.split('\n');
    const steps: string[] = [];
    for (const line of lines) {
      const match = line.match(/^(?:(?:\*|-|\d+\.|\bStep\s+\d+:?))\s*(.+)$/i);
      if (match && match[1] && match[1].length > 8 && !match[1].toLowerCase().includes('time-box') && !match[1].toLowerCase().includes('done this session')) {
        steps.push(match[1].replace(/[*#_`]/g, '').trim());
      }
    }
    return steps.length > 0 ? steps : [
      'Open your working space or document',
      'Set a gentle timer for 10 minutes',
      'Complete just the first sentence or outline',
      'Take a 3-minute breather'
    ];
  };

  const handlePlanTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);
    const payloadPrompt = `TASK TO PLAN:\nTask: ${taskInput}\nDeadline: ${deadline || 'Not specified'}\nUser Energy Level: ${energyLevel}\nPlease break this down into 15/25/45-minute blocks with time-boxing and give me ONE next step.`;

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
        setErrorInfo({ message: data.message || 'Failed to generate task plan.' });
        if (data.reply) setPlanResult(data.reply);
        return;
      }

      setPlanResult(data.reply);
      const steps = extractSteps(data.reply);
      setParsedSteps(steps);
      setCurrentStepIndex(0);
      setSingleThingMode(true); // Automatically offer Single-Thing focus mode
    } catch (err: any) {
      setErrorInfo({ message: err.message || 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  // "Too Hard, Make Smaller" handler (Neurodivergent Scaffolding)
  const handleMakeSmaller = async () => {
    if (!parsedSteps[currentStepIndex]) return;
    const currentStep = parsedSteps[currentStepIndex];
    setBreakingDownStep(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: `This step is too intimidating or mentally heavy: "${currentStep}". Break it down into 2 or 3 frictionless, micro-actions that take under 2 minutes each.`,
          sessionId: 'planner-session',
          contextHint: 'planning_request'
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const microSteps = extractSteps(data.reply);
        // Replace the current step with the micro-steps
        const newSteps = [...parsedSteps];
        newSteps.splice(currentStepIndex, 1, ...microSteps);
        setParsedSteps(newSteps);
      }
    } catch (err) {
      console.warn('Failed to break down step further:', err);
    } finally {
      setBreakingDownStep(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bento Tile */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Agent 1 • Execution Engine
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <span>Planner & Time-Blindness Protocol</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Turn massive, paralyzing projects into 15-25 minute focused micro-blocks with realistic friction-free starts.
          </p>
        </div>

        {planResult && (
          <button
            onClick={() => setSingleThingMode(!singleThingMode)}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl border-2 border-slate-900 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
              singleThingMode
                ? 'bg-amber-400 text-slate-900'
                : 'bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4 text-slate-900" />
            <span>{singleThingMode ? 'View Full Breakdown' : '🎯 Single-Thing Mode'}</span>
          </button>
        )}
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={() => handlePlanTask({ preventDefault: () => {} } as any)}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      {/* SINGLE-THING FOCUS CARD (Dimension 7: ADHD / Executive Overwhelm Protection) */}
      {singleThingMode && parsedSteps.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 sm:p-8 rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-900">
                Current Micro-Focus • Step {currentStepIndex + 1} of {parsedSteps.length}
              </span>
            </div>
            <button
              onClick={() => setSingleThingMode(false)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
            >
              See all steps
            </button>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6">
            <p className="text-xs font-extrabold text-indigo-600 tracking-wider uppercase mb-2">Do Only This:</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {parsedSteps[currentStepIndex]}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (currentStepIndex < parsedSteps.length - 1) {
                  setCurrentStepIndex((prev) => prev + 1);
                } else {
                  alert('🎉 All steps complete! Great work honoring your executive bandwidth.');
                  setCurrentStepIndex(0);
                }
              }}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>{currentStepIndex < parsedSteps.length - 1 ? '✓ Did It • Next Step' : '✓ All Done!'}</span>
            </button>

            <button
              onClick={handleMakeSmaller}
              disabled={breakingDownStep}
              className="px-4 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2"
              title="If you feel friction or dread, RICHA makes this step smaller"
            >
              <Split className={`w-4 h-4 text-indigo-600 ${breakingDownStep ? 'animate-spin' : ''}`} />
              <span>{breakingDownStep ? 'Chunking smaller...' : 'Too Hard, Make Smaller'}</span>
            </button>

            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                className="px-3 py-3.5 text-slate-600 hover:text-slate-900 font-bold text-xs"
              >
                Previous Step
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Bento Tile */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider">
            Task Breakdown Request
          </h3>
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
                placeholder="e.g. Write quarterly report, clean messy garage, prepare for presentation..."
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
                placeholder="e.g. Tomorrow 5pm, or by this weekend"
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
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Chunking with RICHA...' : 'Chunk Task & Time-Box'}</span>
            </button>
          </form>
        </div>

        {/* Structured Plan Output Bento Tile */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center justify-between uppercase tracking-wider">
            <span>Executive Plan & Single Next Step</span>
            {planResult && (
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full uppercase">
                Time-Boxed
              </span>
            )}
          </h3>

          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-5 overflow-y-auto min-h-[300px]">
            {planResult ? (
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(planResult) }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 stroke-2" />
                <p className="text-xs font-bold text-slate-600">Your time-boxed plan and low-friction first step will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlannerView;
