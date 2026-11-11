import type { EventSeverity } from './database'

export type ProctorMonitoringEventType =
  | 'FACE_NOT_VISIBLE'
  | 'MULTIPLE_FACES_DETECTED'
  | 'CAMERA_DISCONNECTED'
  | 'CAMERA_PERMISSION_DENIED'

export type CameraConnectionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'connected'
  | 'permission_denied'
  | 'disconnected'
  | 'device_unavailable'
  | 'unsupported'

export type ModelStatus =
  | 'idle'
  | 'downloading'
  | 'initializing'
  | 'ready'
  | 'download_failed'
  | 'init_failed'

export type FacePresenceStatus =
  | 'uninitialized'
  | 'initializing'
  | 'calibrating'
  | 'present'
  | 'face_not_visible'
  | 'multiple_faces_detected'
  | 'paused'

export interface FaceBoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface FaceLandmarkMetrics {
  faceCount: number
  landmarkCount: number
  centeredInFrame: boolean
  primaryBox: FaceBoundingBox | null
  estimatedYawOffset: number | null
  processedAtMs: number
}

export interface TemporalFilterConfig {
  /** Sustained absence duration (ms) before emitting FACE_NOT_VISIBLE */
  absenceThresholdMs: number
  /** Sustained multi-face duration (ms) before emitting MULTIPLE_FACES_DETECTED */
  multipleFaceThresholdMs: number
  /** Minimum cooldown between repeated alerts of the same event type (ms) */
  alertCooldownMs: number
  /** Minimum contiguous frames confirming an anomaly in addition to duration */
  minConsecutiveAnomalyFrames: number
  /** Minimum valid face frames before treating missing landmarks as absence */
  minBaselineFaceFrames: number
}

export interface ProctorAlertSignal {
  eventType: ProctorMonitoringEventType
  severity: EventSeverity
  confidence: number
  sustainedDurationMs: number
  consecutiveFrames: number
  reason: string
  details: Record<string, unknown>
}

export interface ProctorTelemetryEntry {
  id: string
  eventType: ProctorMonitoringEventType
  severity: EventSeverity
  reason: string
  recordedAt: string
  persisted: boolean
  persistedAs?: string
}

export interface CameraMonitorSnapshot {
  cameraStatus: CameraConnectionStatus
  modelStatus: ModelStatus
  faceStatus: FacePresenceStatus
  cameraLabel: string | null
  errorMessage: string | null
  modelDelegate: 'GPU' | 'CPU' | null
  metrics: FaceLandmarkMetrics | null
  absenceProgressRatio: number
  multipleFaceProgressRatio: number
  fps: number
  telemetryLog: ProctorTelemetryEntry[]
}

