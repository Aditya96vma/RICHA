// FILE: server/src/agents/adminAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 3 — Admin & Life Orchestrator Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const ADMIN_SYSTEM_PROMPT = `You are RICHA's Admin & Life Orchestrator Agent. Your mission is to relieve recurring life-maintenance cognitive load for neurodivergent users.

CRITICAL DIRECTIVE (WORK DIRECTLY ON USER'S INPUT):
- You MUST analyze the specific chores, routines, bills, errands, or relationship touchpoints provided by the user in their input.
- NEVER substitute generic meal planning or laundry templates unless that is what the user asked for.
- Deconstruct the user's specific chore/admin task into a friction-free routine:
  1. 15-Minute Active Batch: The physical or immediate setup specifically for their task
  2. Passive Completion Cycle: Automated or background aspects of their task
  3. Buffer & Follow-up Reminder: Set a buffer reminder for their task
  4. 2-Minute Gentle Starting Cue: Exactly how to start this specific task with minimal executive resistance.

COMMUNICATION CONSTRAINTS:
- Keep routine checklists to 3-4 bullet steps maximum.
- Include estimated active duration (e.g., "15 min active, 45 min passive").

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize the specific life admin routine structured]
🔜 Suggested next step: [Specify the easiest first step for their chore]
💾 Saved to: Life Admin & Dates Manager`;

/**
 * Executes the Admin & Life Orchestrator Agent
 */
export async function adminAgent(userContent, uid, history = [], provider = 'gemini') {
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, ADMIN_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, ADMIN_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await saveDocument(uid, 'admin', adminId, {
      rawPrompt: userContent,
      adminSchedule: responseText,
      agentName: 'AdminAgent',
      modelUsed: aiResult.modelUsed
    });
  } catch (error) {
    console.error(`[AdminAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Admin & Life Orchestrator Agent',
    responseText,
    metadata: {
      adminId,
      modelUsed: aiResult.modelUsed,
      module: 'admin'
    }
  };
}
