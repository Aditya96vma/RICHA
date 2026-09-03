// FILE: src/hooks/useFirestore.ts
// SECURITY: Directive 2 (OWASP A01), Directive 3 (User Isolation)
// AGENT: Firestore & Data Synchronization Hook

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function useFirestore<T = any>(collectionName: string) {
  const { user, getIdToken } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ${collectionName}: ${res.statusText}`);
      }

      const result = await res.json();
      setData(result.items || []);
    } catch (err: any) {
      console.error(`[useFirestore] Error fetching ${collectionName}:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, collectionName, getIdToken]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const addDocument = async (docData: any) => {
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/data/${collectionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(docData)
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.message || 'Failed to save document.');
      }

      await fetchCollection();
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const removeDocument = async (docId: string) => {
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/data/${collectionName}/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete document.');
      }

      setData((prev) => prev.filter((item: any) => item.id !== docId));
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refresh: fetchCollection,
    addDocument,
    removeDocument
  };
}
