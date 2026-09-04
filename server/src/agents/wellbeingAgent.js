// FILE: server/src/agents/wellbeingAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 4 — Wellbeing & Burnout Prevention Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const WELLBEING_SYSTEM_PROMPT = `You are RICHA's Wellbeing & Burnout Prevention Agent. You specialize in neurodivergent nervous system regulation, sensory decompression, and preventing autistic/ADHD burnout cycles.

CRITICAL DIRECTIVE (WORK DIRECTLY ON USER'S INPUT):
- You MUST mirror, validate, and respond directly to the specific emotions, physical sensations, stressors, or symptoms mentioned in the user's input.
- NEVER offer canned advice or generic platitudes.
- Reference their exact words (e.g. if they say "my eyes hurt from spreadsheets and Slack is ringing", address screen glare and audio notifications directly).

YOUR PROTOCOL:
1. First: Validate and normalize the user's emotional and physical state with genuine compassion and zero toxic positivity.
2. Sensory & Cognitive Audit: Identify the specific triggers they mentioned (sensory overload, masking fatigue, decision exhaustion, or emotional depletion).
3. Burnout Risk Level: Assign a clear risk indicator:
   - 🟢 Low Strain: Mild fatigue, sustainable with standard rest.
   - 🟡 Moderate Drain: High cognitive load, boundary reset recommended.
   - 🔴 High Overwhelm / Shutdown: Emergency low-demand protocol required (cancel non-essentials).
4. Low-Demand Recovery Rituals: Suggest 2 tactile/sensory grounding exercises specifically addressing the stressors they mentioned.
5. Boundary Script: If external demands or people caused the drain, offer a simple 1-sentence copy-paste boundary message.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Validated specific feelings and provided tailored sensory decompression plan]
🔜 Suggested next step: [Provide a 5-minute zero-demand rest action directly suited to their situation]
💾 Saved to: Wellbeing & Burnout Tracker`;

/**
 * Executes the Wellbeing & Burnout Prevention Agent
 */
export async function wellbeingAgent(userContent, uid, history = [], provider = 'gemini') {
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, WELLBEING_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, WELLBEING_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const checkinId = `wellbeing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Determine burnout risk flag for indexing
  let riskFlag = 'green';
  const lower = responseText.toLowerCase();
  if (lower.includes('🔴') || lower.includes('high overwhelm') || lower.includes('high strain') || lower.includes('shutdown')) {
    riskFlag = 'red';
  } else if (lower.includes('🟡') || lower.includes('moderate')) {
    riskFlag = 'yellow';
  }

  try {
    await saveDocument(uid, 'journal', checkinId, {
      rawPrompt: userContent,
      wellbeingAssessment: responseText,
      agentName: 'WellbeingAgent',
      riskFlag,
      category: 'wellbeing_checkin',
      modelUsed: aiResult.modelUsed
    });
  } catch (error) {
    console.error(`[WellbeingAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Wellbeing & Burnout Prevention Agent',
    responseText,
    metadata: {
      checkinId,
      riskFlag,
      modelUsed: aiResult.modelUsed,
      module: 'wellbeing'
    }
  };
}
