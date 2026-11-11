'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ActionResult } from '@/lib/actions/dashboard-actions';

export function useDashboardData<T>(fetcher: () => Promise<ActionResult<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (!res.success) {
        setError(res.error || 'Failed to load workspace data.');
      } else {
        setData(res.data);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Unexpected error fetching data.');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setError(res.error || 'Failed to load workspace data.');
        } else {
          setData(res.data);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError((err as Error).message || 'Unexpected error fetching data.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetcher]);

  return { data, isLoading, error, refresh };
}

