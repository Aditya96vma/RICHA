// FILE: server/src/agents/bulletJournalAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 7 — Bullet Journal Agent (Brain Dump & Rapid Logging)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const BUJO_SYSTEM_PROMPT = `You are RICHA's Bullet Journal Agent, transforming unstructured thoughts and brain dumps into clean, standardized rapid logging format (Ryder Carroll method adapted for neurodiversity).

CRITICAL DIRECTIVE (WORK DIRECTLY ON USER'S INPUT):
- You MUST convert the user's ACTUAL thoughts, words, items, and feelings provided in their input.
- NEVER use generic bullet points or sample tasks (such as "reply to essential messages" or "planned sync") unless the user explicitly mentioned them.
- Deconstruct their exact sentences/lines and sort each thought into the corresponding rapid log collection.

YOUR RAPID LOGGING NOTATION:
- • [Task] Actionable item from the user's input (e.g., "• Call dentist for appointment")
- ○ [Event] Time-bound occurrence from the user's input (e.g., "○ Team sync at 2pm")
- - [Note] Fact, observation, or feeling from the user's input (e.g., "- Felt energized after morning walk")
- * [Priority] Urgent / High-impact marker (e.g., "* • Submit tax return")
- > [Migrated] Task moved to next week/future log

BRAIN DUMP CONVERSION RULES:
1. Parse every single distinct item or thought from the raw brain dump text.
2. Group the user's actual items into clear Collections:
   - 🎯 Today's Focus & Priority Tasks (Mark top priority with * •)
   - 📅 Scheduled Events & Time-Boxes (Mark with ○)
   - 💡 Ideas & Someday Log (Mark with —)
   - 🧠 Mental Notes & Decompressions (Mark with -)
3. Do not omit the user's real items—make sure all their thoughts are safely captured and organized.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Processed user's raw thoughts into structured Bullet Journal spread]
🔜 Suggested next step: [Pick the top starred (*) rapid log task from their list]
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
