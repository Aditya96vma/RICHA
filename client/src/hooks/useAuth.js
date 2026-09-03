// FILE: client/src/hooks/useAuth.js
// SECURITY: Federated Auth State Hook
// AGENT: Client Authentication

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedDemo = localStorage.getItem('aria_demo_user');
    if (savedDemo) {
      setUser(JSON.parse(savedDemo));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async () => {
    if (user && typeof user.getIdToken === 'function') {
      return await user.getIdToken();
    }
    if (user && user.uid) {
      return `dev-token-${user.uid}`;
    }
    return 'dev-token-richa-demo-user';
  };

  const loginWithGoogle = async () => {
    const u = await signInWithGoogle();
    setUser(u);
  };

  const logout = async () => {
    localStorage.removeItem('richa_demo_user');
    localStorage.removeItem('aria_demo_user');
    await signOutUser();
    setUser(null);
  };

  return { user, loading, getIdToken, loginWithGoogle, logout };
}
