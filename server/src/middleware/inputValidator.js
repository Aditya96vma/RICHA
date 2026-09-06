// FILE: server/src/middleware/inputValidator.js
// SECURITY: OWASP A03 / LLM02 — Input Validation & Sanitization via Zod schemas
// AGENT: Core Middleware / Validation Layer

import { z } from 'zod';

/**
 * Chat message schema for multi-agent interaction
 */
export const chatMessageSchema = z.object({
  content: z.string().max(16000, 'Content exceeds character limit').optional(),
  message: z.string().max(16000, 'Message exceeds character limit').optional(),
  sessionId: z.string().max(256).nullable().optional().default('default-session'),
  contextHint: z.string().max(128).nullable().optional(),
  voiceMode: z.boolean().optional().default(false),
  overrideAgent: z.string().max(128).nullable().optional(),
  verbosity: z.enum(['low', 'balanced', 'deep', 'micro', 'standard']).optional().default('standard'),
  incognito: z.boolean().optional().default(false),
  location: z.object({
    placeName: z.string().max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    lat: z.number().min(-90).max(90).optional(),
    long: z.number().min(-180).max(180).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional()
  }).nullable().optional(),
  history: z.array(z.union([
    z.object({
      sender: z.string().max(128).optional(),
      text: z.string().max(50000).optional()
    }).transform(m => ({ sender: m.sender || 'user', text: m.text || '' })),
    z.object({
      role: z.string().max(128).optional(),
      content: z.string().max(50000).optional()
    }).transform(m => ({ sender: m.role || 'user', text: m.content || '' })),
    z.object({
      role: z.string().max(128).optional(),
      text: z.string().max(50000).optional()
    }).transform(m => ({ sender: m.role || 'user', text: m.text || '' })),
    z.object({
      sender: z.string().max(128).optional(),
      content: z.string().max(50000).optional()
    }).transform(m => ({ sender: m.sender || 'user', text: m.content || '' })),
    z.record(z.any()).transform(m => ({
      sender: String(m.sender || m.role || 'user').slice(0, 128),
      text: String(m.text || m.content || '').slice(0, 50000)
    }))
  ])).optional().default([]),
  clientTimestamp: z.string().max(64).optional()
}).transform((data) => ({
  content: (data.content || data.message || '').trim(),
  sessionId: data.sessionId || 'default-session',
  contextHint: data.contextHint || undefined,
  voiceMode: Boolean(data.voiceMode),
  overrideAgent: data.overrideAgent || undefined,
  verbosity: (data.verbosity === 'micro' ? 'low' : data.verbosity === 'standard' ? 'balanced' : data.verbosity) || 'balanced',
  incognito: Boolean(data.incognito),
  location: data.location ? {
    placeName: data.location.placeName || 'Current Location',
    latitude: data.location.latitude ?? data.location.lat,
    longitude: data.location.longitude ?? data.location.long,
    city: data.location.city,
    country: data.location.country
  } : null,
  history: Array.isArray(data.history) ? data.history : [],
  clientTimestamp: data.clientTimestamp
})).refine((data) => data.content.length > 0, {
  message: 'Content or message cannot be empty',
  path: ['content']
});

/**
 * Emotional journal entry schema with Geo-tagging & Feeling Analysis
 */
export const journalEntrySchema = z.object({
  title: z.string().max(250).optional().default('Journal Entry'),
  content: z.string().max(20000).optional(),
  entryText: z.string().max(20000).optional(),
  mood: z.string().max(64).optional().default('neutral'),
  energyLevel: z.number().min(1).max(5).optional().default(3),
  emotionalLandmark: z.string().max(64).optional().default('neutral'),
  location: z.any().nullable().optional(),
  tags: z.array(z.string().max(64)).optional().default([]),
  sentimentScore: z.number().optional()
}).transform((data) => ({
  ...data,
  content: (data.content || data.entryText || '').trim()
})).refine((data) => data.content.length > 0, {
  message: 'Journal content or entryText cannot be empty',
  path: ['content']
});

/**
 * Planner task schema
 */
export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  description: z.string().max(5000).optional().default(''),
  durationMinutes: z.number().min(1).max(1440).optional().default(25),
  priority: z.string().max(32).optional().default('medium'),
  energyRequired: z.string().max(32).optional().default('medium'),
  status: z.string().max(32).optional().default('pending'),
  dueDate: z.string().max(64).nullable().optional(),
  category: z.string().max(100).optional().default('general')
});

/**
 * Kanban board item schema
 */
export const kanbanSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(500),
  description: z.string().max(5000).optional().default(''),
  column: z.enum(['backlog', 'this_week', 'in_progress', 'done', 'recurring', 'blocked']).optional().default('backlog'),
  domain: z.string().max(64).optional().default('work'),
  enteredInProgressAt: z.string().max(64).nullable().optional(),
  priority: z.string().max(32).optional().default('medium'),
  timeEstimateMinutes: z.number().min(1).max(1440).optional().default(30)
});

/**
 * Habit tracking schema
 */
export const habitSchema = z.object({
  title: z.string().min(1, 'Habit title is required').max(300),
  frequency: z.string().max(32).optional().default('daily'),
  domain: z.string().max(64).optional().default('habits'),
  targetDaysPerWeek: z.number().min(1).max(7).optional().default(7),
  currentStreak: z.number().optional().default(0),
  completedDates: z.array(z.string().max(32)).optional().default([])
});

/**
 * Recurring Life Admin block schema
 */
export const adminBlockSchema = z.object({
  title: z.string().min(1, 'Admin title is required').max(300),
  category: z.string().max(64).optional().default('admin'),
  frequency: z.string().max(32).optional().default('weekly'),
  durationMinutes: z.number().min(1).max(1440).optional().default(30),
  focusInstructions: z.string().max(2000).optional().default(''),
  nextScheduledDate: z.string().max(64).nullable().optional()
});

/**
 * Date / Anniversary reminder schema
 */
export const dateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  date: z.string().min(1, 'Date string is required').max(64),
  type: z.string().max(64).optional().default('event'),
  reminderDaysBefore: z.number().min(0).max(365).optional().default(3),
  notes: z.string().max(2000).optional().default('')
});

/**
 * Brain dump collection schema
 */
export const brainDumpSchema = z.object({
  rawContent: z.string().min(1, 'Brain dump content cannot be empty').max(20000),
  processedItems: z.array(z.object({
    text: z.string().max(1000),
    category: z.string().max(100).optional(),
    actionType: z.string().max(100).optional()
  })).optional().default([])
});

/**
 * Higher-order middleware factory for Zod validation (OWASP A03 / LLM02)
 * @param {z.ZodSchema} schema 
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    // Null-safe payload ingestion (Directive 6.3)
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const result = schema.safeParse(payload);

    if (!result.success) {
      const errs = result.error?.issues || result.error?.errors || [];
      const formattedErrors = errs.map((err) => ({
        path: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message
      }));
      console.warn('[validateRequest] Input validation failed:', formattedErrors);
      const detailMsg = formattedErrors.map(e => `${e.path || 'payload'}: ${e.message}`).join(', ');
      return res.status(400).json({
        error: 'Bad Request',
        message: `Input validation failed (${detailMsg}). Please check the input.`,
        details: formattedErrors
      });
    }

    // Attach validated and sanitized data to request
    req.validatedBody = result.data;
    return next();
  };
}
