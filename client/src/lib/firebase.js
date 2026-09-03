// FILE: client/src/lib/firebase.js
// SECURITY: Directive 4 — Public Firebase Configs only via VITE_ env vars, no secret credentials
// AGENT: Client Authentication & Firestore Initializer

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * NOTE ON FIREBASE CLIENT SECURITY:
 * These configuration values are public client identifiers injected by Vite at build time.
 * Secret keys (like GEMINI_API_KEY) are NEVER included in client bundles.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForRICHAExecutiveFunctionApp12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "richa-executive-function.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "richa-executive-function",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "richa-executive-function.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  return await fbSignOut(auth);
}
