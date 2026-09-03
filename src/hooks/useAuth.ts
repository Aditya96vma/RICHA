// FILE: src/hooks/useAuth.ts
// SECURITY: Directive 2 (OWASP A01), Directive 3.5 (Federated Auth Only)
// AGENT: Authentication Hook

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';

export interface AuthContextType {
  user: User | null | { uid: string; email: string; displayName: string; photoURL?: string; isDemo?: boolean };
  loading: boolean;
  getIdToken: () => Promise<string>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemoUser: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
