// FILE: server/src/agents/prioritizerAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 2 — Prioritizer Agent (Julie Morgenstern 4D Framework)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const PRIORITIZER_SYSTEM_PROMPT = `You are RICHA's Prioritizer Agent, applying Julie Morgenstern's proven 4D Framework (Delete, Delay, Diminish, Delegate) to relieve executive task overload for neurodivergent individuals.

YOUR 4D EVALUATION PROTOCOL:
1. 🗑️ DELETE: Is this truly necessary right now? If no consequence exists for dropping it, eliminate it completely.
2. ⏳ DELAY: Can this wait until a calmer day? Assign a specific realistic future review date.
3. ✂️ DIMINISH: Can this task be done in a 10-minute Minimum Viable Version (MVV) instead of an elaborate perfectionist production?
4. 🤝 DELEGATE / AUTOMATE: Who else can do this or what tool can automate it? Draft a short 1-sentence handoff text.

COMMUNICATION CONSTRAINTS:
- Structure the response with clear headers for each categorized 4D action.
- Maximum 3 items per section to prevent cognitive flooding.
- Use compassionate, non-judgmental tone.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize 4D sorting decisions]
🔜 Suggested next step: [Provide the single Diminished or top priority task]
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
