import type { FaceLandmarkMetrics } from '@/types/proctoring'

export interface GazeCalibrationData {
  baselineYaw: number
  baselinePitch: number
  baselineRoll: number
  calibratedAt: string
  sampleCount: number
  quality: 'excellent' | 'acceptable' | 'poor'
  thresholds: {
    maxLeftYaw: number
    maxRightYaw: number
    maxPitchDown: number
    maxPitchUp: number
    maxGazeDeviationRatio: number
  }
}

export interface CalibrationSample {
  yaw: number
  pitch: number
  roll: number
  irisGazeRatio: number
}

/**
 * Interactive Gaze and Head Pose Calibration Engine.
 * Run during student pre-flight check before examination entry.
 */
export class GazeCalibrationEngine {
  private samples: CalibrationSample[] = []
  private readonly targetSamples = 25

  reset(): void {
    this.samples = []
  }

  addFrame(metrics: FaceLandmarkMetrics): {
    completed: boolean
    progressRatio: number
    currentSampleCount: number
  } {
    if (metrics.faceCount === 1 && metrics.estimatedYawOffset !== null) {
      const yaw = metrics.estimatedYawOffset
      const pitch = metrics.estimatedPitchOffset ?? 0
      const roll = metrics.estimatedRollDegrees ?? 0
      const irisGazeRatio = metrics.isGazeAverted ? 0.45 : 0.15

      this.samples.push({ yaw, pitch, roll, irisGazeRatio })
    }

    const progressRatio = Math.min(1, this.samples.length / this.targetSamples)
    return {
      completed: this.samples.length >= this.targetSamples,
      progressRatio,
      currentSampleCount: this.samples.length,
    }
  }

  computeCalibration(): GazeCalibrationData | null {
    if (this.samples.length < 15) {
      return null
    }

    const n = this.samples.length
    const meanYaw = this.samples.reduce((acc, s) => acc + s.yaw, 0) / n
    const meanPitch = this.samples.reduce((acc, s) => acc + s.pitch, 0) / n
    const meanRoll = this.samples.reduce((acc, s) => acc + s.roll, 0) / n

    const varianceYaw =
      this.samples.reduce((acc, s) => acc + Math.pow(s.yaw - meanYaw, 2), 0) / n
    const stdYaw = Math.sqrt(varianceYaw)

    // Quality check: high variance indicates jitter or candidate moving while calibrating
    let quality: GazeCalibrationData['quality'] = 'excellent'
    if (stdYaw > 8.0) {
      quality = 'poor'
    } else if (stdYaw > 4.5) {
      quality = 'acceptable'
    }

    return {
      baselineYaw: Number(meanYaw.toFixed(2)),
      baselinePitch: Number(meanPitch.toFixed(2)),
      baselineRoll: Number(meanRoll.toFixed(2)),
      calibratedAt: new Date().toISOString(),
      sampleCount: n,
      quality,
      thresholds: {
        maxLeftYaw: Number((meanYaw - 22.0).toFixed(2)),
        maxRightYaw: Number((meanYaw + 22.0).toFixed(2)),
        maxPitchDown: Number((meanPitch - 24.0).toFixed(2)),
        maxPitchUp: Number((meanPitch + 18.0).toFixed(2)),
        maxGazeDeviationRatio: 0.38,
      },
    }
  }
}

