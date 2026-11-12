import type {
  FaceLandmarkMetrics,
  FacePresenceStatus,
  ProctorAlertSignal,
  TemporalFilterConfig,
} from '@/types/proctoring'

export const DEFAULT_TEMPORAL_FILTER_CONFIG: TemporalFilterConfig = {
  absenceThresholdMs: 3500,
  multipleFaceThresholdMs: 2500,
  alertCooldownMs: 20000,
  minConsecutiveAnomalyFrames: 5,
  minBaselineFaceFrames: 1,
}

export interface TemporalFilterEvaluation {
  faceStatus: FacePresenceStatus
  absenceProgressRatio: number
  multipleFaceProgressRatio: number
  signals: ProctorAlertSignal[]
}

/**
 * Pure stateful temporal filter preventing single-frame MediaPipe jitter from
 * producing false FACE_NOT_VISIBLE or MULTIPLE_FACES_DETECTED proctoring alerts.
 */
export class TemporalProctorFilter {
  private readonly config: TemporalFilterConfig
  private baselineFaceFrames = 0
  private absenceStartedAtMs: number | null = null
  private consecutiveAbsenceFrames = 0
  private multipleFaceStartedAtMs: number | null = null
  private consecutiveMultipleFaceFrames = 0
  private gazeAvertedStartedAtMs: number | null = null
  private consecutiveGazeFrames = 0
  private obstructedStartedAtMs: number | null = null
  private consecutiveObstructedFrames = 0
  private lastYaw: number | null = null
  private lastSignalAtMs: {
    FACE_NOT_VISIBLE: number
    MULTIPLE_FACES_DETECTED: number
    PROLONGED_OFFSCREEN_GAZE: number
    HEAD_MOVEMENT_OBSERVED: number
    FACE_OBSTRUCTED: number
  } = {
    FACE_NOT_VISIBLE: -Infinity,
    MULTIPLE_FACES_DETECTED: -Infinity,
    PROLONGED_OFFSCREEN_GAZE: -Infinity,
    HEAD_MOVEMENT_OBSERVED: -Infinity,
    FACE_OBSTRUCTED: -Infinity,
  }

  constructor(config: Partial<TemporalFilterConfig> = {}) {
    this.config = { ...DEFAULT_TEMPORAL_FILTER_CONFIG, ...config }
  }

  reset(): void {
    this.baselineFaceFrames = 0
    this.absenceStartedAtMs = null
    this.consecutiveAbsenceFrames = 0
    this.multipleFaceStartedAtMs = null
    this.consecutiveMultipleFaceFrames = 0
    this.gazeAvertedStartedAtMs = null
    this.consecutiveGazeFrames = 0
    this.obstructedStartedAtMs = null
    this.consecutiveObstructedFrames = 0
    this.lastYaw = null
    this.lastSignalAtMs = {
      FACE_NOT_VISIBLE: -Infinity,
      MULTIPLE_FACES_DETECTED: -Infinity,
      PROLONGED_OFFSCREEN_GAZE: -Infinity,
      HEAD_MOVEMENT_OBSERVED: -Infinity,
      FACE_OBSTRUCTED: -Infinity,
    }
  }

  update(metrics: FaceLandmarkMetrics): TemporalFilterEvaluation {
    const now = metrics.processedAtMs
    const signals: ProctorAlertSignal[] = []

    if (metrics.faceCount === 1) {
      this.baselineFaceFrames += 1
      this.absenceStartedAtMs = null
      this.consecutiveAbsenceFrames = 0
      this.multipleFaceStartedAtMs = null
      this.consecutiveMultipleFaceFrames = 0

      // 1. Gaze & Off-Screen Attention Temporal Check
      if (metrics.isGazeAverted) {
        if (this.gazeAvertedStartedAtMs === null) {
          this.gazeAvertedStartedAtMs = now
        }
        this.consecutiveGazeFrames += 1
        const gazeElapsed = Math.max(0, now - this.gazeAvertedStartedAtMs)
        if (
          gazeElapsed >= 3500 &&
          this.consecutiveGazeFrames >= 10 &&
          now - (this.lastSignalAtMs.PROLONGED_OFFSCREEN_GAZE ?? -Infinity) >= this.config.alertCooldownMs
        ) {
          this.lastSignalAtMs.PROLONGED_OFFSCREEN_GAZE = now
          signals.push({
            eventType: 'PROLONGED_OFFSCREEN_GAZE',
            severity: 'low',
            confidence: 0.85,
            sustainedDurationMs: Math.round(gazeElapsed),
            consecutiveFrames: this.consecutiveGazeFrames,
            reason: `Candidate gaze remained averted from screen continuously for ${(gazeElapsed / 1000).toFixed(1)}s`,
            details: {
              yaw: metrics.estimatedYawOffset,
              pitch: metrics.estimatedPitchOffset,
              roll: metrics.estimatedRollDegrees,
              sustainedDurationMs: Math.round(gazeElapsed),
            },
          })
        }
      } else {
        this.gazeAvertedStartedAtMs = null
        this.consecutiveGazeFrames = 0
      }

      // 2. Sudden Head Movement Observation Check
      if (metrics.estimatedYawOffset !== null && this.lastYaw !== null) {
        const deltaYaw = Math.abs(metrics.estimatedYawOffset - this.lastYaw)
        if (
          deltaYaw >= 0.42 &&
          now - (this.lastSignalAtMs.HEAD_MOVEMENT_OBSERVED ?? -Infinity) >= 15000
        ) {
          this.lastSignalAtMs.HEAD_MOVEMENT_OBSERVED = now
          signals.push({
            eventType: 'HEAD_MOVEMENT_OBSERVED',
            severity: 'low',
            confidence: 0.8,
            reason: 'Noticeable rapid head rotation observed in webcam frame',
            details: {
              deltaYaw: Number(deltaYaw.toFixed(3)),
              currentYaw: metrics.estimatedYawOffset,
            },
          })
        }
      }
      if (metrics.estimatedYawOffset !== null) {
        this.lastYaw = metrics.estimatedYawOffset
      }

      // 3. Obstruction check
      if (metrics.isObstructed) {
        if (this.obstructedStartedAtMs === null) {
          this.obstructedStartedAtMs = now
        }
        this.consecutiveObstructedFrames += 1
        const obstElapsed = Math.max(0, now - this.obstructedStartedAtMs)
        if (
          obstElapsed >= 3000 &&
          this.consecutiveObstructedFrames >= 8 &&
          now - (this.lastSignalAtMs.FACE_OBSTRUCTED ?? -Infinity) >= this.config.alertCooldownMs
        ) {
          this.lastSignalAtMs.FACE_OBSTRUCTED = now
          signals.push({
            eventType: 'FACE_OBSTRUCTED',
            severity: 'medium',
            confidence: 0.82,
            sustainedDurationMs: Math.round(obstElapsed),
            consecutiveFrames: this.consecutiveObstructedFrames,
            reason: `Candidate face partially obstructed or out of focal view for ${(obstElapsed / 1000).toFixed(1)}s`,
            details: { landmarkCount: metrics.landmarkCount },
          })
        }
      } else {
        this.obstructedStartedAtMs = null
        this.consecutiveObstructedFrames = 0
      }

      return {
        faceStatus: 'present',
        absenceProgressRatio: 0,
        multipleFaceProgressRatio: 0,
        signals,
      }
    }

    if (metrics.faceCount > 1) {
      this.baselineFaceFrames += 1
      this.absenceStartedAtMs = null
      this.consecutiveAbsenceFrames = 0

      if (this.multipleFaceStartedAtMs === null) {
        this.multipleFaceStartedAtMs = now
      }
      this.consecutiveMultipleFaceFrames += 1

      const elapsed = Math.max(0, now - this.multipleFaceStartedAtMs)
      const progress = Math.min(1, elapsed / this.config.multipleFaceThresholdMs)
      const meetsSustained =
        elapsed >= this.config.multipleFaceThresholdMs &&
        this.consecutiveMultipleFaceFrames >= this.config.minConsecutiveAnomalyFrames

      if (
        meetsSustained &&
        now - this.lastSignalAtMs.MULTIPLE_FACES_DETECTED >= this.config.alertCooldownMs
      ) {
        this.lastSignalAtMs.MULTIPLE_FACES_DETECTED = now
        signals.push({
          eventType: 'MULTIPLE_FACES_DETECTED',
          severity: 'high',
          confidence: Number(Math.min(0.99, 0.8 + progress * 0.15).toFixed(3)),
          sustainedDurationMs: Math.round(elapsed),
          consecutiveFrames: this.consecutiveMultipleFaceFrames,
          reason: `Detected ${metrics.faceCount} faces continuously for ${(elapsed / 1000).toFixed(1)}s`,
          details: {
            faceCount: metrics.faceCount,
            sustainedDurationMs: Math.round(elapsed),
            consecutiveFrames: this.consecutiveMultipleFaceFrames,
          },
        })
      }

      return {
        faceStatus: meetsSustained ? 'multiple_faces_detected' : 'present',
        absenceProgressRatio: 0,
        multipleFaceProgressRatio: progress,
        signals,
      }
    }

    // faceCount === 0: reset multiple-face streak immediately
    this.multipleFaceStartedAtMs = null
    this.consecutiveMultipleFaceFrames = 0

    if (this.absenceStartedAtMs === null) {
      this.absenceStartedAtMs = now
    }
    this.consecutiveAbsenceFrames += 1

    const elapsed = Math.max(0, now - this.absenceStartedAtMs)
    const progress = Math.min(1, elapsed / this.config.absenceThresholdMs)
    const hasCalibrated =
      this.baselineFaceFrames >= this.config.minBaselineFaceFrames ||
      elapsed >= this.config.absenceThresholdMs

    const meetsSustained =
      hasCalibrated &&
      elapsed >= this.config.absenceThresholdMs &&
      this.consecutiveAbsenceFrames >= this.config.minConsecutiveAnomalyFrames

    if (
      meetsSustained &&
      now - this.lastSignalAtMs.FACE_NOT_VISIBLE >= this.config.alertCooldownMs
    ) {
      this.lastSignalAtMs.FACE_NOT_VISIBLE = now
      signals.push({
        eventType: 'FACE_NOT_VISIBLE',
        severity: 'medium',
        confidence: Number(Math.min(0.98, 0.78 + progress * 0.17).toFixed(3)),
        sustainedDurationMs: Math.round(elapsed),
        consecutiveFrames: this.consecutiveAbsenceFrames,
        reason: `Candidate face not detected for ${(elapsed / 1000).toFixed(1)}s`,
        details: {
          faceCount: 0,
          sustainedDurationMs: Math.round(elapsed),
          consecutiveFrames: this.consecutiveAbsenceFrames,
          hadBaselineFace: this.baselineFaceFrames > 0,
        },
      })
    }

    const faceStatus: FacePresenceStatus = meetsSustained
      ? 'face_not_visible'
      : this.baselineFaceFrames < this.config.minBaselineFaceFrames
        ? 'calibrating'
        : 'present'

    return {
      faceStatus,
      absenceProgressRatio: progress,
      multipleFaceProgressRatio: 0,
      signals,
    }
  }
}

