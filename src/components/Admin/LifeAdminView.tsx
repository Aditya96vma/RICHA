// FILE: src/components/Admin/LifeAdminView.tsx
// SECURITY: Directive 2 (OWASP LLM05 Sanitization), Directive 6.4 (Persistence)
// AGENT: Admin & Life Orchestrator Agent (Agent 3)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import { SocraticReasoningFollowUp } from '../shared/SocraticReasoningFollowUp';
import { Calendar, ShoppingBag, DollarSign, Heart, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

const DEMO_ADMIN_PLANS: Record<string, string> = {
  meal_planning: `### 🛒 Low-Friction Meal Planning & Grocery Rhythm
**Recommended Window:** Sunday 10:30 AM (25 minutes)
**Cognitive Load:** Minimal (Decision-fatigue proof)

#### 📋 3-Step Execution Checklist:
1. **[5 min] The 3x3 Matrix**: Pick 3 core proteins (tofu, salmon, eggs) and 3 staple bases (brown rice, wholewheat wraps, sweet potatoes). Zero browsing recipes from scratch.
2. **[10 min] 1-Click Basket Reorder**: Open online grocery app, tap "Buy It Again" for your 12 saved weekly staples (oats, almond milk, greens, berries, olive oil).
3. **[10 min] Wash & Stage**: When delivered, wash produce immediately and place clear glass containers at eye-level in fridge.

*💡 Neurodivergent Tip: Eliminate "What should I eat?" executive freeze by having one designated default fallback meal (e.g. 5-minute microwave sweet potato + black beans + avocado).*`,

  finances: `### 💳 Stress-Free Monthly Financial Rhythm
**Recommended Window:** 1st of every month, 11:00 AM (20 minutes)
**Cognitive Load:** Low (Gentle exposure therapy)

#### 📋 3-Step Execution Checklist:
1. **[5 min] Calm Sensory Setup**: Pour favorite tea, put on low-tempo instrumental music, take 3 deep breaths before opening banking app.
2. **[10 min] Subscription Audit**: Review last 30 days recurring charges. Flag unused SaaS or trial subscriptions for 1-click cancellation.
3. **[5 min] Automated Transfer**: Ensure automatic deposit into emergency buffer account is confirmed. Close all banking tabs.

*💡 Neurodivergent Tip: Pair financial reviews with a dopamine reward (e.g., favorite pastry or fresh coffee) to rewire emotional dread into calm predictability.*`,

  laundry_home: `### 🧺 The 45-Minute Low-Demand Apartment Reset
**Recommended Window:** Saturday 2:00 PM (45 minutes)
**Cognitive Load:** Moderate (Physical movement + podcast)

#### 📋 3-Step Execution Checklist:
1. **[15 min] One-Touch Surface Sweep**: Grab a laundry hamper and collect all out-of-place items across desks and counters.
2. **[15 min] Single Machine Load**: Wash bedding or towels only. Do not attempt multiple mixed sorting cycles.
3. **[15 min] Trash & Air Reset**: Empty all small wastebaskets, open windows for 10 minutes of fresh airflow, wipe desk surface.

*💡 Neurodivergent Tip: Keep trash bins and hampers in every room right where you naturally drop things, removing the friction of walking across the house.*`,

  relationships: `### 💬 Low-Pressure Social Touchpoints
**Recommended Window:** Thursday 6:00 PM (15 minutes)
**Cognitive Load:** Ultra-Low (No conversation obligations)

#### 📋 3-Step Execution Checklist:
1. **[5 min] The "Thinking of You" Ping**: Send 1 meme, photo, or low-pressure text to a close friend ("No need to reply, just saw this and thought of you!").
2. **[5 min] Calendar RSVP Triage**: Accept or decline pending social invites with zero guilt. Decline early rather than flaking late.
3. **[5 min] Micro-Gratitude**: Send a quick sentence of appreciation to a coworker or collaborator.

*💡 Neurodivergent Tip: The phrase "No need to reply" removes reciprocal pressure and makes social connection feel light instead of burdensome.*`
};

export function LifeAdminView() {
  const { getIdToken } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [selectedRoutine, setSelectedRoutine] = useState('meal_planning');
  const [customDetails, setCustomDetails] = useState('');
  const [adminPlan, setAdminPlan] = useState<string | null>(() => isDemoMode ? DEMO_ADMIN_PLANS['meal_planning'] : null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      if (!adminPlan) {
        setAdminPlan(DEMO_ADMIN_PLANS[selectedRoutine] || DEMO_ADMIN_PLANS['meal_planning']);
      }
    } else {
      // When demo mode is disabled, check if adminPlan is a demo routine and clear it
      const isDemoRoutine = Object.values(DEMO_ADMIN_PLANS).some(
        (plan) => plan.trim() === adminPlan?.trim()
      );
      if (isDemoRoutine) {
        setAdminPlan(null);
        setCustomDetails('');
      }
    }
  }, [isDemoMode, adminPlan, selectedRoutine]);

  const ROUTINES = [
    { id: 'meal_planning', label: 'Meal Planning & Groceries', icon: ShoppingBag, desc: 'Batch grocery list & low-effort meal prep' },
    { id: 'finances', label: 'Finances & Bill Audits', icon: DollarSign, desc: 'Monthly subscription & bill check-in' },
    { id: 'laundry_home', label: 'Home Reset & Laundry Cycle', icon: Clock, desc: 'Predictable 45-min apartment reset' },
    { id: 'relationships', label: 'Friendship & Contact Touchpoints', icon: Heart, desc: 'Low-pressure check-in messages' }
  ];

  const handleSelectRoutine = (id: string) => {
    setSelectedRoutine(id);
    if (isDemoMode) {
      setAdminPlan(DEMO_ADMIN_PLANS[id] || null);
    }
  };

  const handleGenerateRoutine = async () => {
    setLoading(true);
    setErrorInfo(null);

    const routineInfo = ROUTINES.find((r) => r.id === selectedRoutine);
    const promptText = `LIFE ADMIN ORCHESTRATION:\nRoutine: ${routineInfo?.label}\nNotes/Constraints: ${customDetails || 'Standard neurodivergent-friendly low friction plan'}\nPlease give me a structured recurring time block with time estimates and a 3-step checklist.`;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: promptText,
          sessionId: 'admin-session',
          contextHint: 'admin_setup'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (isDemoMode || !data.reply) {
          setAdminPlan(DEMO_ADMIN_PLANS[selectedRoutine] || DEMO_ADMIN_PLANS['meal_planning']);
          return;
        }
        setErrorInfo({ message: data.message || 'Failed to generate admin routine.' });
        if (data.reply) setAdminPlan(data.reply);
        return;
      }

      setAdminPlan(data.reply);
    } catch (err: any) {
      if (isDemoMode) {
        setAdminPlan(DEMO_ADMIN_PLANS[selectedRoutine] || DEMO_ADMIN_PLANS['meal_planning']);
      } else {
        setErrorInfo({ message: err.message || 'Network error.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bento Tile */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Agent 3 • Rhythm Builder
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span>Life Admin & Recurring Rhythm Orchestrator</span>
        </h2>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Eliminate recurring executive drag for meals, finances, laundry, and relationships with friction-free templates.
        </p>
      </div>

      {errorInfo && (
        <ErrorBanner
          message={errorInfo.message}
          onRetry={handleGenerateRoutine}
          onDismiss={() => setErrorInfo(null)}
          retryLoading={loading}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Routine Selector Bento Tile */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Select Life Admin Area</h3>
            <div className="space-y-2">
              {ROUTINES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRoutine === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoutine(r.id)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className={`p-2 rounded-lg border border-slate-900 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{r.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Specific preferences or dietary/financial constraints
              </label>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Quick 15-min limit',
                  'Low executive energy',
                  'Zero perfectionism',
                  'Vegetarian & low prep',
                  'Auditing unused subscriptions'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomDetails(preset)}
                    className="text-[10px] font-extrabold bg-slate-100 hover:bg-indigo-100 text-slate-800 border border-slate-300 rounded-lg px-2 py-0.5 transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="e.g. Vegetarian, 20-min max cooking, 3 bills to cancel..."
                className="w-full px-3.5 py-2 text-xs border-2 border-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none font-medium bg-slate-50 text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateRoutine}
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Orchestrating Block...' : 'Build Low-Friction Block'}</span>
            </button>
          </div>
        </div>

        {/* Structured Output Bento Tile */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider">
            Structured Routine & Checklist
          </h3>
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-5 overflow-y-auto min-h-[340px]">
            {adminPlan ? (
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(adminPlan) }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 stroke-2" />
                <p className="text-xs font-bold text-slate-600">Your structured life admin block and gentle checklist will render here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Socratic Life Admin & Executive Dread Follow-Up */}
      {adminPlan && (
        <SocraticReasoningFollowUp
          agentSource="admin"
          originalTask={customDetails || `Life Admin: ${selectedRoutine}`}
          agentOutput={adminPlan}
        />
      )}
    </div>
  );
}

export default LifeAdminView;
