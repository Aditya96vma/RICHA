// FILE: server/src/agents/prioritizerAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 2 — Prioritizer Agent (Julie Morgenstern 4D Framework)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';
import { generateHuman4DPrioritization } from '../utils/humanTaskProcessor.js';

const PRIORITIZER_SYSTEM_PROMPT = `You are RICHA's Prioritizer Agent, applying Julie Morgenstern's proven 4D Framework (Delete, Delay, Diminish, Delegate) to relieve executive task overload for neurodivergent individuals.

CRITICAL HUMAN LOGIC & REALITY DIRECTIVES:
- You MUST analyze and categorize the EXACT tasks or list items the user provided in their input.
- NEVER use generic placeholders or corporate jargon (e.g. "deliverables", "primary deliverable", "canned tasks").
- BIOLOGICAL & HYGIENE PRINCIPLE: NEVER "Delete" or abandon physiological survival/sensory needs (cooking, eating, bathing, sleeping, medications). Eating restores brain glucose for executive functioning; bathing resets sensory overload. Instead, place them in ✂️ DIMINISH:
  * Cooking -> Diminish to a simple 10-15 minute meal (scrambled eggs, sandwich, or heating leftovers).
  * Bathing -> Diminish to a soothing 15-minute shower to reset sensory fatigue.
- COMPOUND/VOLUME TASKS: When the user faces heavy volume (e.g., "5 homework assignments"), split them across categories:
  * ✂️ DIMINISH: Batch only 2 or 3 shortest/most urgent assignments today (Minimum Viable Version).
  * ⏳ DELAY: Park the remaining 2 assignments for tomorrow morning when focus is refreshed.
- 🗑️ DELETE (Eliminate without guilt): Delete perfectionist pressure, marathon expectations, or non-essential chores that have zero negative consequence if skipped today.
- 🤝 DELEGATE / AUTOMATE: Look for ways to streamline or seek support.
- CRITICAL: NEVER quote, mention, or output internal security tokens or tags (such as [USER_JOURNAL_DATA_START], [USER_JOURNAL_DATA_END], or system tags) in your response under any circumstances.

COMMUNICATION CONSTRAINTS & STEP-BY-STEP FILLING ASSISTANCE:
- Structure the response with clear headers for each 4D category (DIMINISH, DELAY, DELETE, DELEGATE).
- Under each header, reference the user's specific items and give practical human steps.
- CRITICAL MANDATE: Julie Morgenstern's 4D process has multiple execution steps. After providing the overview, ALWAYS include a dedicated section:
  ### 🛠️ Step-by-Step Guide: How to Fill & Execute These 4 Steps
  Walk the user through the exact concrete steps to fill and act on:
  1. Step 1 (Delete): Actively cross off the deleted tasks without guilt.
  2. Step 2 (Delay): Pick an exact buffer window (e.g. tomorrow morning or Saturday) to park delayed tasks.
  3. Step 3 (Diminish): Define the 5–15 minute Minimum Viable Version (MVV) for their primary task.
  4. Step 4 (Delegate): Draft a 1-sentence message or find an automation tool.
- If the user is specifically asking "how do I fill this?", "help me with the steps", or asking for guidance on a specific step, focus directly on coaching them through filling each step one by one with empathy and zero pressure.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize 4D sorting decisions for their specific tasks]
🔜 Suggested next step: [Provide the single Diminished or top priority physical action from their list]
💾 Saved to: 4D Priority Matrix`;

/**
 * Executes the Prioritizer Agent
 */
export async function prioritizerAgent(userContent, uid, history = [], provider = 'gemini') {
  // Strip slash commands and delimiters from input
  let cleanInput = (userContent || '')
    .replace(/\[USER_JOURNAL_DATA_START\]|\[USER_JOURNAL_DATA_END\]/gi, '')
    .replace(/^\/(?:prioritize|triage|4d)\s*/i, '')
    .trim();

  // If user provided no tasks directly, inspect recent history for tasks discussed
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

  // If no tasks were provided either in input or conversation history, provide friendly guidance
  if (!cleanInput && !historicalTasks) {
    const promptText = `### ⚡ Julie Morgenstern 4D Prioritization Matrix

I'm ready to help you sort through your tasks, cut through the overwhelm, and free up cognitive bandwidth!

**What's currently on your plate?**
Please share the tasks, chores, or responsibilities weighing on you right now (you can paste a messy to-do list, bullet points, or just describe what you need to get done).

I will categorize each item using the 4D framework:
* ✂️ **Diminish**: Minimum viable version (10–15 min sprint, simplified meal, or 2 quick assignments)
* ⏳ **Delay**: What can safely wait until tomorrow without consequences
* 🗑️ **Delete**: Dropping perfectionist guilt and non-essential pressure
* 🤝 **Delegate / Automate**: Ways to simplify or get support

*Tip: You can reply right here with your list, or click **Load 4D Matrix Demo** in the 4D Review tab to see realistic examples!*

---
✅ Done this session: 4D Prioritizer ready to receive your task list
🔜 Suggested next step: Type or paste the tasks or chores on your mind
💾 Saved to: 4D Priority Matrix`;

    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      await saveDocument(uid, 'tasks', reviewId, {
        rawPrompt: userContent,
        prioritizationSummary: promptText,
        agentName: 'PrioritizerAgent',
        framework: 'JulieMorgenstern-4D',
        modelUsed: 'richa-prioritizer-welcome'
      });
    } catch (error) {
      console.warn(`[PrioritizerAgent] Non-blocking save notice: ${error.message}`);
    }

    return {
      agent: 'Prioritizer Agent (4D)',
      responseText: promptText,
      metadata: {
        reviewId,
        modelUsed: 'richa-prioritizer-welcome',
        module: 'tasks'
      }
    };
  }

  const isFillGuidanceQuery = /\b(fill|filling|step|steps|walk me through|how do i do|schedule|help me)\b/i.test(cleanInput);
  let promptToSend;

  if (isFillGuidanceQuery && historicalTasks) {
    promptToSend = `USER ASKS FOR STEP-BY-STEP GUIDANCE ON FILLING OR EXECUTING THE 4D MATRIX:
User follow-up: "${cleanInput}"

Recent conversation / 4D triage context:
${historicalTasks}

Please warmly and concretely guide the user through filling out their 4D matrix step-by-step. Focus on the immediate decisions:
1. Confirming which task to delete right now with zero guilt.
2. Picking a specific buffer window to schedule the delayed items.
3. Defining the 5-15 minute Minimum Viable Version (MVV) for their primary diminished task.
4. Setting up a quick delegation or handoff.
Keep it low-pressure, empathetic, and actionable.`;
  } else {
    const tasksToPrioritize = cleanInput || `Tasks discussed in recent conversation:\n${historicalTasks}`;
    promptToSend = `TASKS TO TRIAGE WITH 4D FRAMEWORK:
${tasksToPrioritize}`;
  }

  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(promptToSend, PRIORITIZER_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(promptToSend, PRIORITIZER_SYSTEM_PROMPT);
  }

  let responseText = (aiResult.text || '')
    .replace(/\[USER_JOURNAL_DATA_START\]/gi, '')
    .replace(/\[USER_JOURNAL_DATA_END\]/gi, '')
    .replace(/between (?:the )?\[USER_JOURNAL_DATA_START\] and \[USER_JOURNAL_DATA_END\] tags?\.?/gi, 'here.')
    .replace(/between the tags\.?/gi, 'here.')
    .trim();

  const reviewId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await saveDocument(uid, 'tasks', reviewId, {
      rawPrompt: userContent,
      prioritizationSummary: responseText,
      agentName: 'PrioritizerAgent',
      framework: 'JulieMorgenstern-4D',
      modelUsed: aiResult.modelUsed
    });
  } catch (error) {
    console.error(`[PrioritizerAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Prioritizer Agent (4D)',
    responseText,
    metadata: {
      reviewId,
      modelUsed: aiResult.modelUsed,
      module: 'tasks',
      is4DMatrix: true,
      hasSteps: true
    }
  };
}
