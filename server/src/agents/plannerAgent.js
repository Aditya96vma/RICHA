// FILE: server/src/agents/plannerAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 1 — Planner Agent (Executive Function Chunking & Time-Blindness Protocol)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';
import { generateHumanExecutionPlan } from '../utils/humanTaskProcessor.js';

const PLANNER_SYSTEM_PROMPT = `You are RICHA's Planner Agent, an expert executive function assistant designed specifically for neurodivergent minds (ADHD, Autism, Executive Dysfunction).

CRITICAL HUMAN REALITY & ANTI-JARGON DIRECTIVES:
- You MUST analyze and work directly on the specific task, project, or chore the user provided in their input.
- STRICTLY FORBIDDEN: NEVER use corporate or robotic jargon such as "central deliverable", "primary deliverable", "core deliverable", "tackle deliverable", "prep environment for [raw string]", or "focus on deliverable". These phrases are useless to a real human being.
- When the user provides compound or multiple activities (e.g., "finishing 5 homework, cooking, bathing"):
  1. Parse and identify EACH distinct human activity in their real-world domain (e.g. food/nourishment, physical hygiene/bathing, studying/homework).
  2. Sequence them with human physiological logic:
     - Biological needs first: Food/cooking fuels the brain with glucose; bathing resets cortisol and sensory overload.
     - Academic/work tasks batched into manageable chunks (e.g., 2 quick homeworks first for momentum, break, then remaining 3).
  3. Provide concrete physical actions a human body physically performs (e.g., "Walk into the kitchen, wash hands, and cook a simple 15-minute meal", "Set out a clean towel and comfortable clothes before turning on the warm water", "Open the 2 shortest assignments and set a 25-minute timer").
- If the user specifies a deadline or energy level, tailor the time-boxing and sequencing directly to their constraint.

YOUR CORE RESPONSIBILITIES:
1. Break down the user's specific tasks into 3-4 distinct, bite-sized, time-bound phases (15, 20, 25, or 30-minute blocks).
2. For each phase, provide:
   - Phase Title: A clear, descriptive title naming the specific activity (e.g. "Phase 1: Fuel Up & Kitchen Momentum (Cooking)")
   - Action: 1-2 concrete, micro-actions the user will physically do with their hands and eyes
   - Time: Number of minutes (e.g., 15, 20, 25)
   - Energy Level: Low, Medium, or High
   - Priority: High, Medium, or Low
3. Detect task paralysis: If the user seems stuck or overwhelmed, offer EXACTLY ONE ultra-low-friction next step to begin.
4. Time Blindness Protocol: Ground all estimates in realistic blocks with built-in buffers.
5. Perfectionism Interrupt: Provide a Minimum Viable Version (MVV) reframe specific to the user's tasks (e.g. "If cooking is too much, eat toast or fruit; finish 3 assignments today instead of forcing all 5").

COMMUNICATION CONSTRAINTS:
- Use clean markdown bullet points or headers. Never write long unbroken walls of text.
- Provide maximum 3-4 clear sub-phases to prevent cognitive flooding.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, you MUST append:
✅ Done this session: [Summarize the exact human activities broken down]
🔜 Suggested next step: [Provide exactly ONE immediate low-effort physical action to take next]
💾 Saved to: Planner & Task Manager`;

/**
 * Parses structured micro-steps from markdown plan text across any formatting style
 * 
 * @param {string} text
 * @param {string} [originalPrompt]
 * @returns {Array<{ id: string, title: string, action: string, timeMinutes: number, energy: string, priority: string, completed: boolean }>}
 */
export function parsePlannerSteps(text, originalPrompt = '') {
  if (!text) {
    return originalPrompt ? generateHumanExecutionPlan(originalPrompt).phases : [];
  }
  const lines = text.split('\n');
  const steps = [];
  let currentStep = null;

  const IGNORE_PATTERNS = [
    'perfectionism', 'minimum viable', 'done this session', 'saved to:', 
    'suggested next step', 'quick tips', 'for success', 'one-touch rule',
    'overview', 'summary', 'context', 'footer', 'richa tip'
  ];

  const ATTRIBUTE_KEYS = [
    'action', 'goal', 'time', 'time-box', 'duration', 'energy', 'energy level', 'priority', 'tools', 'note', 'notes'
  ];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (IGNORE_PATTERNS.some(p => lower.includes(p))) continue;

    // Check if line is an attribute line like:
    // * **Action:** ... or * Action: ... or **Time:** 30 minutes. or * **Energy Level:** Low.
    const attrMatch = trimmed.match(/^(?:(?:\*|-|\d+\.))\s*\*\*?([a-zA-Z\s-]+?)(?::\*\*|\*\*:|\*\*|:)\s*(.+)$/i) ||
                      trimmed.match(/^\*\*?([a-zA-Z\s-]+?)(?::\*\*|\*\*:|\*\*|:)\s*(.+)$/i);

    if (attrMatch) {
      const key = attrMatch[1].trim().toLowerCase();
      const val = attrMatch[2].trim();

      if (ATTRIBUTE_KEYS.some(k => key === k || key.startsWith(k))) {
        if (currentStep) {
          if (key.includes('action') || key.includes('goal')) {
            const cleanVal = val.replace(/[*_`]/g, '').trim();
            if (currentStep.action && currentStep.action !== currentStep.title) {
              currentStep.action += ' • ' + cleanVal;
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
              currentStep.energy = e.startsWith('med') ? 'Medium' : e.charAt(0).toUpperCase() + e.slice(1);
            }
          }
          if (key.includes('priority')) {
            const pm = val.match(/(low|med|medium|high)/i);
            if (pm) {
              const p = pm[1].toLowerCase();
              currentStep.priority = p.startsWith('med') ? 'Medium' : p.charAt(0).toUpperCase() + p.slice(1);
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
      const bMatch = trimmed.match(/^(?:(?:\*|-|\d+\.))\s*\*\*([^*]+?)(?::\*\*|\*\*:|\*\*)\s*(.*)$/);
      if (bMatch) {
        const candidateTitle = bMatch[1].trim().toLowerCase();
        if (!ATTRIBUTE_KEYS.some(k => candidateTitle === k || candidateTitle.startsWith(k))) {
          boldStepMatch = bMatch;
        }
      }
    }

    if (headerMatch || bulletPhaseMatch || boldStepMatch) {
      if (currentStep && currentStep.title) {
        steps.push(currentStep);
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
      if (IGNORE_PATTERNS.some(p => rawTitleLower.includes(p)) || rawTitleLower.length < 2) {
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
      let energy = 'Medium';
      if (energyMatch) {
        const e = (energyMatch[1] || '').toLowerCase();
        energy = e.startsWith('med') ? 'Medium' : e.charAt(0).toUpperCase() + e.slice(1);
      }
      const priorityMatch = combined.match(/priority:\s*(low|med|medium|high)/i);
      let priority = 'Medium';
      if (priorityMatch) {
        const p = priorityMatch[1].toLowerCase();
        priority = p.startsWith('med') ? 'Medium' : p.charAt(0).toUpperCase() + p.slice(1);
      }

      currentStep = {
        id: 'step_' + (steps.length + 1),
        title: rawTitle.replace(/^Phase\s*\d+:?\s*/i, '').replace(/^Step\s*\d+:?\s*/i, '').trim() || rawTitle,
        action: rest.replace(/^[:\s-]+/, '').trim() || rawTitle,
        timeMinutes,
        energy,
        priority,
        completed: false
      };
      continue;
    }

    // Numbered or bullet descriptive detail for the active step:
    // e.g. "1. **Clear counter:** Move clutter..." or "* Since you have medium energy..."
    if (currentStep && (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
      const cleanSub = trimmed.replace(/^(?:\d+\.|\*|-|•)\s*/, '').replace(/[*_`]/g, '').trim();
      if (cleanSub.length > 5 && !IGNORE_PATTERNS.some(p => cleanSub.toLowerCase().includes(p))) {
        if (currentStep.action && currentStep.action !== currentStep.title) {
          currentStep.action += ' • ' + cleanSub;
        } else {
          currentStep.action = cleanSub;
        }
      }
    }
  }

  if (currentStep && currentStep.title) {
    steps.push(currentStep);
  }

  // Fallback: extract regular non-empty bullet points
  if (steps.length === 0) {
    for (const line of lines) {
      const m = line.trim().match(/^(?:(?:\*|-|\d+\.))\s*(.+)$/);
      if (m && m[1] && m[1].length > 8 && !IGNORE_PATTERNS.some(p => m[1].toLowerCase().includes(p))) {
        const clean = m[1].replace(/[*#_`]/g, '').trim();
        const timeMatch = clean.match(/(\d+)\s*(?:min|minute)/i);
        steps.push({
          id: `step_${steps.length + 1}`,
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

  // If still empty and prompt was provided, use human task processor
  if (steps.length === 0 && originalPrompt) {
    return generateHumanExecutionPlan(originalPrompt).phases;
  }

  for (const s of steps) {
    if (!s.action) s.action = s.title;
  }

  return steps;
}

/**
 * Executes the Planner Agent
 * 
 * @param {string} userContent - Raw input from user
 * @param {string} uid - Verified user UID
 * @param {Array} history - Past message conversation context
 * @param {string} provider - 'gemini' or 'ollama'
 * @returns {Promise<{ agent: string, responseText: string, metadata: object }>}
 */
export async function plannerAgent(userContent, uid, history = [], provider = 'gemini') {
  // Strip slash commands and delimiters from input
  let cleanInput = (userContent || '')
    .replace(/\[USER_JOURNAL_DATA_START\]|\[USER_JOURNAL_DATA_END\]/gi, '')
    .replace(/^\/(?:plan|schedule|day)\s*/i, '')
    .trim();

  // If user provided no tasks directly, inspect recent history
  let historicalTasks = '';
  if (!cleanInput && Array.isArray(history) && history.length > 0) {
    const relevantTurns = history
      .filter(m => (m.sender === 'user' || m.role === 'user') && m.text && !m.text.startsWith('/'))
      .slice(-3)
      .map(m => m.text.trim())
      .filter(Boolean);

    if (relevantTurns.length > 0) {
      historicalTasks = relevantTurns.join('\n');
    }
  }

  if (!cleanInput && !historicalTasks) {
    const welcomeText = `### 📋 Executive Function Day Planner

I'm here to help you break down your day into low-friction, realistic steps!

**What would you like to plan today?**
Share a specific task, project, or your rough agenda for the day (e.g., *"clean kitchen, finish history paper, and walk dog"* or *"prepare for afternoon client presentation"*).

I will turn it into:
* 🟢 **Phase 1: Low-Friction Entry** (Starting cues to bypass executive paralysis)
* 🟡 **Phase 2: Focused Execution** (Realistic chunked sprints)
* 🔵 **Phase 3: Wrap-up & Transition** (Sensory cooldown)

*Just reply with what you need to get done, or let me know what energy level you have today!*

---
✅ Done this session: Day Planner ready for your task
🔜 Suggested next step: Type or paste the task or schedule you want to plan
💾 Saved to: Planner & Task Manager`;

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      agent: 'Planner Agent',
      responseText: welcomeText,
      metadata: {
        taskId,
        modelUsed: 'richa-planner-welcome',
        module: 'tasks',
        steps: [],
        suggestedNextStep: 'Type or paste the task or schedule you want to plan'
      }
    };
  }

  const tasksToPlan = cleanInput || `Tasks discussed in recent conversation:\n${historicalTasks}`;
  const promptToSend = `TASK TO PLAN:\n${tasksToPlan}`;

  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(promptToSend, PLANNER_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(promptToSend, PLANNER_SYSTEM_PROMPT);
  }

  let responseText = (aiResult.text || '')
    .replace(/\[USER_JOURNAL_DATA_START\]/gi, '')
    .replace(/\[USER_JOURNAL_DATA_END\]/gi, '')
    .replace(/between (?:the )?\[USER_JOURNAL_DATA_START\] and \[USER_JOURNAL_DATA_END\] tags?\.?/gi, 'here.')
    .replace(/between the tags\.?/gi, 'here.')
    .trim();

  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Extract structured steps and single next step for high-interactivity clients
  const steps = parsePlannerSteps(responseText, userContent);
  const nextStepMatch = responseText.match(/🔜\s*Suggested\s+next\s+step:\s*([^\n]+)/i);
  let suggestedNextStep = nextStepMatch ? nextStepMatch[1].replace(/[*#_`[\]]/g, '').trim() : null;
  if (!suggestedNextStep && steps.length > 0) {
    suggestedNextStep = steps[0].action || steps[0].title;
  }

  // SECURITY (Directive 6.4): Persist task interaction to user's isolated subcollection
  try {
    await saveDocument(uid, 'tasks', taskId, {
      rawPrompt: userContent,
      plannerPlan: responseText,
      steps,
      suggestedNextStep,
      agentName: 'PlannerAgent',
      modelUsed: aiResult.modelUsed,
      status: 'active'
    });
  } catch (error) {
    console.error(`[PlannerAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Planner Agent',
    responseText,
    metadata: {
      taskId,
      modelUsed: aiResult.modelUsed,
      module: 'tasks',
      steps,
      suggestedNextStep
    }
  };
}
