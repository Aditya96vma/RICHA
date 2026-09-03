// FILE: server/src/routes/chat.js
// SECURITY: OWASP A01 (JWT auth), OWASP A03 (Zod validation), Directive 6.4 (Persistence & Error Handling)
// AGENT: Multi-Agent Chat API Route

import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { validateRequest, chatMessageSchema } from '../middleware/inputValidator.js';
import { classifyIntent } from '../orchestrator/intentClassifier.js';
import { routeToAgents } from '../orchestrator/agentRouter.js';
import { saveDocument } from '../utils/firestoreHelper.js';
import { detectPendingMemories } from '../utils/memoryManager.js';

const router = express.Router();

/**
 * POST /api/chat
 * Multi-turn, multi-agent AI endpoint with intent classification, Memory Vault receipts,
 * and unified session_events audit logging.
 */
router.post('/', verifyFirebaseToken, validateRequest(chatMessageSchema), async (req, res) => {
  const { content, sessionId = 'default-session', contextHint, voiceMode, location, history = [], overrideAgent, verbosity, incognito } = req.validatedBody;
  // SECURITY (Directive 2): uid strictly sourced from verified JWT
  const uid = req.user.uid;
  const apiProvider = process.env.API_PROVIDER || 'gemini';

  try {
    // 1. Server-side Intent Classification (Directive 6.3 - never trust client intent claims)
    const classification = classifyIntent(content, contextHint);

    // 2. Multi-Agent Orchestration with options
    const agentResult = await routeToAgents(
      classification,
      content,
      uid,
      sessionId,
      apiProvider,
      { voiceMode, history, location, overrideAgent, verbosity }
    );

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    // 3. Detect Pending Memories for Ephemeral "Memory Receipts" (Dimension 5)
    let pendingMemories = [];
    try {
      pendingMemories = await detectPendingMemories(uid, content, { incognito });
    } catch (memErr) {
      console.warn('[ChatRoute] Pending memory detection warning:', memErr.message);
    }

    // 4. Database Persistence (Directive 6.4): User prompt and AI response persisted together
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

    // 5. Unified Session Event (Dimension 3: Persistence Model)
    const sessionEventPayload = {
      id: eventId,
      timestamp,
      sessionId,
      agentId: agentResult.agentName,
      actionType: 'chat_turn',
      sourceInput: content.slice(0, 300),
      writeStatus: 'executed',
      payloadRef: `sessions/${messageId}`,
      payload: {
        intent: agentResult.intent,
        confidence: agentResult.confidence,
        isBlended: Boolean(agentResult.metadata?.isBlended),
        responseSnippet: agentResult.reply.slice(0, 160)
      }
    };

    try {
      await saveDocument(uid, 'sessions', messageId, savePayload);
      // Non-blocking write to unified event stream
      saveDocument(uid, 'session_events', eventId, sessionEventPayload).catch(e => {
        console.warn('[ChatRoute] Session event logging non-critical failure:', e.message);
      });
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
      confidence: agentResult.confidence,
      pendingMemories,
      availableReroutes: agentResult.metadata?.availableReroutes || [],
      timestamp,
      metadata: agentResult.metadata || {}
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

