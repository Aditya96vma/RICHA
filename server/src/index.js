// FILE: server/src/index.js
// SECURITY: OWASP Top 10 Web & LLM Compliance, Directive 6.3 (Middleware Ordering & Ingestion)
// AGENT: Express Server Entry Point

import express from 'express';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat.js';
import kanbanRouter from './routes/kanban.js';
import dataRouter from './routes/data.js';
import socraticRouter from './routes/socratic.js';
import decisionRouter from './routes/decision.js';
import { getCandidateApiKeys } from './utils/geminiHelper.js';

export function createServerApp() {
  const app = express();

  // SECURITY: Enable trust proxy for reverse proxy environment (Cloud Run / Nginx / ALB)
  // Ensures express-rate-limit and IP extraction correctly identify the client IP behind reverse proxy
  app.set('trust proxy', 1);

  // SECURITY: Directive 6.3 — Body parsers MUST be mounted BEFORE all route definitions
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Security Rate Limiter (OWASP A04)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      trustProxy: false, // Explicitly configured via app.set('trust proxy', 1)
      xForwardedForHeader: false,
      forwardedHeader: false
    },
    message: {
      error: 'TooManyRequests',
      message: 'Too many requests from this client, please try again after 15 minutes.'
    }
  });

  // Health check endpoint (Public, no auth needed)
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      app: 'RICHA (Reflective Insight & Cognitive Helper Assistant)',
      apiProvider: process.env.API_PROVIDER || 'gemini',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Diagnostic status endpoint for debugging Gemini API and Firebase integration
  app.get('/api/diagnostic', (req, res) => {
    const candidateKeys = getCandidateApiKeys();
    const hasGeminiKey = candidateKeys.length > 0;
    res.status(200).json({
      geminiKeyConfigured: hasGeminiKey,
      apiProvider: process.env.API_PROVIDER ? 'configured' : 'gemini',
      host: req.headers.host || '',
      protocol: req.protocol,
      origin: req.headers.origin || `${req.protocol}://${req.headers.host}`,
      firebaseProjectId: process.env.GOOGLE_CLOUD_PROJECT || 'richa-executive-function'
    });
  });

  // Apply Rate Limiting to /api
  app.use('/api', apiLimiter);

  // Mount API Routers
  app.use('/api/chat', chatRouter);
  app.use('/api/kanban', kanbanRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/socratic', socraticRouter);
  app.use('/api/decision', decisionRouter);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('[GlobalErrorHandler]', err);
    res.status(err.status || 500).json({
      error: 'ServerError',
      message: err.message || 'An internal server error occurred.'
    });
  });

  return app;
}
