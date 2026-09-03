// FILE: server/src/routes/chat.js
// SECURITY: OWASP A01 (JWT auth), OWASP A03 (Zod validation), Directive 6.4 (Persistence & Error Handling)
// AGENT: Multi-Agent Chat API Route

import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { validateRequest, chatMessageSchema } from '../middleware/inputValidator.js';
import { classifyIntent } from '../orchestrator/intentClassifier.js';
import { routeToAgents } from '../orchestrator/agentRouter.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const router = express.Router();

/**
 * POST /api/chat
 * Multi-turn, multi-agent AI endpoint with intent classification and automatic Firestore persistence.
 */
router.post('/', verifyFirebaseToken, validateRequest(chatMessageSchema), async (req, res) => {
  const { content, sessionId = 'default-session', contextHint, voiceMode, location, history = [] } = req.validatedBody;
  // SECURITY (Directive 2): uid strictly sourced from verified JWT
  const uid = req.user.uid;
  const apiProvider = process.env.API_PROVIDER || 'gemini';

  try {
    // 1. Server-side Intent Classification (Directive 6.3 - never trust client intent claims)
    const classification = classifyIntent(content, contextHint);

    // 2. Multi-Agent Orchestration & AI Generation with Voice Mode, History, Location & Memory Context
    const agentResult = await routeToAgents(classification, content, uid, sessionId, apiProvider, { voiceMode, history, location });

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    // 3. Database Persistence (Directive 6.4): User prompt and AI response persisted together
    const savePayload = {
      messageId,
      sessionId,
      userPrompt: content,
      aiResponse: agentResult.reply,
      agentName: agentResult.agentName,
      intent: agentResult.intent,
      apiProvider,
      location: location || null,
      timestamp,
      metadata: agentResult.metadata || {}
    };

    try {
      await saveDocument(uid, 'sessions', messageId, savePayload);
    } catch (saveError) {
      console.error(`[ChatRoute] Persistence error for user ${uid}:`, saveError.message);
      // DIRECTIVE 6.4: Do NOT silently discard on save failure. Return clear error with retry context!
      return res.status(500).json({
        error: 'PersistenceFailure',
        message: 'AI generated a response but saving to Firestore failed.',
        retryContext: {
          sessionId,
          unsavedPayload: savePayload
        },
        reply: agentResult.reply,
        agentName: agentResult.agentName
      });
    }

    return res.status(200).json({
      success: true,
      messageId,
      sessionId,
      reply: agentResult.reply,
      agentName: agentResult.agentName,
      intent: agentResult.intent,
      timestamp
    });

  } catch (err) {
    console.error(`[ChatRoute] Unexpected execution error for user ${uid}:`, err);
    return res.status(500).json({
      error: 'InternalServerError',
      message: err.message || 'An error occurred while processing your request.',
      agentName: 'RICHA Core'
    });
  }
});

export default router;
