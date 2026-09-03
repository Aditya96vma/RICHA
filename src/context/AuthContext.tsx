// FILE: src/context/AuthContext.tsx
// SECURITY: Federated Auth via Google Sign-In & Secure Token Minting
// AGENT: Auth Context Provider

import React, { useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';
import { AuthContext, AuthContextType } from '../hooks/useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent guest/demo session
    const savedDemo = localStorage.getItem('aria_demo_user');
    if (savedDemo) {
      try {
        setUser(JSON.parse(savedDemo));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('aria_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // If not logged in and no demo user
        const demo = localStorage.getItem('richa_demo_user') || localStorage.getItem('aria_demo_user');
        if (demo) {
          setUser(JSON.parse(demo));
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
    return 'dev-token-richa-demo-user';
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('richa_demo_user');
      localStorage.removeItem('aria_demo_user');
      const fbUser = await signInWithGoogle();
      setUser(fbUser);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = () => {
    const demoUser = {
      uid: 'neurodivergent-explorer',
      email: 'alex.rivera@richa.neuro',
      displayName: 'Alex Rivera',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      isDemo: true
    };
    localStorage.setItem('richa_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = async () => {
    localStorage.removeItem('richa_demo_user');
    localStorage.removeItem('aria_demo_user');
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
