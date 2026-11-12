'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionResult } from '@/lib/actions/dashboard-actions';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global in-memory cache shared across the client application session.
// This allows instant switching between sibling dashboard tabs without full skeleton re-renders.
const memoryCache = new Map<string, CacheEntry<unknown>>();
const activePromises = new Map<string, Promise<ActionResult<unknown>>>();
const subscribers = new Map<string, Set<(data: unknown) => void>>();

const CACHE_TTL_MS = 20_000; // 20 seconds stale-while-revalidate window

/**
 * Invalidates the in-memory dashboard cache, forcing fresh revalidation on next access.
 */
export function invalidateDashboardCache(cacheKey?: string) {
  if (cacheKey) {
    memoryCache.delete(cacheKey);
    activePromises.delete(cacheKey);
  } else {
    memoryCache.clear();
    activePromises.clear();
  }
}

/**
 * High-performance SWR dashboard data hook with memory caching and background revalidation.
 */
export function useDashboardData<T>(
  fetcher: () => Promise<ActionResult<T>>,
  cacheKey?: string
) {
  const resolvedKey = cacheKey || fetcher.name || 'default-dashboard';
  const cached = memoryCache.get(resolvedKey) as CacheEntry<T> | undefined;

  const [data, setData] = useState<T | null>(cached ? cached.data : null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // Subscribe to updates for this cache key so sibling components stay synchronized
  useEffect(() => {
    isMountedRef.current = true;
    if (!subscribers.has(resolvedKey)) {
      subscribers.set(resolvedKey, new Set());
    }
    const keySubscribers = subscribers.get(resolvedKey)!;
    const subscriber = (newData: unknown) => {
      if (isMountedRef.current) {
        setData(newData as T);
        setIsLoading(false);
        setIsRevalidating(false);
      }
    };
    keySubscribers.add(subscriber);

    return () => {
      isMountedRef.current = false;
      keySubscribers.delete(subscriber);
      if (keySubscribers.size === 0) {
        subscribers.delete(resolvedKey);
      }
    };
  }, [resolvedKey]);

  const executeFetch = useCallback(
    async (force = false): Promise<ActionResult<T>> => {
      // Deduplicate concurrent inflight requests for the same key
      if (!force && activePromises.has(resolvedKey)) {
        return activePromises.get(resolvedKey) as Promise<ActionResult<T>>;
      }

      const promise = (async () => {
        if (isMountedRef.current) {
          setIsRevalidating(true);
        }
        try {
          const res = await fetcher();
          activePromises.delete(resolvedKey);
          if (res.success && res.data) {
            memoryCache.set(resolvedKey, {
              data: res.data,
              timestamp: Date.now(),
            });
            // Notify all active subscribers
            const keySubscribers = subscribers.get(resolvedKey);
            if (keySubscribers) {
              keySubscribers.forEach((notify) => notify(res.data));
            }
          } else if (!res.success) {
            if (isMountedRef.current) {
              setError(res.error || 'Failed to load workspace data.');
            }
          }
          return res;
        } catch (err: unknown) {
          activePromises.delete(resolvedKey);
          const msg = (err as Error).message || 'Unexpected error fetching data.';
          if (isMountedRef.current) {
            setError(msg);
          }
          return { success: false, error: msg } as ActionResult<T>;
        } finally {
          if (isMountedRef.current) {
            setIsLoading(false);
            setIsRevalidating(false);
          }
        }
      })();

      activePromises.set(resolvedKey, promise as Promise<ActionResult<unknown>>);
      return promise;
    },
    [fetcher, resolvedKey]
  );

  const refresh = useCallback(async () => {
    setError(null);
    await executeFetch(true);
  }, [executeFetch]);

  useEffect(() => {
    const currentCached = memoryCache.get(resolvedKey) as CacheEntry<T> | undefined;
    const now = Date.now();

    const timer = setTimeout(() => {
      if (!currentCached) {
        // Cold load: fetch asynchronously without blocking render
        void executeFetch(false);
      } else if (now - currentCached.timestamp > CACHE_TTL_MS) {
        // Stale-while-revalidate: background refresh
        void executeFetch(false);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [resolvedKey, executeFetch]);

  return { data, isLoading, isRevalidating, error, refresh };
}
