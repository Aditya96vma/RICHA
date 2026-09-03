// FILE: server/src/utils/secretManager.js
// SECURITY: OWASP A02 / Directive 4 — Zero-Hardcoding Secret Management via Google Cloud Secret Manager
// AGENT: Core Infrastructure / All Agents

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * Accesses a secret from Google Cloud Secret Manager.
 * Falls back to process.env if running locally or in development container
 * where Secret Manager IAM or GCP_PROJECT is not bound.
 * 
 * @param {string} secretId - Name of the secret (e.g., 'GEMINI_API_KEY')
 * @param {string} versionId - Version string (default: 'latest')
 * @returns {Promise<string>} Secret value payload
 */
export async function accessSecret(secretId, versionId = 'latest') {
  // SECURITY: projectId must strictly come from environment, never hardcoded (Directive 4)
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;

  // Fallback to local environment variable if Secret Manager is not explicitly configured
  if (!projectId || process.env.USE_ENV_SECRETS === 'true') {
    const envVal = process.env[secretId];
    if (envVal) {
      return envVal;
    }
  }

  try {
    const client = new SecretManagerServiceClient();
    const name = `projects/${projectId}/secrets/${secretId}/versions/${versionId}`;
    const [response] = await client.accessSecretVersion({ name });
    
    if (!response.payload || !response.payload.data) {
      throw new Error(`Secret payload empty for secret: ${secretId}`);
    }
    
    return response.payload.data.toString('utf8');
  } catch (error) {
    // Graceful fallback to process.env during development/testing
    if (process.env[secretId]) {
      return process.env[secretId];
    }
    console.warn(`[SecretManager] Secret Manager lookup for "${secretId}" fell back to environment: ${error.message}`);
    if (process.env[secretId]) {
      return process.env[secretId];
    }
    throw new Error(`Failed to access secret "${secretId}" from Secret Manager and environment.`);
  }
}

/**
 * Saves or updates a secret in Google Cloud Secret Manager.
 * Creates the secret if it doesn't exist, then adds a new version with the payload.
 * 
 * @param {string} secretId - Name of the secret (e.g., 'GEMINI_API_KEY')
 * @param {string} secretPayload - Secret content to store
 * @returns {Promise<string>} Version name or status
 */
export async function saveSecret(secretId, secretPayload) {
  if (!secretPayload || typeof secretPayload !== 'string') {
    throw new Error('Invalid secret payload provided.');
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    // Save to process.env as fallback in sandbox/local environment
    process.env[secretId] = secretPayload;
    console.info(`[SecretManager] No GOOGLE_CLOUD_PROJECT set, saved ${secretId} to runtime process.env.`);
    return 'in-memory-v1';
  }

  try {
    const client = new SecretManagerServiceClient();
    const parent = `projects/${projectId}`;
    
    // Create secret resource if it does not yet exist
    try {
      await client.createSecret({
        parent,
        secretId,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });
    } catch (err) {
      // 409 ALREADY_EXISTS (gRPC code 6) is normal if secret is pre-existing
      if (!err.message?.includes('AlreadyExists') && err.code !== 6) {
        console.warn(`[SecretManager] createSecret notice for ${secretId}:`, err.message);
      }
    }

    // Add secret payload as a new version
    const [version] = await client.addSecretVersion({
      parent: `projects/${projectId}/secrets/${secretId}`,
      payload: {
        data: Buffer.from(secretPayload, 'utf8'),
      },
    });

    // Also update runtime process.env for current session performance
    process.env[secretId] = secretPayload;
    console.info(`[SecretManager] Successfully stored secret version for ${secretId}`);
    return version.name;
  } catch (error) {
    console.warn(`[SecretManager] Cloud Secret Manager write failed (${error.message}), saving to process.env.`);
    process.env[secretId] = secretPayload;
    return 'fallback-env-v1';
  }
}
