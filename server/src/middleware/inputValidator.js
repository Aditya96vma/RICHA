// FILE: server/src/middleware/inputValidator.js
// SECURITY: OWASP A03 / LLM02 — Input Validation & Sanitization via Zod schemas
// AGENT: Core Middleware / Validation Layer

import { z } from 'zod';

/**
 * Chat message schema for multi-agent interaction
 */
export const chatMessageSchema = z.object({
  content: z.string().max(8000, 'Content exceeds 8000 characters limit').optional(),
  message: z.string().max(8000, 'Message exceeds 8000 characters limit').optional(),
  sessionId: z.string().max(128).optional().default('default-session'),
  contextHint: z.string().max(64).optional(),
  voiceMode: z.boolean().optional().default(false),
  location: z.object({
    placeName: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    city: z.string().max(100).optional()
  }).optional(),
  history: z.array(z.object({
    sender: z.string().max(32),
    text: z.string().max(8000)
  })).optional().default([]),
  clientTimestamp: z.string().max(64).optional()
}).transform((data) => ({
  content: (data.content || data.message || '').trim(),
  sessionId: data.sessionId,
  contextHint: data.contextHint,
  voiceMode: Boolean(data.voiceMode),
  location: data.location,
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
  title: z.string().max(200).optional().default('Journal Entry'),
  content: z.string().min(1, 'Journal content cannot be empty').max(10000),
  mood: z.enum(['calm', 'focused', 'overwhelmed', 'tired', 'anxious', 'proud', 'neutral', 'happy', 'excited', 'sad', 'lowest', 'happiest']).optional().default('neutral'),
  energyLevel: z.number().int().min(1).max(5).optional().default(3),
  emotionalLandmark: z.enum(['happiest', 'lowest', 'proud', 'calm', 'neutral', 'breakthrough']).optional().default('neutral'),
  location: z.object({
    placeName: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional()
  }).optional(),
  tags: z.array(z.string().max(32)).max(10).optional().default([])
});

/**
 * Planner task schema
 */
export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(300),
  description: z.string().max(2000).optional().default(''),
  durationMinutes: z.number().int().min(5).max(480).optional().default(25),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  energyRequired: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional().default('pending'),
  dueDate: z.string().max(64).optional(),
  category: z.string().max(50).optional().default('general')
});

/**
 * Kanban board item schema
 */
export const kanbanSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(300),
  description: z.string().max(2000).optional().default(''),
  column: z.enum(['backlog', 'this_week', 'in_progress', 'done', 'recurring']),
  domain: z.enum(['habits', 'hobbies', 'work', 'contacts', 'lifestyle', 'self']).optional().default('work'),
  enteredInProgressAt: z.string().max(64).nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  timeEstimateMinutes: z.number().int().min(1).max(480).optional().default(30)
});

/**
 * Habit tracking schema
 */
export const habitSchema = z.object({
  title: z.string().min(1, 'Habit title is required').max(200),
  frequency: z.enum(['daily', 'weekly', 'weekdays', 'weekends']).optional().default('daily'),
  domain: z.enum(['habits', 'hobbies', 'work', 'contacts', 'lifestyle', 'self']).optional().default('habits'),
  targetDaysPerWeek: z.number().int().min(1).max(7).optional().default(7),
  currentStreak: z.number().int().min(0).optional().default(0),
  completedDates: z.array(z.string().max(16)).max(365).optional().default([])
});

/**
 * Recurring Life Admin block schema
 */
export const adminBlockSchema = z.object({
  title: z.string().min(1, 'Admin title is required').max(200),
  category: z.enum(['meal_planning', 'grocery', 'laundry', 'finances', 'admin', 'maintenance', 'relationships']),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  durationMinutes: z.number().int().min(5).max(240).optional().default(30),
  focusInstructions: z.string().max(1000).optional().default(''),
  nextScheduledDate: z.string().max(64).optional()
});

/**
 * Date / Anniversary reminder schema
 */
export const dateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  date: z.string().min(1, 'Date string is required').max(64),
  type: z.enum(['birthday', 'anniversary', 'deadline', 'event', 'renewal']),
  reminderDaysBefore: z.number().int().min(0).max(30).optional().default(3),
  notes: z.string().max(1000).optional().default('')
});

/**
 * Brain dump collection schema
 */
export const brainDumpSchema = z.object({
  rawContent: z.string().min(1, 'Brain dump content cannot be empty').max(10000),
  processedItems: z.array(z.object({
    text: z.string().max(500),
    category: z.string().max(50),
    actionType: z.string().max(50)
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
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Input validation failed. Please correct the payload fields.',
        details: formattedErrors
      });
    }

    // Attach validated and sanitized data to request
    req.validatedBody = result.data;
    return next();
  };
}
