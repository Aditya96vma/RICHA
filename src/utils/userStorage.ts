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

/**
 * Cleanly purges any demo-generated artifacts from localStorage so that switching
 * off Demo Mode leaves a clean, non-polluted workspace.
 */
export function purgeDemoStorage(uid?: string | null): void {
  if (typeof window === 'undefined') return;

  // Clear demo-specific keys
  removeUserStorageItem(uid, 'kanban_cards_demo');

  // Strip demo cards if they were saved in the user's kanban storage
  try {
    const rawCards = getUserStorageItem(uid, 'kanban_cards');
    if (rawCards) {
      const parsed = JSON.parse(rawCards);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((c: any) => !c.id?.startsWith('demo-k-'));
        if (cleaned.length > 0) {
          setUserStorageItem(uid, 'kanban_cards', JSON.stringify(cleaned));
        } else {
          removeUserStorageItem(uid, 'kanban_cards');
        }
      }
    }
  } catch {}

  // Strip demo steps if they were saved in the user's planner storage
  try {
    const rawSteps = getUserStorageItem(uid, 'planner_steps');
    if (rawSteps) {
      const parsed = JSON.parse(rawSteps);
      if (Array.isArray(parsed)) {
        const hasDemo = parsed.some((s: any) => s.id?.startsWith('demo-step-'));
        if (hasDemo) {
          removeUserStorageItem(uid, 'planner_steps');
          removeUserStorageItem(uid, 'planner_task');
          removeUserStorageItem(uid, 'planner_task_input');
          removeUserStorageItem(uid, 'planner_plan_raw');
          removeUserStorageItem(uid, 'planner_result');
          removeUserStorageItem(uid, 'planner_suggested');
        }
      }
    }
  } catch {}

  // Clean demo habits and wellbeing
  removeUserStorageItem(uid, 'habits_demo');
  removeUserStorageItem(uid, 'wellbeing_status_demo');
  removeUserStorageItem(uid, 'latest_journal_entry_demo');
  removeUserStorageItem(uid, 'latest_chat_snippet_demo');
  removeUserStorageItem(uid, 'triage_items_demo');
  removeUserStorageItem(uid, 'life_admin_plan_demo');
  removeUserStorageItem(uid, 'bujo_spread_demo');

  emitDataUpdated('demo_purged');
}

/**
 * Emits a custom window event to synchronize data across tabs and components without page reload
 */
export function emitDataUpdated(type: string, payload?: any): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('richa_data_updated', {
        detail: { type, payload, timestamp: Date.now() }
      })
    );
  } catch (err) {
    console.warn('[userStorage] Failed to dispatch richa_data_updated:', err);
  }
}

/**
 * Retrieves stored Kanban cards for the current workspace mode
 */
export function getStoredKanbanCards(uid: string | null | undefined, isDemoMode: boolean): any[] | null {
  try {
    const key = isDemoMode ? 'kanban_cards_demo' : 'kanban_cards';
    const raw = getUserStorageItem(uid, key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Saves stored Kanban cards for the current workspace mode
 */
export function setStoredKanbanCards(uid: string | null | undefined, isDemoMode: boolean, cards: any[]): void {
  const key = isDemoMode ? 'kanban_cards_demo' : 'kanban_cards';
  if (cards && cards.length > 0) {
    setUserStorageItem(uid, key, JSON.stringify(cards));
  } else if (!isDemoMode) {
    removeUserStorageItem(uid, key);
  }
  emitDataUpdated('kanban');
}

/**
 * Retrieves stored habits for the current workspace mode
 */
export function getStoredHabits(uid: string | null | undefined, isDemoMode: boolean): any[] | null {
  try {
    const key = isDemoMode ? 'habits_demo' : 'habits';
    const raw = getUserStorageItem(uid, key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Saves stored habits for the current workspace mode
 */
export function setStoredHabits(uid: string | null | undefined, isDemoMode: boolean, habits: any[]): void {
  const key = isDemoMode ? 'habits_demo' : 'habits';
  if (habits && habits.length > 0) {
    setUserStorageItem(uid, key, JSON.stringify(habits));
  } else if (!isDemoMode) {
    removeUserStorageItem(uid, key);
  }
  emitDataUpdated('habits');
}

/**
 * Retrieves stored Planner task and micro-steps
 */
export function getStoredPlanner(uid: string | null | undefined, isDemoMode: boolean): { task: string | null; steps: any[] | null } {
  try {
    const stepsKey = isDemoMode ? 'planner_steps_demo' : 'planner_steps';
    const taskKey = isDemoMode ? 'planner_task_demo' : 'planner_task';
    const rawSteps = getUserStorageItem(uid, stepsKey);
    const task = getUserStorageItem(uid, taskKey);
    const steps = rawSteps ? JSON.parse(rawSteps) : null;
    return { task, steps: Array.isArray(steps) ? steps : null };
  } catch {
    return { task: null, steps: null };
  }
}

/**
 * Retrieves stored wellbeing status
 */
export function getStoredWellbeing(uid: string | null | undefined, isDemoMode: boolean): { mood?: string; energyLevel?: number; assessment?: string } | null {
  try {
    const key = isDemoMode ? 'wellbeing_status_demo' : 'wellbeing_status';
    const raw = getUserStorageItem(uid, key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves wellbeing status
 */
export function setStoredWellbeing(uid: string | null | undefined, isDemoMode: boolean, status: any): void {
  const key = isDemoMode ? 'wellbeing_status_demo' : 'wellbeing_status';
  setUserStorageItem(uid, key, JSON.stringify(status));
  emitDataUpdated('wellbeing');
}

/**
 * Retrieves stored journal entry & chat snippet
 */
export function getStoredJournal(uid: string | null | undefined, isDemoMode: boolean): { latestEntry?: any; snippet?: any } {
  try {
    const entryKey = isDemoMode ? 'latest_journal_entry_demo' : 'latest_journal_entry';
    const snippetKey = isDemoMode ? 'latest_chat_snippet_demo' : 'latest_chat_snippet';
    const rawEntry = getUserStorageItem(uid, entryKey);
    const rawSnippet = getUserStorageItem(uid, snippetKey);
    return {
      latestEntry: rawEntry ? JSON.parse(rawEntry) : null,
      snippet: rawSnippet ? JSON.parse(rawSnippet) : null
    };
  } catch {
    return { latestEntry: null, snippet: null };
  }
}

/**
 * Saves stored journal entry & chat snippet
 */
export function setStoredJournal(uid: string | null | undefined, isDemoMode: boolean, entry?: any, snippet?: any): void {
  if (entry) {
    const entryKey = isDemoMode ? 'latest_journal_entry_demo' : 'latest_journal_entry';
    setUserStorageItem(uid, entryKey, JSON.stringify(entry));
  }
  if (snippet) {
    const snippetKey = isDemoMode ? 'latest_chat_snippet_demo' : 'latest_chat_snippet';
    setUserStorageItem(uid, snippetKey, JSON.stringify(snippet));
  }
  emitDataUpdated('journal');
}
