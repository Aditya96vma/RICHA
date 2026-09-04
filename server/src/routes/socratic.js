// FILE: server/src/routes/socratic.js
// SECURITY: OWASP A01 (JWT auth & UID isolation), OWASP A03 (Input validation)
// AGENT: Socratic Reasoning & Inquiry Route

import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { socraticAgent } from '../agents/socraticAgent.js';
import { saveDocument, listDocuments } from '../utils/firestoreHelper.js';

const router = express.Router();

router.use(verifyFirebaseToken);

/**
 * POST /api/socratic/reason
 * Socratic follow-up reasoning endpoint for interactive reflection on any agent's output
 */
router.post('/reason', async (req, res) => {
  const uid = req.user.uid;
  const { userReflection, agentSource = 'general', originalTask = '', agentOutput = '', history = [] } = req.body || {};

  if (!userReflection || typeof userReflection !== 'string' || !userReflection.trim()) {
    return res.status(400).json({ error: 'userReflection is required and must be non-empty.' });
  }

  try {
    const apiProvider = process.env.API_PROVIDER || 'gemini';
    const result = await socraticAgent(
      userReflection.trim(),
      { agentSource, originalTask, agentOutput },
      uid,
      history,
      apiProvider
    );

    // Also record event in session_events for unified trail
    const eventId = `event_socratic_${Date.now()}`;
    saveDocument(uid, 'session_events', eventId, {
      id: eventId,
      timestamp: new Date().toISOString(),
      agentId: 'SocraticAgent',
      actionType: 'socratic_reasoning',
      sourceInput: userReflection.slice(0, 300),
      writeStatus: 'executed',
      payload: {
        agentSource,
        originalTask: originalTask.slice(0, 200),
        responseSnippet: result.reply.slice(0, 160)
      }
    }).catch(e => console.warn('[SocraticRoute] Event logging warning:', e.message));

    return res.status(200).json({
      success: true,
      reply: result.reply,
      probes: result.probes,
      quickReplies: result.quickReplies,
      agent: result.agent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[SocraticRoute] Error for user ${uid}:`, error);
    return res.status(500).json({
      error: 'SocraticReasoningFailure',
      message: error.message || 'Failed to process Socratic inquiry.'
    });
  }
});

/**
 * GET /api/socratic/sessions
 * Returns past Socratic reasoning sessions
 */
router.get('/sessions', async (req, res) => {
  const uid = req.user.uid;
  try {
    const items = await listDocuments(uid, 'socratic_sessions', 30);
    return res.json({ success: true, items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
