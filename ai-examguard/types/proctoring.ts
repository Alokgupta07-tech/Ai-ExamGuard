import type { EventSeverity } from './database'

export type ProctorMonitoringEventType =
  | 'FACE_NOT_VISIBLE'
  | 'MULTIPLE_FACES_DETECTED'
  | 'CAMERA_DISCONNECTED'
  | 'CAMERA_PERMISSION_DENIED'
  | 'AUDIO_ACTIVITY'
  | 'MICROPHONE_DISCONNECTED'
  | 'MICROPHONE_PERMISSION_DENIED'
  | 'TAB_HIDDEN'
  | 'FULLSCREEN_EXIT'
  | 'SESSION_CONNECTION_INTERRUPTED'

export type AudioConnectionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'connected'
  | 'permission_denied'
  | 'disconnected'
  | 'device_unavailable'
  | 'unsupported'

export type AudioVadStatus = 'energy_only' | 'loading' | 'active' | 'unavailable'

export interface AudioConstraintSupport {
  noiseSuppressionSupported: boolean
  echoCancellationSupported: boolean
  autoGainControlSupported: boolean
  noiseSuppressionActive: boolean
  echoCancellationActive: boolean
  autoGainControlActive: boolean
}

export interface ShortWindowAudioMetrics {
  /** Instantaneous root-mean-square acoustic energy (0..1) */
  rms: number
  /** Decibels relative to full scale [-90..0] */
  dbfs: number
  /** Visual meter normalized level (0..1) */
  level: number
  /** 8 logarithmic/linear frequency energy bins for activity meter (0..1 each) */
  bands: number[]
  /** Fraction of energy in 300Hz-3400Hz range (sound energy proxy, not speech identity) */
  speechBandEnergyRatio: number
  /** Optional VAD probability [0..1] when an optional ML VAD adapter is active; null otherwise */
  vadSpeechProbability: number | null
  /** Distinguishes RMS sound energy from a loaded speech/non-speech VAD model */
  measurementBasis: 'acoustic_energy' | 'vad_model'
  sampledAtMs: number
}

export interface AudioMonitorSnapshot {
  audioStatus: AudioConnectionStatus
  vadStatus: AudioVadStatus
  micLabel: string | null
  errorMessage: string | null
  constraints: AudioConstraintSupport
  metrics: ShortWindowAudioMetrics | null
  activityProgressRatio: number
  sampleRateHz: number | null
  isElevatedEnergy: boolean
  telemetryLog: ProctorTelemetryEntry[]
}

export interface BrowserMonitorSnapshot {
  isTabVisible: boolean
  isPageFocused: boolean
  fullscreenActive: boolean
  fullscreenSupported: boolean
  visibilitySupported: boolean
  isOnline: boolean
  tabHiddenCount: number
  focusLossCount: number
  fullscreenExitCount: number
  connectionInterruptionCount: number
  pendingQueuedInterruptions: number
}

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

export type RiskCategory = 'NORMAL' | 'REVIEW_SUGGESTED' | 'PRIORITY_REVIEW'

export type EventSourceModule =
  | 'mediapipe_face'
  | 'web_audio'
  | 'browser_visibility'
  | 'server_session'

export type EventReviewStatus =
  | 'pending_review'
  | 'acknowledged'
  | 'cleared'
  | 'flagged'
  | 'dismissed'

export type EventOrigin = 'ai_detection' | 'browser_telemetry' | 'simulated_demo'

export interface CanonicalMonitoringEvent {
  eventId: string
  clientEventId: string
  universityId: string
  examId: string
  sessionId: string
  eventType: string
  sourceModule: EventSourceModule
  eventOrigin: EventOrigin
  isSimulated: boolean
  timestamp: string
  ingestedAt: string
  durationMs: number | null
  modelVersion: string | null
  confidence: number | null
  severity: EventSeverity
  explanation: string
  reviewStatus: EventReviewStatus
  reviewNote?: string | null
  reviewedAt?: string | null
  reviewedBy?: string | null
  metadata: Record<string, unknown>
}

export interface TemporalCorrelationHit {
  ruleId: string
  title: string
  description: string
  bonusPoints: number
  eventIds: string[]
  windowSeconds: number
}

export interface ContextualRiskIndicator {
  code: string
  label: string
  impact: 'mitigating' | 'neutral' | 'elevated'
  detail: string
}

export interface SessionRiskAssessment {
  sessionId: string
  examId: string
  universityId: string
  riskCategory: RiskCategory
  riskScore: number
  trustScore: number
  episodeCount: number
  rawEventCount: number
  correlations: TemporalCorrelationHit[]
  contextualIndicators: ContextualRiskIndicator[]
  summaryExplanation: string
  evaluatedAt: string
  autoDisqualified: false
}


