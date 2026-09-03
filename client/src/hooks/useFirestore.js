// FILE: client/src/hooks/useFirestore.js
// SECURITY: Client Firestore Sync Hook
// AGENT: Data Layer Hook

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.js';

export function useFirestore(collectionName) {
  const { user, getIdToken } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCollection = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/data/${collectionName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setData(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, collectionName, getIdToken]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return { data, loading, error, refresh: fetchCollection };
}
