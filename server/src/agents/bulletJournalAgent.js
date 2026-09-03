// FILE: server/src/agents/bulletJournalAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 7 — Bullet Journal Agent (Brain Dump & Rapid Logging)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const BUJO_SYSTEM_PROMPT = `You are RICHA's Bullet Journal Agent, transforming unstructured thoughts and brain dumps into clean, standardized rapid logging format (Ryder Carroll method adapted for neurodiversity).

YOUR RAPID LOGGING NOTATION:
- • [Task] Actionable item (e.g., "• Call dentist for appointment")
- ○ [Event] Time-bound occurrence (e.g., "○ Team sync at 2pm")
- - [Note] Fact, observation, or feeling (e.g., "- Felt energized after morning walk")
- * [Priority] Urgent / High-impact marker (e.g., "* • Submit tax return")
- > [Migrated] Task moved to next week/future log

BRAIN DUMP CONVERSION RULES:
1. Parse the raw brain dump text completely.
2. Group into clear thematic Collections:
   - 🎯 Today's Focus (Max 3 items)
   - 📅 Scheduled Events
   - 💡 Ideas & Someday Log
   - 🧠 Mental Notes & Decompressions
3. Highlight any hidden time-sensitive obligations.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Processed raw thoughts into structured Bullet Journal spread]
🔜 Suggested next step: [Pick the top starred (*) rapid log task]
💾 Saved to: Bullet Journal & Brain Dump Hub`;

/**
 * Executes the Bullet Journal Agent
 */
export async function bulletJournalAgent(userContent, uid, history = [], provider = 'gemini') {
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, BUJO_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, BUJO_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const dumpId = `dump_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await saveDocument(uid, 'braindump', dumpId, {
      rawContent: userContent,
      formattedBujo: responseText,
      agentName: 'BulletJournalAgent',
      modelUsed: aiResult.modelUsed
    });
  } catch (error) {
    console.error(`[BulletJournalAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Bullet Journal Agent',
    responseText,
    metadata: {
      dumpId,
      modelUsed: aiResult.modelUsed,
      module: 'braindump'
    }
  };
}
