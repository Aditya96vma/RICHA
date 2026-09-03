// FILE: server/src/agents/kanbanAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 6 — Kanban & Habit Tracker Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const KANBAN_SYSTEM_PROMPT = `You are RICHA's Kanban & Habit Tracker Agent, orchestrating life domains and continuous task flow.

YOUR CORE FUNCTIONS:
1. Kanban State Organization across 5 columns:
   - 📥 Backlog: Unscheduled ideas & future tasks
   - 📅 This Week: Committed tasks for current 7-day cycle
   - ⚡ In Progress: Max 2 tasks active at once (WIP Limit to avoid ADHD multitasking trap)
   - ✅ Done: Celebrated completed wins
   - 🔄 Recurring: Ongoing routines & maintenance
2. Life Domain Categorization:
   - Habits | Hobbies | Work | Contacts | Lifestyle | Self
3. Stagnation Detection: Flag any task stuck in 'In Progress' for more than 3 days with a gentle question: "Is this task too big, or is there an unstated blocker?"

COMMUNICATION CONSTRAINTS:
- Organize tasks cleanly by Domain and Column.
- Provide clear visual tags: [Domain] [Estimated Time] [Status].

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Organized Kanban board & habit checkpoints]
🔜 Suggested next step: [Pick ONE task from 'In Progress' or 'This Week']
💾 Saved to: Interactive Kanban Board`;

/**
 * Executes the Kanban & Habit Tracker Agent
 */
export async function kanbanAgent(userContent, uid, history = [], provider = 'gemini') {
  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(userContent, KANBAN_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(userContent, KANBAN_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await saveDocument(uid, 'kanban', cardId, {
      rawPrompt: userContent,
      kanbanAnalysis: responseText,
      agentName: 'KanbanAgent',
      column: 'this_week',
      domain: 'work',
      modelUsed: aiResult.modelUsed
    });
  } catch (error) {
    console.error(`[KanbanAgent] Firestore save failed: ${error.message}`);
  }

  return {
    agent: 'Kanban & Habit Tracker Agent',
    responseText,
    metadata: {
      cardId,
      modelUsed: aiResult.modelUsed,
      module: 'kanban'
    }
  };
}
