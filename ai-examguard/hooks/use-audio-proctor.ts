'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildAudioStreamConstraints,
  computeShortWindowAudioMetrics,
  detectAudioConstraintSupport,
  type OptionalVadAdapter,
  readActiveAudioConstraints,
  SustainedAudioActivityFilter,
} from '@/lib/proctoring/audio-analyzer'
import type { EventSeverity } from '@/types/database'
import type {
  AudioMonitorSnapshot,
  ProctorMonitoringEventType,
  ProctorTelemetryEntry,
} from '@/types/proctoring'

export interface UseAudioProctorOptions {
  examId: string
  sessionId?: string | null
  context: 'preflight' | 'active_exam'
  enabled: boolean
  /** Disable emitting telemetry events (e.g. once submission begins) */
  reportEvents?: boolean
  /** Optional asynchronous VAD model loader if speech/non-speech classification is configured */
  loadVadAdapter?: () => Promise<OptionalVadAdapter | null>
}

const ANALYSIS_INTERVAL_MS = 100
const INITIAL_AUDIO_SNAPSHOT: AudioMonitorSnapshot = {
  audioStatus: 'idle',
  vadStatus: 'energy_only',
  micLabel: null,
  errorMessage: null,
  constraints: {
    noiseSuppressionSupported: false,
    echoCancellationSupported: false,
    autoGainControlSupported: false,
    noiseSuppressionActive: false,
    echoCancellationActive: false,
    autoGainControlActive: false,
  },
  metrics: null,
  activityProgressRatio: 0,
  sampleRateHz: null,
  isElevatedEnergy: false,
  telemetryLog: [],
}

function classifyAudioMediaError(error: unknown): {
  status: 'permission_denied' | 'device_unavailable' | 'unsupported'
  message: string
  shouldLogPermissionDenial: boolean
} {
  const errName = error instanceof DOMException ? error.name : ''
  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return {
      status: 'permission_denied',
      message:
        'Microphone permission was denied. Allow audio access in your browser site settings and retry.',
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
        'No active microphone was detected, or another application holds exclusive audio access.',
      shouldLogPermissionDenial: false,
    }
  }
  if (errName === 'NotSupportedError' || errName === 'SecurityError') {
    return {
      status: 'unsupported',
      message:
        'Microphone monitoring requires a secure browser context (HTTPS or localhost) with Web Audio support.',
      shouldLogPermissionDenial: false,
    }
  }
  return {
    status: 'device_unavailable',
    message:
      error instanceof Error ? error.message : 'Unable to initialize microphone audio stream.',
    shouldLogPermissionDenial: false,
  }
}

export function useAudioProctor({
  examId,
  sessionId = null,
  context,
  enabled,
  reportEvents = true,
  loadVadAdapter,
}: UseAudioProctorOptions) {
  const [snapshot, setSnapshot] = useState<AudioMonitorSnapshot>(INITIAL_AUDIO_SNAPSHOT)
  const [restartNonce, setRestartNonce] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadAdapterRef = useRef<OptionalVadAdapter | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const filterRef = useRef(new SustainedAudioActivityFilter())
  const mountedRef = useRef(true)

  const reportEventsRef = useRef(reportEvents)
  const sessionIdRef = useRef(sessionId)
  const contextRef = useRef(context)
  const examIdRef = useRef(examId)
  const loadVadRef = useRef(loadVadAdapter)
  const lastDisconnectionLoggedAtRef = useRef(0)
  const lastPermissionDeniedLoggedAtRef = useRef(0)

  useEffect(() => {
    reportEventsRef.current = reportEvents
    sessionIdRef.current = sessionId
    contextRef.current = context
    examIdRef.current = examId
    loadVadRef.current = loadVadAdapter
  }, [reportEvents, sessionId, context, examId, loadVadAdapter])

  const sendAudioEvent = useCallback(
    async (payload: {
      eventType: Extract<
        ProctorMonitoringEventType,
        'AUDIO_ACTIVITY' | 'MICROPHONE_DISCONNECTED' | 'MICROPHONE_PERMISSION_DENIED'
      >
      severity: EventSeverity
      confidence: number
      sustainedDurationMs?: number
      reason: string
      details?: Record<string, unknown>
    }) => {
      if (!reportEventsRef.current) return

      const entryId = `${payload.eventType}-${Date.now()}`
      const localEntry: ProctorTelemetryEntry = {
        id: entryId,
        eventType: payload.eventType,
        severity: payload.severity,
        reason: payload.reason,
        recordedAt: new Date().toISOString(),
        persisted: false,
      }

      if (mountedRef.current) {
        setSnapshot((prev) => ({
          ...prev,
          telemetryLog: [localEntry, ...prev.telemetryLog].slice(0, 10),
        }))
      }

      try {
        const res = await fetch(`/api/student/exams/${examIdRef.current}/proctor-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current ?? null,
            context: contextRef.current,
            eventType: payload.eventType,
            severity: payload.severity,
            confidence: payload.confidence,
            sustainedDurationMs: payload.sustainedDurationMs,
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
        // Keep advisory client state without blocking exam workflow
      }
    },
    []
  )

  const stopAudioResources = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch {
        // Ignore disconnect error
      }
      sourceNodeRef.current = null
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect()
      } catch {
        // Ignore disconnect error
      }
      analyserRef.current = null
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.onended = null
        track.stop()
      }
      streamRef.current = null
    }
    if (vadAdapterRef.current) {
      vadAdapterRef.current.dispose()
      vadAdapterRef.current = null
    }
    filterRef.current.reset()
  }, [])

  const retryAudio = useCallback(() => {
    stopAudioResources()
    setRestartNonce((n) => n + 1)
  }, [stopAudioResources])

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) {
      stopAudioResources()
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
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      setSnapshot((prev) => ({
        ...prev,
        audioStatus: 'disconnected',
        errorMessage: reason,
        metrics: null,
        activityProgressRatio: 0,
        isElevatedEnergy: false,
      }))

      const now = Date.now()
      if (now - lastDisconnectionLoggedAtRef.current > 8000) {
        lastDisconnectionLoggedAtRef.current = now
        void sendAudioEvent({
          eventType: 'MICROPHONE_DISCONNECTED',
          severity: 'medium',
          confidence: 0.99,
          reason,
          details: { source: 'audio_track_ended' },
        })
      }
    }

    const startAudioPipeline = async () => {
      await Promise.resolve()
      if (cancelled || !mountedRef.current) return

      const support = detectAudioConstraintSupport()

      const AudioCtxCtor =
        typeof window !== 'undefined'
          ? window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : undefined

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function' ||
        !AudioCtxCtor
      ) {
        setSnapshot((prev) => ({
          ...prev,
          audioStatus: 'unsupported',
          constraints: support,
          errorMessage:
            'This browser does not expose MediaDevices and Web Audio API for microphone verification.',
        }))
        return
      }

      setSnapshot((prev) => ({
        ...prev,
        audioStatus: 'requesting_permission',
        vadStatus: loadVadRef.current ? 'loading' : 'energy_only',
        constraints: support,
        errorMessage: null,
      }))

      if (loadVadRef.current) {
        void loadVadRef
          .current()
          .then((adapter) => {
            if (cancelled) {
              adapter?.dispose()
              return
            }
            if (adapter) {
              vadAdapterRef.current = adapter
              if (mountedRef.current) {
                setSnapshot((prev) => ({ ...prev, vadStatus: 'active' }))
              }
            } else if (mountedRef.current) {
              setSnapshot((prev) => ({ ...prev, vadStatus: 'energy_only' }))
            }
          })
          .catch(() => {
            if (mountedRef.current && !cancelled) {
              setSnapshot((prev) => ({ ...prev, vadStatus: 'unavailable' }))
            }
          })
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: buildAudioStreamConstraints(support),
          video: false,
        })
      } catch (err) {
        if (cancelled || !mountedRef.current) return
        const classified = classifyAudioMediaError(err)
        setSnapshot((prev) => ({
          ...prev,
          audioStatus: classified.status,
          errorMessage: classified.message,
        }))

        if (classified.shouldLogPermissionDenial) {
          const now = Date.now()
          if (now - lastPermissionDeniedLoggedAtRef.current > 8000) {
            lastPermissionDeniedLoggedAtRef.current = now
            void sendAudioEvent({
              eventType: 'MICROPHONE_PERMISSION_DENIED',
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
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack || audioTrack.readyState === 'ended') {
        stream.getTracks().forEach((t) => t.stop())
        handleDisconnect('Microphone stream opened without an active audio track.')
        return
      }

      streamRef.current = stream
      const activeConstraints = readActiveAudioConstraints(audioTrack, support)

      audioTrack.onended = () => {
        handleDisconnect('Microphone audio track ended or device was unplugged.')
      }

      const onDeviceChange = () => {
        if (cancelled || !streamRef.current) return
        const activeTracks = streamRef.current
          .getAudioTracks()
          .filter((t) => t.readyState === 'live')
        if (activeTracks.length === 0) {
          handleDisconnect('Microphone device disconnected from the system.')
        }
      }

      navigator.mediaDevices.addEventListener?.('devicechange', onDeviceChange)
      cleanupDeviceListener = () => {
        navigator.mediaDevices.removeEventListener?.('devicechange', onDeviceChange)
      }

      const audioCtx = new AudioCtxCtor()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {})
      }
      if (cancelled) {
        await audioCtx.close().catch(() => {})
        return
      }

      const sourceNode = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.72
      // Intentionally do NOT connect analyser to audioCtx.destination (zero local playback/feedback)
      sourceNode.connect(analyser)

      audioCtxRef.current = audioCtx
      sourceNodeRef.current = sourceNode
      analyserRef.current = analyser

      const timeDomainBuffer = new Float32Array(analyser.fftSize)
      const freqBuffer = new Uint8Array(analyser.frequencyBinCount)

      setSnapshot((prev) => ({
        ...prev,
        audioStatus: 'connected',
        micLabel: audioTrack.label || 'Local Microphone',
        constraints: activeConstraints,
        sampleRateHz: audioCtx.sampleRate,
        errorMessage: null,
      }))

      intervalRef.current = setInterval(() => {
        if (cancelled || !mountedRef.current) return
        const track = streamRef.current?.getAudioTracks()[0]
        if (!track || track.readyState !== 'live') {
          handleDisconnect('Microphone track stopped unexpectedly during monitoring.')
          return
        }

        const currentAnalyser = analyserRef.current
        const currentCtx = audioCtxRef.current
        if (!currentAnalyser || !currentCtx) return

        currentAnalyser.getFloatTimeDomainData(timeDomainBuffer)
        currentAnalyser.getByteFrequencyData(freqBuffer)

        const vadProb = vadAdapterRef.current
          ? vadAdapterRef.current.evaluateFrame(timeDomainBuffer, currentCtx.sampleRate)
          : null

        const metrics = computeShortWindowAudioMetrics(
          timeDomainBuffer,
          freqBuffer,
          currentCtx.sampleRate,
          currentAnalyser.fftSize,
          performance.now(),
          vadProb
        )
        const evaluation = localFilter.update(metrics)

        if (evaluation.signal) {
          void sendAudioEvent({
            eventType: 'AUDIO_ACTIVITY',
            severity: evaluation.signal.severity,
            confidence: evaluation.signal.confidence,
            sustainedDurationMs: evaluation.signal.sustainedDurationMs,
            reason: evaluation.signal.reason,
            details: evaluation.signal.details,
          })
        }

        setSnapshot((prev) => ({
          ...prev,
          metrics,
          isElevatedEnergy: evaluation.isElevatedEnergy,
          activityProgressRatio: evaluation.activityProgressRatio,
        }))
      }, ANALYSIS_INTERVAL_MS)
    }

    void startAudioPipeline()

    return () => {
      cancelled = true
      cleanupDeviceListener?.()
      stopAudioResources()
    }
  }, [enabled, restartNonce, sendAudioEvent, stopAudioResources])

  return {
    snapshot: enabled ? snapshot : INITIAL_AUDIO_SNAPSHOT,
    retryAudio,
    stopAudioMonitoring: stopAudioResources,
  }
}

