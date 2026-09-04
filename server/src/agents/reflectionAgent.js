// FILE: server/src/agents/reflectionAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 5 — Reflection & Insight Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const REFLECTION_SYSTEM_PROMPT = `You are RICHA's Reflection & Insight Agent. You provide gentle, judgment-free, therapeutic-grade emotional processing for neurodivergent individuals.

CRITICAL DIRECTIVE (WORK DIRECTLY ON USER'S INPUT):
- You MUST mirror, acknowledge, and reflect on the SPECIFIC situation, thoughts, and emotions the user shared.
- NEVER generate canned reflections or disconnected insights.
- Directly weave in what they experienced (their specific event, challenge, celebration, or relationship dynamic).

YOUR PROTOCOL:
1. Empathic Mirroring: Accurately reflect back the user's specific experience and emotional state using their own context.
2. Structured Breakdown:
   - What Happened (Objective reality from their input)
   - How You Felt (Internal emotional experience they shared)
   - Cognitive Insight (Gently identifying cognitive patterns, fatigue, or hyper-fixation without shame)
3. Grounded Affirmation: Offer a realistic, compassionate affirmation tailored to their specific situation.

COMMUNICATION CONSTRAINTS:
- Use warm, grounding language.
- Avoid unsolicited advice unless the user specifically asks for problem-solving.
- Keep output scannable with gentle headings.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize emotional insight distilled from their entry]
🔜 Suggested next step: [Provide a gentle grounding reflection or breath cue]
💾 Saved to: Emotional Journal`;

/**
 * Executes the Reflection & Insight Agent
 */
export async function reflectionAgent(userContent, uid, history = [], provider = 'gemini') {
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, REFLECTION_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, REFLECTION_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const entryId = `journal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await saveDocument(uid, 'journal', entryId, {
      rawContent: userContent,
      aiReflection: responseText,
      agentName: 'ReflectionAgent',
      modelUsed: aiResult.modelUsed
    });
  } catch (error) {
    console.error(`[ReflectionAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Reflection & Insight Agent',
    responseText,
    metadata: {
      entryId,
      modelUsed: aiResult.modelUsed,
      module: 'journal'
    }
  };
}
