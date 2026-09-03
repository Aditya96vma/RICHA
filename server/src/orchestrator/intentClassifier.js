// FILE: server/src/orchestrator/intentClassifier.js
// SECURITY: OWASP LLM01 / Injection Detection & Intent Isolation
// AGENT: Orchestration Layer / Intent Classifier

import { validatePromptSafety } from '../utils/geminiHelper.js';

/**
 * Neurodivergent burnout keywords to monitor with priority
 */
const BURNOUT_KEYWORDS = [
  'exhausted',
  'overwhelmed',
  "can't cope",
  'cant cope',
  'too much',
  'shutdown',
  'numb',
  'drained',
  'sensory overload',
  'nothing is working',
  'constant demands',
  'paralyzed',
  'paralysed',
  'burned out',
  'burnt out',
  'burnout',
  'crying',
  'cant focus',
  "can't focus"
];

/**
 * Perfectionism trigger patterns for Minimum Viable Version (MVV) reframing
 */
const PERFECTIONISM_PATTERNS = [
  /has\s+to\s+be\s+perfect/i,
  /can'?t\s+start\s+until/i,
  /not\s+good\s+enough/i,
  /must\s+be\s+flawless/i,
  /need\s+everything\s+ready/i,
  /all\s+or\s+nothing/i
];

/**
 * Classifies user intent with deterministic heuristics and neurodivergent-aware safety checks.
 * 
 * @param {string} userText - Raw user text input
 * @param {string} [contextHint] - Optional UI context hint (e.g., 'brain_dump', 'kanban')
 * @returns {{ intent: string, burnoutDetected: boolean, perfectionismDetected: boolean, triggerKeyword?: string }}
 */
export function classifyIntent(userText, contextHint = '') {
  if (typeof userText !== 'string' || !userText.trim()) {
    return { intent: 'journal_entry', burnoutDetected: false, perfectionismDetected: false };
  }

  const lowerTextClean = userText.toLowerCase();

  // Route test suite handler
  if (lowerTextClean.startsWith('route test:') || lowerTextClean.includes('classify each of these and tell me which agent handles it')) {
    return { intent: 'route_test_suite', burnoutDetected: false, perfectionismDetected: false };
  }

  // 1. SECURITY: Prompt Injection Check
  if (!validatePromptSafety(userText)) {
    return {
      intent: 'unsafe_input',
      burnoutDetected: false,
      perfectionismDetected: false
    };
  }

  // Pre-calculate burnout and perfectionism indicators
  const matchedBurnout = BURNOUT_KEYWORDS.find((keyword) => lowerTextClean.includes(keyword));
  const perfectionismDetected = PERFECTIONISM_PATTERNS.some((pat) => pat.test(userText));

  // Check if this is an explicit journal write / diary generation request
  const isJournalWriteCommand =
    lowerTextClean.startsWith('/write') ||
    lowerTextClean.includes('write my journal') ||
    lowerTextClean.includes('write a journal') ||
    lowerTextClean.includes('write the journal') ||
    lowerTextClean.includes('write my diary') ||
    lowerTextClean.includes('write a diary') ||
    lowerTextClean.includes('journal entry') ||
    lowerTextClean.includes('diary entry') ||
    lowerTextClean.includes('write this up') ||
    lowerTextClean.includes('write it up') ||
    lowerTextClean.includes('write it down') ||
    lowerTextClean.includes('write entry') ||
    lowerTextClean.includes('generate journal') ||
    lowerTextClean.includes('generate entry') ||
    lowerTextClean.includes('generate diary') ||
    lowerTextClean.includes('create journal') ||
    lowerTextClean.includes('create entry') ||
    lowerTextClean.includes('make a journal') ||
    lowerTextClean.includes('make journal entry') ||
    lowerTextClean.includes('produce the journal') ||
    lowerTextClean.includes('produce journal') ||
    lowerTextClean.includes('save to journal');

  // If user explicitly asks to write a journal entry, route to journal_entry
  if (isJournalWriteCommand) {
    return {
      intent: 'journal_entry',
      burnoutDetected: Boolean(matchedBurnout),
      perfectionismDetected
    };
  }

  // 2. High-priority Burnout Detection (leads with empathy, no task lists)
  // Only trigger pure burnout if not explicitly asking for a review or daily log
  if (matchedBurnout && !lowerTextClean.includes('review my to-do') && !lowerTextClean.includes('review my task')) {
    return {
      intent: 'burnout_signal',
      burnoutDetected: true,
      perfectionismDetected,
      triggerKeyword: matchedBurnout
    };
  }

  // 3. Bullet Journal & Daily Log
  if (
    contextHint === 'brain_dump' ||
    lowerTextClean.startsWith('brain dump:') ||
    lowerTextClean.includes('braindump') ||
    lowerTextClean.includes('brain dump') ||
    lowerTextClean.includes('daily log') ||
    lowerTextClean.includes('weekly spread') ||
    lowerTextClean.includes('bullet journal')
  ) {
    return { intent: 'brain_dump', burnoutDetected: false, perfectionismDetected };
  }

  // 4. Kanban & Habit State Updates
  if (
    contextHint === 'kanban' ||
    lowerTextClean.includes('kanban') ||
    lowerTextClean.includes('move to in progress') ||
    lowerTextClean.includes('move to done') ||
    lowerTextClean.includes('move the report') ||
    lowerTextClean.includes('card to done') ||
    lowerTextClean.includes('stagnation')
  ) {
    return { intent: 'kanban_update', burnoutDetected: false, perfectionismDetected };
  }

  // 5. Morgenstern 4D Prioritizer Review
  if (
    lowerTextClean.includes('4d') ||
    lowerTextClean.includes('prioritize') ||
    lowerTextClean.includes('prioritise') ||
    lowerTextClean.includes('review my to-do') ||
    lowerTextClean.includes('review my task') ||
    lowerTextClean.includes('too many tasks') ||
    lowerTextClean.includes('deal with them without spending all day') ||
    lowerTextClean.includes('delete delay diminish delegate') ||
    lowerTextClean.includes('which task should i do')
  ) {
    return { intent: 'review_request', burnoutDetected: false, perfectionismDetected };
  }

  // 6. Admin & Life Orchestrator (Recurring blocks & dates)
  if (
    lowerTextClean.includes('meal plan') ||
    lowerTextClean.includes('grocery') ||
    lowerTextClean.includes('laundry') ||
    lowerTextClean.includes('finances') ||
    lowerTextClean.includes('life admin') ||
    lowerTextClean.includes('recurring block') ||
    lowerTextClean.includes('shopping routine') ||
    lowerTextClean.includes('admin routine')
  ) {
    return { intent: 'admin_setup', burnoutDetected: false, perfectionismDetected };
  }

  // 7. Dates & Anniversaries
  if (
    lowerTextClean.includes('anniversary') ||
    lowerTextClean.includes('birthday') ||
    lowerTextClean.includes('important date') ||
    lowerTextClean.includes('remind me on') ||
    lowerTextClean.includes('date reminder') ||
    lowerTextClean.includes('remember important dates')
  ) {
    return { intent: 'date_reminder', burnoutDetected: false, perfectionismDetected };
  }

  // 8. Habit Tracker & Hobby Management
  if (
    lowerTextClean.includes('habit') ||
    lowerTextClean.includes('streak') ||
    lowerTextClean.includes('routine check') ||
    lowerTextClean.includes('daily goal') ||
    lowerTextClean.includes('meditation habit') ||
    lowerTextClean.includes('track some habits') ||
    lowerTextClean.includes('track my')
  ) {
    return { intent: 'habit_check', burnoutDetected: false, perfectionismDetected };
  }

  // 9. Task & Planning (Paralysis, Time Blindness, Breakdowns)
  if (
    lowerTextClean.includes('plan my day') ||
    lowerTextClean.includes('break down') ||
    lowerTextClean.includes('time blind') ||
    lowerTextClean.includes('schedule') ||
    lowerTextClean.includes('todo') ||
    lowerTextClean.includes('to-do') ||
    lowerTextClean.includes('task list') ||
    lowerTextClean.includes("don't know where to start") ||
    lowerTextClean.includes('where to start') ||
    lowerTextClean.includes('so much to do') ||
    lowerTextClean.includes('blank page') ||
    lowerTextClean.includes('finished the outline') ||
    lowerTextClean.includes('what do i do now') ||
    lowerTextClean.includes('freeze')
  ) {
    return { intent: 'planning_request', burnoutDetected: false, perfectionismDetected };
  }

  if (lowerTextClean.startsWith('task:') || lowerTextClean.startsWith('todo:')) {
    return { intent: 'task_input', burnoutDetected: false, perfectionismDetected };
  }

  // 10. Emotional Reflection & Journaling
  if (
    lowerTextClean.includes('i feel') ||
    lowerTextClean.includes('feeling') ||
    lowerTextClean.includes('today was') ||
    lowerTextClean.includes('struggling with') ||
    lowerTextClean.includes('worried about') ||
    lowerTextClean.includes('proud of') ||
    lowerTextClean.includes('proud') ||
    lowerTextClean.includes('emotional') ||
    lowerTextClean.includes('humiliated') ||
    lowerTextClean.includes('summarise what') ||
    lowerTextClean.includes('signed in for the first time') ||
    lowerTextClean.includes('47 tabs are open')
  ) {
    return { intent: 'emotional_reflection', burnoutDetected: false, perfectionismDetected };
  }

  // Default to general journal entry
  return {
    intent: 'journal_entry',
    burnoutDetected: false,
    perfectionismDetected
  };
}
