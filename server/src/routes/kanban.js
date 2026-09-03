// FILE: server/src/routes/kanban.js
// SECURITY: OWASP A01 (JWT auth & UID isolation), OWASP A03 (Zod validation)
// AGENT: Kanban Agent & Board Operations

import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { validateRequest, kanbanSchema } from '../middleware/inputValidator.js';
import { saveDocument, listDocuments, deleteDocument, getDocument } from '../utils/firestoreHelper.js';

const router = express.Router();

router.use(verifyFirebaseToken);

/**
 * GET /api/kanban
 * Returns all kanban cards for the authenticated user, identifying stagnant cards (>3 days in progress)
 */
router.get('/', async (req, res) => {
  const uid = req.user.uid;
  try {
    const cards = await listDocuments(uid, 'kanban', 200, 'updatedAt', 'desc');
    
    // Detect stagnation: cards in 'in_progress' for > 3 days
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    const cardsWithStagnation = cards.map((card) => {
      let isStagnant = false;
      if (card.column === 'in_progress' && card.enteredInProgressAt) {
        const inProgressTime = new Date(card.enteredInProgressAt).getTime();
        if (now - inProgressTime > threeDaysMs) {
          isStagnant = true;
        }
      }
      return { ...card, isStagnant };
    });

    return res.json({ success: true, cards: cardsWithStagnation });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/kanban
 * Creates a new kanban card
 */
router.post('/', validateRequest(kanbanSchema), async (req, res) => {
  const uid = req.user.uid;
  const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const payload = {
    ...req.validatedBody,
    enteredInProgressAt: req.validatedBody.column === 'in_progress' ? new Date().toISOString() : null
  };

  try {
    await saveDocument(uid, 'kanban', cardId, payload);
    return res.status(201).json({ success: true, id: cardId, card: { id: cardId, ...payload } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/kanban/:cardId/move
 * Moves a card to a new column and updates enteredInProgressAt accordingly
 */
router.patch('/:cardId/move', async (req, res) => {
  const uid = req.user.uid;
  const { cardId } = req.params;
  const { column } = req.body || {};

  const validColumns = ['backlog', 'this_week', 'in_progress', 'done', 'recurring'];
  if (!column || !validColumns.includes(column)) {
    return res.status(400).json({ error: 'Invalid destination column.' });
  }

  try {
    const existing = await getDocument(uid, 'kanban', cardId);
    if (!existing) {
      return res.status(404).json({ error: 'Kanban card not found.' });
    }

    const updatedData = {
      ...existing,
      column,
      enteredInProgressAt: column === 'in_progress' ? (existing.enteredInProgressAt || new Date().toISOString()) : null,
      updatedAt: new Date().toISOString()
    };

    await saveDocument(uid, 'kanban', cardId, updatedData);
    return res.json({ success: true, card: updatedData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/kanban/:cardId
 */
router.delete('/:cardId', async (req, res) => {
  const uid = req.user.uid;
  const { cardId } = req.params;
  try {
    await deleteDocument(uid, 'kanban', cardId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
