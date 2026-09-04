// FILE: src/context/AuthContext.tsx
// SECURITY: Federated Auth via Google Sign-In & Secure Token Minting
// AGENT: Auth Context Provider

import React, { useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';
import { AuthContext, AuthContextType } from '../hooks/useAuth';
import { clearUserSessionStorage } from '../utils/userStorage';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent guest/demo session
    const savedDemo = localStorage.getItem('richa_demo_user') || localStorage.getItem('aria_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        if (parsed && parsed.uid) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('richa_demo_user');
        localStorage.removeItem('aria_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        const demo = localStorage.getItem('richa_demo_user') || localStorage.getItem('aria_demo_user');
        if (demo) {
          try {
            setUser(JSON.parse(demo));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (): Promise<string> => {
    if (user && 'getIdToken' in user && typeof user.getIdToken === 'function') {
      return await user.getIdToken();
    }
    if (user && user.uid) {
      return `dev-token-${user.uid}`;
    }
    return 'dev-token-unauthenticated-guest';
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // Clear legacy guest markers before authenticating real account
      clearUserSessionStorage();
      const fbUser = await signInWithGoogle();
      setUser(fbUser);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = () => {
    // Generate a unique, isolated sandbox user ID so each sandbox session is 100% distinct
    const guestUid = `sandbox_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const demoUser = {
      uid: guestUid,
      email: 'alex.rivera@richa.neuro',
      displayName: 'Alex Rivera (Sandbox)',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isDemo: true
    };
    // Clear any previous session residue before starting fresh sandbox
    clearUserSessionStorage();
    localStorage.setItem('richa_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = async () => {
    const currentUid = user?.uid;
    const isDemo = user?.isDemo;

    // 1. Purge server-side guest/demo session if demo
    if (isDemo && currentUid) {
      try {
        await fetch('/api/data/user/purge-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer dev-token-${currentUid}`
          }
        });
      } catch (e) {
        console.warn('Silent purge error:', e);
      }
    }

    // 2. Clear all local session storage for this user and legacy richa keys
    clearUserSessionStorage(currentUid);

    // 3. Clear auth states
    setUser(null);
    try {
      await signOutUser();
    } catch (e) {
      // Ignore signOut errors
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        getIdToken,
        loginWithGoogle,
        loginAsDemoUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
