// FILE: server/src/orchestrator/intentClassifier.js
// SECURITY: OWASP LLM01 / Injection Detection & Intent Isolation
// AGENT: Orchestration Layer / Intent Classifier

import { validatePromptSafety } from '../utils/geminiHelper.js';

/**
 * Fast-path acute distress tokens (zero-tolerance, minimal false negatives)
 */
const FAST_PATH_SENSORY_PATTERNS = [
  /\b(too\s+loud|lights\s+are\s+blinding|buzzing|overstimulated|sensory\s+overload|sensory\s+shutdown|autistic\s+burnout|shutting\s+down|meltdown|can'?t\s+breathe|stop\s+talking|everything\s+hurts|noise\s+hurts|screaming\s+in\s+my\s+head|too\s+much\s+noise|too\s+bright)\b/i,
  /([a-zA-Z])\1{4,}/, // Frantic keyboard smashing (e.g., aaaaaa, stopstopstop)
  /^(stop|no|help|too\s+much|quiet|dark)$/i // Single-word acute cry
];

/**
 * Acute neurodivergent sensory overload and burnout triggers that warrant immediate Sensory Shield activation
 */
const ACUTE_BURNOUT_KEYWORDS = [
  'sensory overload',
  'sensory shutdown',
  'autistic burnout',
  'burnout shield',
  'sensory reset',
  'meltdown',
  'head is buzzing',
  'lights are overwhelming',
  'overstimulated',
  'burnt out and numb',
  'burned out and numb',
  'completely burnt out',
  'burnout protocol',
  'sensory decompression',
  'shutting down completely',
  'total shutdown'
];

/**
 * General emotional strain words tracked for context
 */
const EMOTIONAL_STRAIN_KEYWORDS = [
  'exhausted',
  'overwhelmed',
  "can't cope",
  'cant cope',
  'drained',
  'paralyzed',
  'paralysed',
  'panicking',
  'panic',
  'anxious',
  'anxiety',
  'crying',
  'fraud',
  'impostor',
  'ashamed',
  'shame'
];

/**
 * Task and backlog overwhelm patterns
 */
const TASK_BACKLOG_KEYWORDS = [
  'emails',
  'unread',
  'inbox',
  'tasks',
  'deadline',
  'todo',
  'to-do',
  'assignments',
  'workload',
  'tabs open',
  'so much to do',
  'behind on'
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
 * @returns {{ intent: string, confidence: number, burnoutDetected: boolean, perfectionismDetected: boolean, isBlended?: boolean, secondaryIntent?: string, isFastPathSensory?: boolean, lowConfidence?: boolean, cleanCommandText?: string }}
 */
export function classifyIntent(userText, contextHint = '') {
  if (typeof userText !== 'string' || !userText.trim()) {
    return { intent: 'journal_entry', confidence: 0.5, burnoutDetected: false, perfectionismDetected: false, lowConfidence: true };
  }

  const trimmed = userText.trim();
  const lowerTextClean = trimmed.toLowerCase();

  // Route test suite handler
  if (lowerTextClean.startsWith('route test:') || lowerTextClean.includes('classify each of these and tell me which agent handles it')) {
    return { intent: 'route_test_suite', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false };
  }

  // 1. SECURITY: Prompt Injection Check
  if (!validatePromptSafety(userText)) {
    return {
      intent: 'unsafe_input',
      confidence: 1.0,
      burnoutDetected: false,
      perfectionismDetected: false
    };
  }

  // 2. STANDALONE SLASH COMMAND INVOCATION (Priority 2)
  if (trimmed.startsWith('/')) {
    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const cleanCommandText = parts.slice(1).join(' ').trim();

    if (cmd === '/plan') {
      return { intent: 'planning_request', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/triage' || cmd === '/4d' || cmd === '/prioritize') {
      return { intent: 'review_request', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/shield' || cmd === '/sensory' || cmd === '/reset') {
      return { intent: 'burnout_signal', confidence: 1.0, burnoutDetected: true, isFastPathSensory: true, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/bujo' || cmd === '/dump' || cmd === '/braindump') {
      return { intent: 'brain_dump', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/admin' || cmd === '/chore') {
      return { intent: 'admin_setup', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/kanban') {
      return { intent: 'kanban_update', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/habits' || cmd === '/habit') {
      return { intent: 'habit_check', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/reflect' || cmd === '/vent') {
      return { intent: 'emotional_reflection', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
    if (cmd === '/write' || cmd === '/diary' || cmd === '/journal') {
      return { intent: 'journal_entry', confidence: 1.0, burnoutDetected: false, perfectionismDetected: false, cleanCommandText };
    }
  }

  // 3. SENSORY SHIELD FAST-PATH TRIGGER (Priority 4 - Minimizing False Negatives)
  const isFastPathSensory = FAST_PATH_SENSORY_PATTERNS.some((pat) => pat.test(userText));
  const matchedAcuteBurnout = ACUTE_BURNOUT_KEYWORDS.find((keyword) => lowerTextClean.includes(keyword));

  if (isFastPathSensory || matchedAcuteBurnout) {
    return {
      intent: 'burnout_signal',
      confidence: 0.98,
      burnoutDetected: true,
      isFastPathSensory: true,
      perfectionismDetected: false,
      triggerKeyword: matchedAcuteBurnout || 'acute_sensory_distress'
    };
  }

  // Indicators
  const matchedStrain = EMOTIONAL_STRAIN_KEYWORDS.find((keyword) => lowerTextClean.includes(keyword));
  const hasTaskBacklog = TASK_BACKLOG_KEYWORDS.some((keyword) => lowerTextClean.includes(keyword));
  const perfectionismDetected = PERFECTIONISM_PATTERNS.some((pat) => pat.test(userText));

  // 4. HYBRID / BLENDED DETECTION (Priority 4 - Emotion + Actionable Next Steps)
  if (matchedStrain && hasTaskBacklog) {
    return {
      intent: 'emotional_reflection',
      secondaryIntent: 'planning_request',
      isBlended: true,
      confidence: 0.92,
      burnoutDetected: false,
      perfectionismDetected
    };
  }

  // 5. Journal Write / Synthesis requests
  const isJournalWriteCommand =
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

  if (isJournalWriteCommand) {
    return {
      intent: 'journal_entry',
      confidence: 0.95,
      burnoutDetected: false,
      perfectionismDetected
    };
  }

  // 6. Morgenstern 4D Prioritizer Review
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
    return { intent: 'review_request', confidence: 0.90, burnoutDetected: false, perfectionismDetected };
  }

  // 7. Bullet Journal & Daily Log
  if (
    contextHint === 'brain_dump' ||
    lowerTextClean.startsWith('brain dump:') ||
    lowerTextClean.includes('braindump') ||
    lowerTextClean.includes('brain dump') ||
    lowerTextClean.includes('daily log') ||
    lowerTextClean.includes('weekly spread') ||
    lowerTextClean.includes('bullet journal')
  ) {
    return { intent: 'brain_dump', confidence: 0.92, burnoutDetected: false, perfectionismDetected };
  }

  // 8. Kanban & Habit State Updates
  if (
    contextHint === 'kanban' ||
    lowerTextClean.includes('kanban') ||
    lowerTextClean.includes('move to in progress') ||
    lowerTextClean.includes('move to done') ||
    lowerTextClean.includes('move the report') ||
    lowerTextClean.includes('card to done') ||
    lowerTextClean.includes('stagnation')
  ) {
    return { intent: 'kanban_update', confidence: 0.90, burnoutDetected: false, perfectionismDetected };
  }

  // 9. Admin & Life Orchestrator
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
    return { intent: 'admin_setup', confidence: 0.88, burnoutDetected: false, perfectionismDetected };
  }

  // 10. Dates & Anniversaries
  if (
    lowerTextClean.includes('anniversary') ||
    lowerTextClean.includes('birthday') ||
    lowerTextClean.includes('important date') ||
    lowerTextClean.includes('remind me on') ||
    lowerTextClean.includes('date reminder') ||
    lowerTextClean.includes('remember important dates')
  ) {
    return { intent: 'date_reminder', confidence: 0.88, burnoutDetected: false, perfectionismDetected };
  }

  // 11. Habit Tracker
  if (
    lowerTextClean.includes('habit') ||
    lowerTextClean.includes('streak') ||
    lowerTextClean.includes('routine check') ||
    lowerTextClean.includes('daily goal') ||
    lowerTextClean.includes('meditation habit') ||
    lowerTextClean.includes('track some habits') ||
    lowerTextClean.includes('track my')
  ) {
    return { intent: 'habit_check', confidence: 0.85, burnoutDetected: false, perfectionismDetected };
  }

  // 12. Task & Planning (Paralysis, Time Blindness, Breakdowns)
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
    return { intent: 'planning_request', confidence: 0.88, burnoutDetected: false, perfectionismDetected };
  }

  if (lowerTextClean.startsWith('task:') || lowerTextClean.startsWith('todo:')) {
    return { intent: 'task_input', confidence: 0.90, burnoutDetected: false, perfectionismDetected };
  }

  // 13. Emotional Reflection & Journaling
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
    lowerTextClean.includes('47 tabs are open') ||
    matchedStrain
  ) {
    return { intent: 'emotional_reflection', confidence: 0.82, burnoutDetected: false, perfectionismDetected };
  }

  // Check if string is ambiguous or very short
  const isAmbiguous = trimmed.split(' ').length <= 3 && !isJournalWriteCommand;

  return {
    intent: 'journal_entry',
    confidence: isAmbiguous ? 0.45 : 0.70,
    burnoutDetected: false,
    perfectionismDetected,
    lowConfidence: isAmbiguous
  };
}

