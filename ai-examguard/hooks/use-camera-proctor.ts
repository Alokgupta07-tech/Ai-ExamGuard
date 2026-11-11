'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LocalMediaPipeFaceMonitor,
  MediaPipeModelError,
} from '@/lib/proctoring/mediapipe-face-monitor'
import { generateClientEventUuid } from '@/lib/proctoring/client-event'
import { TemporalProctorFilter } from '@/lib/proctoring/temporal-filter'
import type {
  CameraMonitorSnapshot,
  ProctorMonitoringEventType,
  ProctorTelemetryEntry,
} from '@/types/proctoring'
import type { EventSeverity } from '@/types/database'

export interface UseCameraProctorOptions {
  examId: string
  sessionId?: string | null
  context: 'preflight' | 'active_exam'
  enabled: boolean
  /** Disable emitting telemetry events (e.g. once exam submission has started) */
  reportEvents?: boolean
}

const TARGET_FRAME_INTERVAL_MS = 200 // ~5 FPS keeps CPU/GPU overhead low while preserving temporal responsiveness
const INITIAL_SNAPSHOT: CameraMonitorSnapshot = {
  cameraStatus: 'idle',
  modelStatus: 'idle',
  faceStatus: 'uninitialized',
  cameraLabel: null,
  errorMessage: null,
  modelDelegate: null,
  metrics: null,
  absenceProgressRatio: 0,
  multipleFaceProgressRatio: 0,
  fps: 0,
  telemetryLog: [],
}

function classifyMediaError(error: unknown): {
  status: 'permission_denied' | 'device_unavailable' | 'unsupported'
  message: string
  shouldLogPermissionDenial: boolean
} {
  const errName = error instanceof DOMException ? error.name : ''
  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return {
      status: 'permission_denied',
      message:
        'Camera permission was denied. Enable webcam access in your browser site settings and retry.',
      shouldLogPermissionDenial: true,
    }
  }
  if (
    errName === 'NotFoundError' ||
    errName === 'DevicesNotFoundError' ||
    errName === 'NotReadableError' ||
    errName === 'TrackStartError' ||
    errName === 'OverconstrainedError'
  ) {
    return {
      status: 'device_unavailable',
      message:
        'No usable webcam was detected, or another application is holding exclusive camera access.',
      shouldLogPermissionDenial: false,
    }
  }
  if (errName === 'NotSupportedError' || errName === 'SecurityError') {
    return {
      status: 'unsupported',
      message:
        'Camera access requires a secure browser context (HTTPS or localhost) with MediaDevices support.',
      shouldLogPermissionDenial: false,
    }
  }
  return {
    status: 'device_unavailable',
    message:
      error instanceof Error
        ? error.message
        : 'Unable to initialize camera stream.',
    shouldLogPermissionDenial: false,
  }
}

export function useCameraProctor({
  examId,
  sessionId = null,
  context,
  enabled,
  reportEvents = true,
}: UseCameraProctorOptions) {
  const [snapshot, setSnapshot] = useState<CameraMonitorSnapshot>(INITIAL_SNAPSHOT)
  const [restartNonce, setRestartNonce] = useState(0)

  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const monitorRef = useRef<LocalMediaPipeFaceMonitor | null>(null)
  const filterRef = useRef(new TemporalProctorFilter())
  const rafIdRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const reportEventsRef = useRef(reportEvents)
  const sessionIdRef = useRef(sessionId)
  const contextRef = useRef(context)
  const examIdRef = useRef(examId)
  const lastDisconnectionLoggedAtRef = useRef<number>(0)
  const lastPermissionDeniedLoggedAtRef = useRef<number>(0)

  useEffect(() => {
    reportEventsRef.current = reportEvents
    sessionIdRef.current = sessionId
    contextRef.current = context
    examIdRef.current = examId
  }, [reportEvents, sessionId, context, examId])

  const sendMonitoringEvent = useCallback(
    async (payload: {
      eventType: ProctorMonitoringEventType
      severity: EventSeverity
      confidence: number
      sustainedDurationMs?: number
      reason: string
      details?: Record<string, unknown>
    }) => {
      if (!reportEventsRef.current) return

      const clientEventId = generateClientEventUuid()
      const occurredAtIso = new Date().toISOString()
      const entryId = clientEventId
      const localEntry: ProctorTelemetryEntry = {
        id: entryId,
        eventType: payload.eventType,
        severity: payload.severity,
        reason: payload.reason,
        recordedAt: occurredAtIso,
        persisted: false,
      }

      if (mountedRef.current) {
        setSnapshot((prev) => ({
          ...prev,
          telemetryLog: [localEntry, ...prev.telemetryLog].slice(0, 12),
        }))
      }

      try {
        const res = await fetch(`/api/student/exams/${examIdRef.current}/proctor-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEventId,
            sessionId: sessionIdRef.current ?? null,
            context: contextRef.current,
            eventType: payload.eventType,
            sourceModule: 'mediapipe_face',
            timestamp: occurredAtIso,
            durationMs: payload.sustainedDurationMs ?? null,
            modelVersion: 'mediapipe-face-landmarker-float16-v1',
            severity: payload.severity,
            confidence: payload.confidence,
            details: payload.details,
          }),
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          recorded?: boolean
          deduplicated?: boolean
          persistedAs?: string | null
        }

        if (mountedRef.current) {
          setSnapshot((prev) => ({
            ...prev,
            telemetryLog: prev.telemetryLog.map((item) =>
              item.id === entryId
                ? {
                    ...item,
                    persisted: Boolean(data.recorded || data.deduplicated),
                    persistedAs: data.persistedAs ?? undefined,
                  }
                : item
            ),
          }))
        }
      } catch {
        // Keep local advisory entry without blocking the exam workflow
      }
    },
    []
  )

  const attachVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoElRef.current = node
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current
      void node.play().catch(() => {})
    }
  }, [])

  const stopResources = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.onended = null
        track.stop()
      }
      streamRef.current = null
    }
    if (videoElRef.current) {
      videoElRef.current.srcObject = null
    }
    if (monitorRef.current) {
      monitorRef.current.dispose()
      monitorRef.current = null
    }
    filterRef.current.reset()
  }, [])

  const retryCamera = useCallback(() => {
    stopResources()
    setRestartNonce((n) => n + 1)
  }, [stopResources])

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) {
      stopResources()
      return () => {
        mountedRef.current = false
      }
    }

    let cancelled = false
    let cleanupDeviceListener: (() => void) | null = null
    const localFilter = filterRef.current
    localFilter.reset()

    const handleDisconnect = (reason: string) => {
      if (cancelled || !mountedRef.current) return
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      setSnapshot((prev) => ({
        ...prev,
        cameraStatus: 'disconnected',
        faceStatus: 'paused',
        errorMessage: reason,
        metrics: null,
        absenceProgressRatio: 0,
        multipleFaceProgressRatio: 0,
        fps: 0,
      }))

      const now = Date.now()
      if (now - lastDisconnectionLoggedAtRef.current > 8000) {
        lastDisconnectionLoggedAtRef.current = now
        void sendMonitoringEvent({
          eventType: 'CAMERA_DISCONNECTED',
          severity: 'high',
          confidence: 0.99,
          reason,
          details: { source: 'media_track_ended' },
        })
      }
    }

    const startProctoringPipeline = async () => {
      await Promise.resolve()
      if (cancelled || !mountedRef.current) return

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setSnapshot((prev) => ({
          ...prev,
          cameraStatus: 'unsupported',
          modelStatus: 'idle',
          faceStatus: 'paused',
          errorMessage:
            'This browser does not expose navigator.mediaDevices.getUserMedia for webcam monitoring.',
        }))
        return
      }

      setSnapshot((prev) => ({
        ...prev,
        cameraStatus: 'requesting_permission',
        modelStatus: monitorRef.current ? 'ready' : 'downloading',
        faceStatus: 'initializing',
        errorMessage: null,
      }))

      // Launch MediaPipe model acquisition concurrently with camera permission prompt
      const modelPromise = LocalMediaPipeFaceMonitor.create({
        onStageChange: (stage) => {
          if (cancelled || !mountedRef.current) return
          setSnapshot((prev) => ({
            ...prev,
            modelStatus: stage,
          }))
        },
      })
        .then((monitor) => {
          if (cancelled) {
            monitor.dispose()
            return null
          }
          monitorRef.current = monitor
          if (mountedRef.current) {
            setSnapshot((prev) => ({
              ...prev,
              modelStatus: 'ready',
              modelDelegate: monitor.delegate,
            }))
          }
          return monitor
        })
        .catch((err) => {
          if (cancelled || !mountedRef.current) return null
          const stage =
            err instanceof MediaPipeModelError && err.stage === 'download_failed'
              ? 'download_failed'
              : 'init_failed'
          setSnapshot((prev) => ({
            ...prev,
            modelStatus: stage,
            errorMessage:
              prev.errorMessage ??
              (err instanceof Error
                ? err.message
                : 'Failed to initialize MediaPipe face monitor.'),
          }))
          return null
        })

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        })
      } catch (err) {
        if (cancelled || !mountedRef.current) return
        const classified = classifyMediaError(err)
        setSnapshot((prev) => ({
          ...prev,
          cameraStatus: classified.status,
          faceStatus: 'paused',
          errorMessage: classified.message,
        }))

        if (classified.shouldLogPermissionDenial) {
          const now = Date.now()
          if (now - lastPermissionDeniedLoggedAtRef.current > 8000) {
            lastPermissionDeniedLoggedAtRef.current = now
            void sendMonitoringEvent({
              eventType: 'CAMERA_PERMISSION_DENIED',
              severity: 'medium',
              confidence: 0.99,
              reason: classified.message,
              details: { errorName: err instanceof DOMException ? err.name : 'UnknownError' },
            })
          }
        }
        return
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack || videoTrack.readyState === 'ended') {
        stream.getTracks().forEach((track) => track.stop())
        handleDisconnect('Camera stream opened without an active video track.')
        return
      }

      streamRef.current = stream
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream
        await videoElRef.current.play().catch(() => {})
      }

      videoTrack.onended = () => {
        handleDisconnect('Webcam video track ended or camera was unplugged.')
      }

      const onDeviceChange = async () => {
        if (cancelled || !streamRef.current) return
        const activeTracks = streamRef.current
          .getVideoTracks()
          .filter((t) => t.readyState === 'live')
        if (activeTracks.length === 0) {
          handleDisconnect('Camera device disconnected from the system.')
        }
      }

      navigator.mediaDevices.addEventListener?.('devicechange', onDeviceChange)
      cleanupDeviceListener = () => {
        navigator.mediaDevices.removeEventListener?.('devicechange', onDeviceChange)
      }

      setSnapshot((prev) => ({
        ...prev,
        cameraStatus: 'connected',
        cameraLabel: videoTrack.label || 'Local Webcam',
        faceStatus: 'calibrating',
        errorMessage: null,
      }))

      const monitor = await modelPromise
      if (cancelled || !monitor || !mountedRef.current) return

      let lastProcessedAt = 0
      let lastVideoTime = -1
      let fpsFrames = 0
      let fpsWindowStart = performance.now()
      let currentFps = 0

      const tick = (now: number) => {
        if (cancelled || !mountedRef.current) return

        const activeTrack = streamRef.current?.getVideoTracks()[0]
        if (!activeTrack || activeTrack.readyState !== 'live') {
          handleDisconnect('Camera track stopped unexpectedly during monitoring.')
          return
        }

        const videoEl = videoElRef.current
        if (
          videoEl &&
          !document.hidden &&
          videoEl.readyState >= 2 &&
          videoEl.videoWidth > 0 &&
          now - lastProcessedAt >= TARGET_FRAME_INTERVAL_MS
        ) {
          if (videoEl.currentTime !== lastVideoTime) {
            lastVideoTime = videoEl.currentTime
            lastProcessedAt = now

            try {
              const metrics = monitor.detectFrame(videoEl, now)
              const evaluation = localFilter.update(metrics)

              fpsFrames += 1
              if (now - fpsWindowStart >= 1000) {
                currentFps = Math.round((fpsFrames * 1000) / (now - fpsWindowStart))
                fpsFrames = 0
                fpsWindowStart = now
              }

              for (const signal of evaluation.signals) {
                void sendMonitoringEvent(signal)
              }

              setSnapshot((prev) => ({
                ...prev,
                faceStatus: evaluation.faceStatus,
                metrics,
                absenceProgressRatio: evaluation.absenceProgressRatio,
                multipleFaceProgressRatio: evaluation.multipleFaceProgressRatio,
                fps: currentFps,
              }))
            } catch {
              // Single-frame inference hiccup; allow next frame to recover cleanly
            }
          }
        }

        rafIdRef.current = requestAnimationFrame(tick)
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    void startProctoringPipeline()

    return () => {
      cancelled = true
      cleanupDeviceListener?.()
      stopResources()
    }
  }, [enabled, restartNonce, sendMonitoringEvent, stopResources])

  return {
    snapshot: enabled ? snapshot : INITIAL_SNAPSHOT,
    attachVideoElement,
    retryCamera,
    stopMonitoring: stopResources,
  }
}

