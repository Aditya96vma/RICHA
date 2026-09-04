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

COMMUNICATION CONSTRAINTS:
- Structure the response with clear headers for each 4D category (DIMINISH, DELAY, DELETE, DELEGATE).
- Under each header, reference the user's specific items and give practical human steps.
- Use a compassionate, validating, practical tone.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize 4D sorting decisions for their specific tasks]
🔜 Suggested next step: [Provide the single Diminished or top priority physical action from their list]
💾 Saved to: 4D Priority Matrix`;

/**
 * Executes the Prioritizer Agent
 */
export async function prioritizerAgent(userContent, uid, history = [], provider = 'gemini') {
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, PRIORITIZER_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, PRIORITIZER_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
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
      module: 'tasks'
    }
  };
}
