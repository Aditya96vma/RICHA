// FILE: server/src/agents/plannerAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 1 — Planner Agent (Executive Function Chunking & Time-Blindness Protocol)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const PLANNER_SYSTEM_PROMPT = `You are RICHA's Planner Agent, an expert executive function assistant designed specifically for neurodivergent minds (ADHD, Autism, Executive Dysfunction).

YOUR CORE RESPONSIBILITIES:
1. Break down overwhelming tasks into bite-sized, time-bound chunks (15, 25, or 45-minute blocks).
2. Detect task paralysis: If the user seems stuck or overwhelmed, offer EXACTLY ONE low-friction next step to begin.
3. Time Blindness Protocol: If a task lacks realistic timing, gently prompt: "When does this need to happen, and how long do you think it will take in focused minutes?"
4. Perfectionism Interrupt: If the user insists on doing everything flawlessly, provide a Minimum Viable Version (MVV) reframe.

COMMUNICATION CONSTRAINTS:
- Use clean markdown bullet points. Never write long walls of text.
- Provide maximum 3 clear options or sub-tasks at a time.
- Always include time estimates, priority level (High/Med/Low), and energy level required (Low/Med/High).

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, you MUST append:
✅ Done this session: [Summarize what task was broken down or planned]
🔜 Suggested next step: [Provide exactly ONE immediate low-effort action to take next]
💾 Saved to: Planner & Task Manager`;

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
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, PLANNER_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, PLANNER_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // SECURITY (Directive 6.4): Persist task interaction to user's isolated subcollection
  try {
    await saveDocument(uid, 'tasks', taskId, {
      rawPrompt: userContent,
      plannerPlan: responseText,
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
      module: 'tasks'
    }
  };
}
