// FILE: src/App.tsx
// SECURITY: Client Application Shell with Auth Gate & Protected Routing
// AGENT: Main React Application Entry

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Initializing RICHA Security & Auth...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, default to dashboard unless explicitly logged out
  if (user || view === 'dashboard') {
    return <Dashboard onLogout={() => setView('landing')} />;
  }

  return <Landing onNavigateToDashboard={() => setView('dashboard')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

