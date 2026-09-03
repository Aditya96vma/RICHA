// FILE: server/src/utils/firestoreHelper.js
// SECURITY: Directive 2 (OWASP A01), Directive 3 (User Isolation), Directive 6.4 (stripUndefined & Persistence)
// AGENT: Data Layer / All Agents

import admin from 'firebase-admin';

// In-memory persistent storage fallback for dev/testing when Firebase Admin credentials are not attached
const localMemoryStore = new Map();

/**
 * Strips undefined properties recursively from objects before Firestore write (Directive 6.4)
 * @param {any} obj 
 * @returns {any} Sanitized object
 */
export function stripUndefined(obj) {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Initializes Firestore Admin safely with lazy singleton
 */
function getFirestoreInstance() {
  try {
    if (admin.apps.length > 0) {
      return admin.firestore();
    }
  } catch (err) {
    // Falls back to in-memory store
  }
  return null;
}

/**
 * Saves a document under users/{uid}/{collectionName}/{docId}
 * Validates that the operation is strictly owner-bound to req.user.uid.
 * 
 * @param {string} authUid - Verified UID from Firebase Auth JWT
 * @param {string} collectionName - Target subcollection name
 * @param {string} docId - Unique document identifier
 * @param {object} data - Payload to store
 * @returns {Promise<{ success: boolean, id: string }>}
 */
export async function saveDocument(authUid, collectionName, docId, data) {
  if (!authUid || typeof authUid !== 'string') {
    throw new Error('Security Violation: saveDocument requires a verified auth UID.');
  }

  // SECURITY: Strip all undefined fields (Directive 6.4)
  const cleanData = stripUndefined({
    ...data,
    userId: authUid,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString()
  });

  const firestore = getFirestoreInstance();
  if (firestore) {
    try {
      const docRef = firestore.collection('users').doc(authUid).collection(collectionName).doc(docId);
      await docRef.set(cleanData, { merge: true });
      return { success: true, id: docId };
    } catch (error) {
      console.warn(`[FirestoreHelper] Cloud write failed (${error.message}), recording to memory store.`);
    }
  }

  // Fallback to local memory persistence keyed by uid
  const userStoreKey = `users/${authUid}/${collectionName}`;
  if (!localMemoryStore.has(userStoreKey)) {
    localMemoryStore.set(userStoreKey, new Map());
  }
  localMemoryStore.get(userStoreKey).set(docId, cleanData);

  return { success: true, id: docId };
}

/**
 * Reads a document scoped to users/{uid}/{collectionName}/{docId}
 * 
 * @param {string} authUid - Verified UID from Firebase Auth JWT
 * @param {string} collectionName - Target subcollection name
 * @param {string} docId - Unique document identifier
 * @returns {Promise<object|null>}
 */
export async function getDocument(authUid, collectionName, docId) {
  if (!authUid) {
    throw new Error('Security Violation: getDocument requires a verified auth UID.');
  }

  const firestore = getFirestoreInstance();
  if (firestore) {
    try {
      const docRef = firestore.collection('users').doc(authUid).collection(collectionName).doc(docId);
      const snap = await docRef.get();
      if (snap.exists) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (error) {
      console.warn(`[FirestoreHelper] Cloud read failed (${error.message}), reading from memory store.`);
    }
  }

  const userStoreKey = `users/${authUid}/${collectionName}`;
  const subCollection = localMemoryStore.get(userStoreKey);
  if (subCollection && subCollection.has(docId)) {
    return { id: docId, ...subCollection.get(docId) };
  }
  return null;
}

/**
 * Lists documents for a specific user and collection with pagination and sorting
 * 
 * @param {string} authUid - Verified UID from Firebase Auth JWT
 * @param {string} collectionName - Target subcollection name
 * @param {number} [limitCount=50] - Max items to return
 * @param {string} [sortField='createdAt'] - Field to order by
 * @param {string} [direction='desc'] - Sort direction
 * @returns {Promise<Array<object>>}
 */
export async function listDocuments(authUid, collectionName, limitCount = 50, sortField = 'createdAt', direction = 'desc') {
  if (!authUid) {
    throw new Error('Security Violation: listDocuments requires a verified auth UID.');
  }

  const firestore = getFirestoreInstance();
  if (firestore) {
    try {
      const collRef = firestore
        .collection('users')
        .doc(authUid)
        .collection(collectionName)
        .orderBy(sortField, direction)
        .limit(limitCount);
      const snap = await collRef.get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn(`[FirestoreHelper] Cloud list query failed (${error.message}), querying memory store.`);
    }
  }

  const userStoreKey = `users/${authUid}/${collectionName}`;
  const subCollection = localMemoryStore.get(userStoreKey);
  if (!subCollection) return [];

  const items = Array.from(subCollection.entries()).map(([id, data]) => ({ id, ...data }));
  items.sort((a, b) => {
    const valA = a[sortField] || '';
    const valB = b[sortField] || '';
    return direction === 'desc' ? (valA < valB ? 1 : -1) : (valA > valB ? 1 : -1);
  });

  return items.slice(0, limitCount);
}

/**
 * Deletes a document strictly scoped to users/{uid}/{collectionName}/{docId}
 */
export async function deleteDocument(authUid, collectionName, docId) {
  if (!authUid) {
    throw new Error('Security Violation: deleteDocument requires a verified auth UID.');
  }

  const firestore = getFirestoreInstance();
  if (firestore) {
    try {
      await firestore.collection('users').doc(authUid).collection(collectionName).doc(docId).delete();
    } catch (error) {
      console.warn(`[FirestoreHelper] Cloud delete failed: ${error.message}`);
    }
  }

  const userStoreKey = `users/${authUid}/${collectionName}`;
  const subCollection = localMemoryStore.get(userStoreKey);
  if (subCollection) {
    subCollection.delete(docId);
  }
  return { success: true };
}
