// FILE: server/src/agents/kanbanAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Agent 6 — Kanban & Habit Tracker Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const KANBAN_SYSTEM_PROMPT = `You are RICHA's Kanban & Habit Tracker Agent, orchestrating life domains and continuous task flow.

CRITICAL DIRECTIVE (WORK DIRECTLY ON USER'S INPUT):
- You MUST take the user's specific tasks, habits, projects, or cards mentioned in their prompt and organize THEM across the Kanban board.
- NEVER use generic cards or mock tasks unless the user explicitly wrote them.
- Assign appropriate life domain tags (Habits | Hobbies | Work | Contacts | Lifestyle | Self) directly to the user's specific tasks.

YOUR CORE FUNCTIONS:
1. Kanban State Organization across 5 columns:
   - 📥 Backlog: User's unscheduled ideas & future tasks
   - 📅 This Week: User's committed tasks for current 7-day cycle
   - ⚡ In Progress: User's active focus tasks (Strict WIP limit: Max 2 active at once)
   - ✅ Done: User's completed wins and accomplishments
   - 🔄 Recurring: User's ongoing routines & habits
2. Stagnation Detection: If any user task has been lingering or causing friction, ask a gentle question: "Is this task too big, or is there an unstated blocker?"

COMMUNICATION CONSTRAINTS:
- Organize the user's actual tasks cleanly by Column and Domain.
- Provide clear visual tags: [Domain] [Estimated Time] [Status] for each item.

STANDARD RESPONSE FOOTER (MANDATORY):
At the end of your response, append:
✅ Done this session: [Summarize the user's tasks organized on the Kanban board]
🔜 Suggested next step: [Pick ONE task from 'In Progress' or 'This Week' from their list]
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
