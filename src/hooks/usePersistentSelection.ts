import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A hook to manage selection state with persistence across page navigation.
 * Uses sessionStorage to keep selection within the same browser session.
 *
 * FIX (BUG-01): The lazy useState initializer handles the first mount.
 * The storageKey sync effect skips the initial render via `isMountedRef`
 * to avoid the race condition that caused immediate deselection of checkboxes.
 */
export function usePersistentSelection(storageKey: string) {
  const isMountedRef = useRef(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      } catch {
        // Ignore parse errors — start with empty selection
      }
    }
    return new Set();
  });

  // Sync state when storageKey changes (e.g. switching tabs or months).
  // Skips on initial mount — the lazy initializer above already loaded the correct state.
  useEffect(() => {
    if (!isMountedRef.current) {
      // First mount: mark as mounted. Do NOT re-read storage (lazy init already did it).
      isMountedRef.current = true;
      return;
    }
    // Subsequent key changes (tab/month switch): load stored selection for the new key
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedIds(Array.isArray(parsed) ? new Set(parsed) : new Set());
      } catch {
        setSelectedIds(new Set());
      }
    } else {
      setSelectedIds(new Set());
    }
  }, [storageKey]);

  // Persist to sessionStorage whenever selection changes
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
