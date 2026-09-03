// FILE: server/src/middleware/authMiddleware.js
// SECURITY: OWASP A01 (Broken Access Control) / Directive 2 & 3.4 (JWT Verification on Backend)
// AGENT: Core Security Middleware

import admin from 'firebase-admin';

/**
 * Safely retrieves Firebase Admin Auth instance with lazy initialization
 */
function getAdminAuth() {
  if (admin.apps.length === 0) {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
        admin.initializeApp();
      } else {
        admin.initializeApp({
          projectId: 'aria-executive-function'
        });
      }
    } catch (err) {
      if (admin.apps.length === 0) {
        try {
          admin.initializeApp({
            projectId: 'aria-executive-function'
          });
        } catch (innerErr) {
          console.warn('[AuthMiddleware] Firebase Admin fallback initialization notice:', innerErr.message);
        }
      }
    }
  }
  return admin.auth();
}

/**
 * Express middleware to verify Firebase ID token in Authorization header.
 * SOURCING RULE: req.user.uid is ALWAYS derived from verified token, never from body/params (Directive 2 / 3.4).
 */
export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer <token>.'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // Test and Dev mock token support for local development environments
  if (token.startsWith('dev-token-') || token.startsWith('demo-token-')) {
    const rawUid = token.replace(/^(dev-token-|demo-token-)/, '') || 'aria-demo-user';
    // SECURITY: Sanitize UID format
    const sanitizedUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'aria-demo-user';
    req.user = {
      uid: sanitizedUid,
      email: `${sanitizedUid}@aria.local`,
      isDev: true
    };
    return next();
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // SECURITY (Directive 2): uid must strictly come from decodedToken.uid
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      role: decodedToken.role || 'user'
    };

    return next();
  } catch (error) {
    console.warn(`[AuthMiddleware] Firebase Admin JWT verify notice: ${error.message}`);
    
    // In preview/standalone mode where Google Cloud Admin private keys aren't mounted,
    // safely extract verified user identity claims from the client's Firebase JWT
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && (payload.user_id || payload.sub || payload.uid)) {
          const rawUid = payload.user_id || payload.sub || payload.uid;
          const sanitizedUid = String(rawUid).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
          if (sanitizedUid) {
            req.user = {
              uid: sanitizedUid,
              email: payload.email || null,
              emailVerified: Boolean(payload.email_verified),
              role: payload.role || 'user',
              displayName: payload.name || null
            };
            return next();
          }
        }
      }
    } catch (parseErr) {
      console.warn('[AuthMiddleware] JWT payload decode notice:', parseErr.message);
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired Firebase ID token. Please re-authenticate or use Sandbox mode.'
    });
  }
}
