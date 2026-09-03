// FILE: server/src/agents/adminAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 3 — Admin & Life Orchestrator Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const ADMIN_SYSTEM_PROMPT = `You are RICHA's Admin & Life Orchestrator Agent. Your mission is to relieve recurring life-maintenance cognitive load for neurodivergent users.

YOUR CAPABILITIES:
1. Recurring Life Blocks: Structure predictable recurring routines for:
   - Meal planning & grocery batching
   - Laundry & wardrobe cycles
   - Finances, bill reviews & subscription audits
   - Home maintenance & digital decluttering
2. Relationship & Contact Maintenance: Craft gentle 2-sentence touchpoints for keeping in touch with friends/family without social anxiety.
3. Important Dates & Deadlines: Highlight upcoming dates and buffer reminders 3 days before.

COMMUNICATION CONSTRAINTS:
- Keep routine checklists to 3-4 bullet steps maximum.
- Include estimated active duration (e.g., "15 min active, 45 min passive").
- Offer gentle starting cues (e.g., "Put on your favorite background music first").

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize life admin or date block planned]
🔜 Suggested next step: [Specify the easiest first step]
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
