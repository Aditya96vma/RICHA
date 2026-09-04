// FILE: src/utils/userStorage.ts
// SECURITY: OWASP A01 (User Data Isolation), Multi-Tenant Storage Partitioning

/**
 * Returns a user-partitioned localStorage key to prevent cross-user data leakage.
 */
export function getUserStorageKey(uid: string | null | undefined, key: string): string {
  const safeUid = uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '') : 'anonymous';
  return `richa_u_${safeUid}_${key}`;
}

/**
 * Retrieves a user-partitioned value from localStorage.
 */
export function getUserStorageItem(uid: string | null | undefined, key: string): string | null {
  if (typeof window === 'undefined') return null;
  const scopedKey = getUserStorageKey(uid, key);
  return localStorage.getItem(scopedKey);
}

/**
 * Sets a user-partitioned value in localStorage.
 */
export function setUserStorageItem(uid: string | null | undefined, key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const scopedKey = getUserStorageKey(uid, key);
  try {
    localStorage.setItem(scopedKey, value);
  } catch (err) {
    console.warn('[userStorage] Failed to save key:', scopedKey, err);
  }
}

/**
 * Removes a user-partitioned value from localStorage.
 */
export function removeUserStorageItem(uid: string | null | undefined, key: string): void {
  if (typeof window === 'undefined') return;
  const scopedKey = getUserStorageKey(uid, key);
  localStorage.removeItem(scopedKey);
  // Also remove legacy un-scoped key if present
  localStorage.removeItem(`richa_${key}`);
}

/**
 * Completely purges all localStorage keys belonging to a specific user,
 * as well as all legacy un-scoped richa keys, ensuring zero data persistence on logout.
 */
export function clearUserSessionStorage(uid?: string | null): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  const safeUid = uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '') : null;
  const userPrefix = safeUid ? `richa_u_${safeUid}_` : null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Check if key belongs to this user
    if (userPrefix && key.startsWith(userPrefix)) {
      keysToRemove.push(key);
    }
    // Remove anonymous or un-scoped legacy richa keys
    else if (
      key.startsWith('richa_planner_') ||
      key.startsWith('richa_draft_') ||
      key.startsWith('richa_wip_') ||
      key.startsWith('richa_last_session_') ||
      key.startsWith('richa_u_anonymous_') ||
      (!safeUid && key.startsWith('richa_u_'))
    ) {
      keysToRemove.push(key);
    }
  }

  // Remove demo user session markers
  keysToRemove.push('richa_demo_user');
  keysToRemove.push('aria_demo_user');

  for (const k of keysToRemove) {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      // ignore
    }
  }

  try {
    sessionStorage.clear();
  } catch (e) {
    // ignore
  }
}
