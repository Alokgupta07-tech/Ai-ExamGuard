'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'live' | 'reconnecting'

export interface RealtimeMonitoringNotice {
  eventId?: string
  eventType?: string
  riskCategory?: string
  receivedAt: string
}

export interface UseMonitoringRealtimeOptions {
  tenantId?: string | null
  enabled?: boolean
  onUpdate: () => Promise<void> | void
  throttleMs?: number
}

/**
 * Subscribes to tenant-scoped Supabase Realtime updates (`postgres_changes` + `broadcast`)
 * on `proctor_events`, `exam_sessions`, and `review_cases` so invigilators and faculty
 * receive live monitoring updates automatically without manual refreshes.
 */
export function useMonitoringRealtime({
  tenantId,
  enabled = true,
  onUpdate,
  throttleMs = 1500,
}: UseMonitoringRealtimeOptions) {
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('idle')
  const [liveUpdatesCount, setLiveUpdatesCount] = useState(0)
  const [lastNotice, setLastNotice] = useState<RealtimeMonitoringNotice | null>(null)

  const onUpdateRef = useRef(onUpdate)
  const lastRefreshAtRef = useRef(0)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!enabled || !tenantId) {
      return
    }

    const supabase = createClient()
    let active = true

    const scheduleRefresh = (notice?: RealtimeMonitoringNotice) => {
      if (!active) return
      setLiveUpdatesCount((prev) => prev + 1)
      if (notice) setLastNotice(notice)

      const now = Date.now()
      const elapsed = now - lastRefreshAtRef.current
      if (elapsed >= throttleMs) {
        lastRefreshAtRef.current = now
        void onUpdateRef.current()
        return
      }

      if (pendingTimerRef.current) return
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null
        if (!active) return
        lastRefreshAtRef.current = Date.now()
        void onUpdateRef.current()
      }, Math.max(200, throttleMs - elapsed))
    }

    const initTimer = setTimeout(() => {
      if (active) setConnectionStatus('connecting')
    }, 0)

    const channel = supabase
      .channel(`monitoring:tenant:${tenantId}`)
      .on('broadcast', { event: 'monitoring_event' }, ({ payload }: { payload: any }) => {
        const p = (payload ?? {}) as Record<string, unknown>
        scheduleRefresh({
          eventId: typeof p.eventId === 'string' ? p.eventId : undefined,
          eventType: typeof p.eventType === 'string' ? p.eventType : undefined,
          riskCategory: typeof p.riskCategory === 'string' ? p.riskCategory : undefined,
          receivedAt: new Date().toISOString(),
        })
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proctor_events',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: any) => {
          const row = (payload.new ?? {}) as Record<string, unknown>
          scheduleRefresh({
            eventId: typeof row.id === 'string' ? row.id : undefined,
            eventType: typeof row.event_type === 'string' ? row.event_type : undefined,
            receivedAt: new Date().toISOString(),
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'review_cases',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          scheduleRefresh({
            eventType: 'REVIEW_CASE_UPDATED',
            receivedAt: new Date().toISOString(),
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_sessions',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          scheduleRefresh({
            eventType: 'SESSION_RISK_UPDATED',
            receivedAt: new Date().toISOString(),
          })
        }
      )
      .subscribe((status: string) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('reconnecting')
        }
      })

    return () => {
      active = false
      clearTimeout(initTimer)
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [enabled, tenantId, throttleMs])

  return {
    connectionStatus: enabled && tenantId ? connectionStatus : 'idle',
    liveUpdatesCount,
    lastNotice,
  }
}

