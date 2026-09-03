// FILE: src/lib/firebase.ts
// SECURITY: Directive 4 — Public Firebase Configs only via VITE_ env vars, no secret credentials
// AGENT: Client Authentication & Firestore Initializer

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * NOTE ON FIREBASE CLIENT SECURITY:
 * These configuration parameters (apiKey, authDomain, projectId) are PUBLIC configuration
 * identifiers used by the browser to connect to the Firebase project. They are NOT secret keys.
 * Actual data security is enforced server-side via Firebase Admin JWT verification and firestore.rules.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForRICHAExecutiveFunctionApp12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "richa-executive-journal.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "richa-executive-journal",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "richa-executive-journal.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Google Sign-In popup helper (Directive 3.5)
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('[FirebaseAuth] Google popup error:', error.message);
    throw error;
  }
}

export async function signOutUser() {
  return await fbSignOut(auth);
}
