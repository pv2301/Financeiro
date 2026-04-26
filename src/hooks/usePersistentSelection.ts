import { useState, useEffect, useCallback } from 'react';

/**
 * A hook to manage selection state with persistence across page navigation.
 * Uses sessionStorage to keep selection within the same browser session.
 */
export function usePersistentSelection(storageKey: string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      } catch (e) {
        console.error('Error parsing stored selection:', e);
      }
    }
    return new Set();
  });

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelectedIds(new Set(parsed));
        } else {
          setSelectedIds(new Set());
        }
      } catch (e) {
        setSelectedIds(new Set());
      }
    } else {
      setSelectedIds(new Set());
    }
  }, [storageKey]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds, storageKey]);

  const toggleId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      if (prev.size === ids.length) {
        return new Set();
      } else {
        return new Set(ids);
      }
    });
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    toggleId,
    toggleAll,
    selectAll,
    clearAll
  };
}
