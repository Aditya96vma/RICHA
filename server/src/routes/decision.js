// FILE: server/src/routes/decision.js
// SECURITY: OWASP A01 (JWT auth & UID isolation), OWASP A03 (Input validation)
// AGENT: Decision Matrix & Suggestion Route

import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { decisionAgent } from '../agents/decisionAgent.js';
import { listDocuments } from '../utils/firestoreHelper.js';

const router = express.Router();

router.use(verifyFirebaseToken);

/**
 * POST /api/decision/evaluate
 * Evaluates a decision dilemma using state-of-the-art cognitive frameworks & MCDA
 */
router.post('/evaluate', async (req, res) => {
  const uid = req.user.uid;
  const { dilemma, history = [] } = req.body || {};

  if (!dilemma || typeof dilemma !== 'string' || !dilemma.trim()) {
    return res.status(400).json({ error: 'dilemma is required and must be non-empty.' });
  }

  try {
    const apiProvider = process.env.API_PROVIDER || 'gemini';
    const result = await decisionAgent(dilemma.trim(), uid, history, apiProvider);

    return res.status(200).json({
      success: true,
      reply: result.responseText,
      agent: result.agent,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DecisionRoute] Error evaluating dilemma:', error);
    return res.status(500).json({
      error: 'Failed to evaluate decision dilemma.',
      message: error.message
    });
  }
});

/**
 * GET /api/decision/history
 * Fetches recent decision matrices for the authenticated user
 */
router.get('/history', async (req, res) => {
  const uid = req.user.uid;
  try {
    const docs = await listDocuments(uid, 'decision_matrices', 20);
    return res.status(200).json({ success: true, matrices: docs });
  } catch (error) {
    console.warn('[DecisionRoute] Error fetching history:', error.message);
    return res.status(200).json({ success: true, matrices: [] });
  }
});

export default router;
