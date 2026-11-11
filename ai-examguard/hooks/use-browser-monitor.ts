'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { generateClientEventUuid } from '@/lib/proctoring/client-event'
import type { EventSeverity } from '@/types/database'
import type { BrowserMonitorSnapshot, ProctorMonitoringEventType } from '@/types/proctoring'

export interface UseBrowserMonitorOptions {
  examId: string
  sessionId?: string | null
  enabled: boolean
  requireFullscreen: boolean
  isOnline: boolean
  reportEvents?: boolean
}

interface QueuedInterruption {
  clientEventId: string
  interruptedAt: string
  recoveredAt: string
  durationMs: number
}

const INITIAL_BROWSER_SNAPSHOT: BrowserMonitorSnapshot = {
  isTabVisible: true,
  isPageFocused: true,
  fullscreenActive: false,
  fullscreenSupported: true,
  visibilitySupported: true,
  isOnline: true,
  tabHiddenCount: 0,
  focusLossCount: 0,
  fullscreenExitCount: 0,
  connectionInterruptionCount: 0,
  pendingQueuedInterruptions: 0,
}

export function useBrowserMonitor({
  examId,
  sessionId = null,
  enabled,
  requireFullscreen,
  isOnline,
  reportEvents = true,
}: UseBrowserMonitorOptions) {
  const [snapshot, setSnapshot] = useState<BrowserMonitorSnapshot>(() => ({
    ...INITIAL_BROWSER_SNAPSHOT,
    isTabVisible: typeof document !== 'undefined' ? !document.hidden : true,
    isPageFocused:
      typeof document !== 'undefined' && typeof document.hasFocus === 'function'
        ? document.hasFocus()
        : true,
    fullscreenActive:
      typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false,
    fullscreenSupported:
      typeof document !== 'undefined' ? Boolean(document.fullscreenEnabled) : true,
    visibilitySupported:
      typeof document !== 'undefined' ? typeof document.visibilityState === 'string' : true,
    isOnline,
  }))

  const mountedRef = useRef(true)
  const reportEventsRef = useRef(reportEvents)
  const sessionIdRef = useRef(sessionId)
  const examIdRef = useRef(examId)
  const requireFullscreenRef = useRef(requireFullscreen)
  const wasFullscreenActiveRef = useRef(false)
  const offlineStartedAtRef = useRef<number | null>(null)
  const queuedInterruptionsRef = useRef<QueuedInterruption[]>([])
  const lastTabHiddenSentAtRef = useRef(0)
  const lastFullscreenExitSentAtRef = useRef(0)

  useEffect(() => {
    reportEventsRef.current = reportEvents
    sessionIdRef.current = sessionId
    examIdRef.current = examId
    requireFullscreenRef.current = requireFullscreen
  }, [reportEvents, sessionId, examId, requireFullscreen])

  const postBrowserEvent = useCallback(
    async (payload: {
      clientEventId?: string
      occurredAt?: string
      eventType: Extract<
        ProctorMonitoringEventType,
        'TAB_HIDDEN' | 'FULLSCREEN_EXIT' | 'SESSION_CONNECTION_INTERRUPTED'
      >
      severity: EventSeverity
      confidence: number
      sustainedDurationMs?: number
      details: Record<string, unknown>
    }) => {
      if (!reportEventsRef.current) return false
      try {
        const res = await fetch(`/api/student/exams/${examIdRef.current}/proctor-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEventId: payload.clientEventId ?? generateClientEventUuid(),
            sessionId: sessionIdRef.current ?? null,
            context: 'active_exam',
            eventType: payload.eventType,
            sourceModule: 'browser_visibility',
            timestamp: payload.occurredAt ?? new Date().toISOString(),
            durationMs: payload.sustainedDurationMs ?? null,
            modelVersion: 'browser-visibility-api-v1',
            severity: payload.severity,
            confidence: payload.confidence,
            details: payload.details,
          }),
        })
        return res.ok
      } catch {
        return false
      }
    },
    []
  )

  const flushQueuedInterruptions = useCallback(async () => {
    if (queuedInterruptionsRef.current.length === 0) return
    const pending = [...queuedInterruptionsRef.current]
    const remaining: QueuedInterruption[] = []

    for (const item of pending) {
      const ok = await postBrowserEvent({
        clientEventId: item.clientEventId,
        occurredAt: item.interruptedAt,
        eventType: 'SESSION_CONNECTION_INTERRUPTED',
        severity: 'low',
        confidence: 0.99,
        sustainedDurationMs: item.durationMs,
        details: {
          interruptedAt: item.interruptedAt,
          recoveredAt: item.recoveredAt,
          durationMs: item.durationMs,
          flushedOnReconnect: true,
        },
      })
      if (!ok) remaining.push(item)
    }

    queuedInterruptionsRef.current = remaining
    if (mountedRef.current) {
      setSnapshot((prev) => ({
        ...prev,
        pendingQueuedInterruptions: remaining.length,
      }))
    }
  }, [postBrowserEvent])

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) {
      return () => {
        mountedRef.current = false
      }
    }

    wasFullscreenActiveRef.current =
      typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false

    const syncInitial = async () => {
      await Promise.resolve()
      if (!mountedRef.current) return
      setSnapshot((prev) => ({
        ...prev,
        isTabVisible: !document.hidden,
        isPageFocused:
          typeof document.hasFocus === 'function' ? document.hasFocus() : true,
        fullscreenActive: Boolean(document.fullscreenElement),
        fullscreenSupported: Boolean(document.fullscreenEnabled),
        visibilitySupported: typeof document.visibilityState === 'string',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : isOnline,
      }))
    }
    void syncInitial()

    const handleVisibilityChange = () => {
      const visible = !document.hidden
      if (!mountedRef.current) return
      setSnapshot((prev) => ({
        ...prev,
        isTabVisible: visible,
        tabHiddenCount: visible ? prev.tabHiddenCount : prev.tabHiddenCount + 1,
      }))

      if (!visible) {
        const now = Date.now()
        if (now - lastTabHiddenSentAtRef.current > 4000) {
          lastTabHiddenSentAtRef.current = now
          void postBrowserEvent({
            eventType: 'TAB_HIDDEN',
            severity: 'medium',
            confidence: 0.98,
            details: {
              visibilityState: document.visibilityState,
              pageFocused:
                typeof document.hasFocus === 'function' ? document.hasFocus() : null,
            },
          })
        }
      }
    }

    const handleBlur = () => {
      if (!mountedRef.current) return
      setSnapshot((prev) => ({
        ...prev,
        isPageFocused: false,
        focusLossCount: prev.focusLossCount + 1,
      }))
    }

    const handleFocus = () => {
      if (!mountedRef.current) return
      setSnapshot((prev) => ({
        ...prev,
        isPageFocused: true,
      }))
    }

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement)
      const exited = !active && (wasFullscreenActiveRef.current || requireFullscreenRef.current)
      wasFullscreenActiveRef.current = active
      if (!mountedRef.current) return

      setSnapshot((prev) => ({
        ...prev,
        fullscreenActive: active,
        fullscreenExitCount: exited ? prev.fullscreenExitCount + 1 : prev.fullscreenExitCount,
      }))

      if (exited) {
        const now = Date.now()
        if (now - lastFullscreenExitSentAtRef.current > 4000) {
          lastFullscreenExitSentAtRef.current = now
          void postBrowserEvent({
            eventType: 'FULLSCREEN_EXIT',
            severity: 'medium',
            confidence: 0.99,
            details: {
              requireFullscreen: requireFullscreenRef.current,
              fullscreenEnabled: Boolean(document.fullscreenEnabled),
            },
          })
        }
      }
    }

    const handleOffline = () => {
      if (offlineStartedAtRef.current === null) {
        offlineStartedAtRef.current = Date.now()
      }
      if (!mountedRef.current) return
      setSnapshot((prev) => ({
        ...prev,
        isOnline: false,
        connectionInterruptionCount: prev.connectionInterruptionCount + 1,
      }))
    }

    const handleOnline = () => {
      const interruptedAtMs = offlineStartedAtRef.current
      offlineStartedAtRef.current = null
      if (interruptedAtMs !== null) {
        const now = Date.now()
        const interruption: QueuedInterruption = {
          clientEventId: generateClientEventUuid(),
          interruptedAt: new Date(interruptedAtMs).toISOString(),
          recoveredAt: new Date(now).toISOString(),
          durationMs: Math.max(0, now - interruptedAtMs),
        }
        queuedInterruptionsRef.current.push(interruption)
      }
      if (!mountedRef.current) return
      setSnapshot((prev) => ({
        ...prev,
        isOnline: true,
        pendingQueuedInterruptions: queuedInterruptionsRef.current.length,
      }))
      void flushQueuedInterruptions()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [enabled, flushQueuedInterruptions, isOnline, postBrowserEvent])

  const recordSyncConnectionDrop = useCallback(
    (reason: string) => {
      if (!enabled) return
      const nowIso = new Date().toISOString()
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (offlineStartedAtRef.current === null) {
          offlineStartedAtRef.current = Date.now()
        }
        return
      }
      void postBrowserEvent({
        eventType: 'SESSION_CONNECTION_INTERRUPTED',
        severity: 'low',
        confidence: 0.9,
        details: {
          interruptedAt: nowIso,
          reason,
        },
      })
    },
    [enabled, postBrowserEvent]
  )

  return {
    snapshot: enabled
      ? snapshot
      : {
          ...INITIAL_BROWSER_SNAPSHOT,
          isOnline,
        },
    recordSyncConnectionDrop,
  }
}

