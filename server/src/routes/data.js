// FILE: server/src/routes/data.js
// SECURITY: OWASP A01 (UID isolation), OWASP A03 (Input validation), Directive 3 (User Isolation)
// AGENT: CRUD & Data Sync API

import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import {
  validateRequest,
  journalEntrySchema,
  taskSchema,
  habitSchema,
  adminBlockSchema,
  dateSchema,
  brainDumpSchema
} from '../middleware/inputValidator.js';
import { saveDocument, listDocuments, deleteDocument, getDocument } from '../utils/firestoreHelper.js';
import {
  getUserMemory,
  forgetMemoryItem,
  clearAllMemories,
  confirmMemoryItem,
  updateMemoryItem,
  saveCustomMemoryItem
} from '../utils/memoryManager.js';

const router = express.Router();

// Apply auth to all data routes
router.use(verifyFirebaseToken);

/**
 * GET /api/data/profile/memory
 * Returns user's private long-term memory vault (people, health, appointments, moods, themes)
 */
router.get('/profile/memory', async (req, res) => {
  const uid = req.user.uid;
  try {
    const memory = await getUserMemory(uid);
    return res.json({ success: true, memory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/data/:collectionName
 * Lists documents for the authenticated user only
 */
router.get('/:collectionName', async (req, res) => {
  const uid = req.user.uid;
  const { collectionName } = req.params;
  const allowedCollections = ['journal', 'tasks', 'kanban', 'habits', 'admin', 'dates', 'braindump', 'sessions'];

  if (!allowedCollections.includes(collectionName)) {
    return res.status(400).json({ error: 'Invalid collection specified.' });
  }

  try {
    const limit = parseInt(req.query.limit) || 100;
    const items = await listDocuments(uid, collectionName, limit);
    return res.json({ success: true, items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/journal
 */
router.post('/journal', validateRequest(journalEntrySchema), async (req, res) => {
  const uid = req.user.uid;
  const docId = `journal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await saveDocument(uid, 'journal', docId, req.validatedBody);
    return res.status(201).json({ success: true, id: docId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/tasks
 */
router.post('/tasks', validateRequest(taskSchema), async (req, res) => {
  const uid = req.user.uid;
  const docId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await saveDocument(uid, 'tasks', docId, req.validatedBody);
    return res.status(201).json({ success: true, id: docId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/habits
 */
router.post('/habits', validateRequest(habitSchema), async (req, res) => {
  const uid = req.user.uid;
  const docId = `habit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await saveDocument(uid, 'habits', docId, req.validatedBody);
    return res.status(201).json({ success: true, id: docId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/admin
 */
router.post('/admin', validateRequest(adminBlockSchema), async (req, res) => {
  const uid = req.user.uid;
  const docId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await saveDocument(uid, 'admin', docId, req.validatedBody);
    return res.status(201).json({ success: true, id: docId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/dates
 */
router.post('/dates', validateRequest(dateSchema), async (req, res) => {
  const uid = req.user.uid;
  const docId = `date_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await saveDocument(uid, 'dates', docId, req.validatedBody);
    return res.status(201).json({ success: true, id: docId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/braindump
 */
router.post('/braindump', validateRequest(brainDumpSchema), async (req, res) => {
  const uid = req.user.uid;
  const docId = `dump_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await saveDocument(uid, 'braindump', docId, req.validatedBody);
    return res.status(201).json({ success: true, id: docId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/data/:collectionName/:docId
 */
router.delete('/:collectionName/:docId', async (req, res) => {
  const uid = req.user.uid;
  const { collectionName, docId } = req.params;
  try {
    await deleteDocument(uid, collectionName, docId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/profile/reminders
 * Updates user's daily reflection and journaling reminder preferences
 */
router.post('/profile/reminders', async (req, res) => {
  const uid = req.user.uid;
  const { enabled, time, frequency, gentleMessage } = req.body || {};
  try {
    const memory = await getUserMemory(uid);
    memory.reminderSettings = {
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      time: time || '20:00',
      frequency: frequency || 'daily',
      gentleMessage: gentleMessage || 'Time for a gentle pause. How was your day?'
    };
    memory.updatedAt = new Date().toISOString();
    await saveDocument(uid, 'profile', 'memory', memory);
    return res.json({ success: true, reminderSettings: memory.reminderSettings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/profile/memory/forget
 * Removes a specific memory item for sovereignty/privacy (Improvement L)
 */
router.post('/profile/memory/forget', async (req, res) => {
  const uid = req.user.uid;
  const { category, index } = req.body || {};
  if (!category || typeof index !== 'number') {
    return res.status(400).json({ error: 'category and index are required.' });
  }

  try {
    const memory = await forgetMemoryItem(uid, category, index);
    return res.json({ success: true, memory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/profile/memory/clear
 * Clears all memories for the user
 */
router.post('/profile/memory/clear', async (req, res) => {
  const uid = req.user.uid;
  try {
    const memory = await clearAllMemories(uid);
    return res.json({ success: true, memory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/data/export/all
 * Full-fidelity export of all journal entries, memories, and reflections (Improvement L)
 */
router.get('/export/all', async (req, res) => {
  const uid = req.user.uid;
  try {
    const journalEntries = await listDocuments(uid, 'journal', 500);
    const memory = await getUserMemory(uid);
    const tasks = await listDocuments(uid, 'tasks', 200);
    const habits = await listDocuments(uid, 'habits', 100);

    return res.json({
      success: true,
      exportDate: new Date().toISOString(),
      appName: 'RICHA (Reflective Insight & Cognitive Helper Assistant)',
      userVault: {
        journalEntries,
        memory,
        tasks,
        habits
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/profile/memory/confirm
 * Confirms a pending memory receipt from chat into the permanent Memory Vault (Dimension 5)
 */
router.post('/profile/memory/confirm', async (req, res) => {
  const uid = req.user.uid;
  const { item } = req.body || {};

  if (!item || !item.category || !item.payload) {
    return res.status(400).json({ error: 'Valid memory item with category and payload is required.' });
  }

  try {
    const memory = await confirmMemoryItem(uid, item);
    return res.json({ success: true, memory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/data/profile/memory/:category/:index
 * Updates a memory fact in place (Dimension 5: Provenance & Agency)
 */
router.put('/profile/memory/:category/:index', async (req, res) => {
  const uid = req.user.uid;
  const { category, index } = req.params;
  const updatedData = req.body || {};

  try {
    const memory = await updateMemoryItem(uid, category, parseInt(index, 10), updatedData);
    return res.json({ success: true, memory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/profile/memory/custom
 * Manually adds a user fact or sensory trigger to the Memory Vault
 */
router.post('/profile/memory/custom', async (req, res) => {
  const uid = req.user.uid;
  const { category, itemData } = req.body || {};

  if (!category || !itemData) {
    return res.status(400).json({ error: 'Category and itemData are required.' });
  }

  try {
    const memory = await saveCustomMemoryItem(uid, category, itemData);
    return res.json({ success: true, memory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/data/timeline
 * Fetches unified session events timeline (Dimension 3: Persistence Model)
 */
router.get('/timeline', async (req, res) => {
  const uid = req.user.uid;
  const limit = parseInt(req.query.limit, 10) || 50;

  try {
    const events = await listDocuments(uid, 'session_events', limit, 'timestamp', 'desc');
    return res.json({ success: true, events });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
