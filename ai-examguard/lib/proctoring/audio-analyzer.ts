import type {
  AudioConstraintSupport,
  ProctorAlertSignal,
  ShortWindowAudioMetrics,
} from '@/types/proctoring'

export interface AudioActivityFilterConfig {
  /** RMS acoustic energy threshold (0..1) above quiet room baseline */
  rmsThreshold: number
  /** Duration of sustained elevated energy (ms) before emitting AUDIO_ACTIVITY */
  sustainedThresholdMs: number
  /** Minimum contiguous short analysis windows confirming sustained acoustic activity */
  minConsecutiveWindows: number
  /** Minimum cooldown between repeated AUDIO_ACTIVITY events (ms) */
  alertCooldownMs: number
  /** Optional VAD probability threshold when a real VAD adapter is active */
  vadProbabilityThreshold: number
}

export const DEFAULT_AUDIO_FILTER_CONFIG: AudioActivityFilterConfig = {
  rmsThreshold: 0.055,
  sustainedThresholdMs: 1800,
  minConsecutiveWindows: 6,
  alertCooldownMs: 20000,
  vadProbabilityThreshold: 0.65,
}

export interface OptionalVadAdapter {
  readonly modelName: string
  evaluateFrame(samples: Float32Array, sampleRate: number): number | null
  dispose(): void
}

export function detectAudioConstraintSupport(): AudioConstraintSupport {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getSupportedConstraints !== 'function'
  ) {
    return {
      noiseSuppressionSupported: false,
      echoCancellationSupported: false,
      autoGainControlSupported: false,
      noiseSuppressionActive: false,
      echoCancellationActive: false,
      autoGainControlActive: false,
    }
  }

  const supported = navigator.mediaDevices.getSupportedConstraints()
  return {
    noiseSuppressionSupported: Boolean(supported.noiseSuppression),
    echoCancellationSupported: Boolean(supported.echoCancellation),
    autoGainControlSupported: Boolean(supported.autoGainControl),
    noiseSuppressionActive: false,
    echoCancellationActive: false,
    autoGainControlActive: false,
  }
}

export function buildAudioStreamConstraints(
  support: AudioConstraintSupport
): MediaTrackConstraints | boolean {
  const constraints: MediaTrackConstraints = {}
  if (support.noiseSuppressionSupported) constraints.noiseSuppression = true
  if (support.echoCancellationSupported) constraints.echoCancellation = true
  if (support.autoGainControlSupported) constraints.autoGainControl = true

  return Object.keys(constraints).length > 0 ? constraints : true
}

export function readActiveAudioConstraints(
  track: MediaStreamTrack,
  support: AudioConstraintSupport
): AudioConstraintSupport {
  const settings = typeof track.getSettings === 'function' ? track.getSettings() : {}
  return {
    ...support,
    noiseSuppressionActive:
      support.noiseSuppressionSupported && settings.noiseSuppression === true,
    echoCancellationActive:
      support.echoCancellationSupported && settings.echoCancellation === true,
    autoGainControlActive:
      support.autoGainControlSupported && settings.autoGainControl === true,
  }
}

/**
 * Computes short-window acoustic sound energy metrics in-browser.
 * RMS amplitude and frequency-band energy represent acoustic sound energy only
 * (not speaker identity and not automatic proof of speech or misconduct).
 */
export function computeShortWindowAudioMetrics(
  timeDomainSamples: Uint8Array | Float32Array,
  frequencyBins: Uint8Array | null,
  sampleRate: number,
  fftSize: number,
  sampledAtMs: number,
  vadSpeechProbability: number | null = null
): ShortWindowAudioMetrics {
  const len = timeDomainSamples.length
  let sumSq = 0

  if (len > 0) {
    if (timeDomainSamples instanceof Uint8Array) {
      for (let i = 0; i < len; i += 1) {
        const sample = ((timeDomainSamples[i] ?? 128) - 128) / 128
        sumSq += sample * sample
      }
    } else {
      for (let i = 0; i < len; i += 1) {
        const sample = timeDomainSamples[i] ?? 0
        sumSq += sample * sample
      }
    }
  }

  const rms = len > 0 ? Math.min(1, Math.sqrt(sumSq / len)) : 0
  const dbfs = rms > 1e-5 ? Math.max(-90, Math.round(20 * Math.log10(rms) * 10) / 10) : -90
  const level = Math.min(1, Number((rms * 4.5).toFixed(3)))

  const bandCount = 8
  const bands = Array<number>(bandCount).fill(0)
  let totalFreqEnergy = 0
  let speechBandEnergy = 0

  if (frequencyBins && frequencyBins.length > 0) {
    const binCount = frequencyBins.length
    const hzPerBin = sampleRate > 0 && fftSize > 0 ? sampleRate / fftSize : 48000 / (binCount * 2)
    const sliceSize = Math.max(1, Math.floor(binCount / bandCount))

    for (let b = 0; b < bandCount; b += 1) {
      const start = b * sliceSize
      const end = b === bandCount - 1 ? binCount : Math.min(binCount, start + sliceSize)
      let acc = 0
      for (let i = start; i < end; i += 1) {
        acc += (frequencyBins[i] ?? 0) / 255
      }
      const count = Math.max(1, end - start)
      bands[b] = Number(Math.min(1, acc / count).toFixed(3))
    }

    for (let i = 0; i < binCount; i += 1) {
      const mag = (frequencyBins[i] ?? 0) / 255
      const sq = mag * mag
      totalFreqEnergy += sq
      const freq = i * hzPerBin
      if (freq >= 300 && freq <= 3400) {
        speechBandEnergy += sq
      }
    }
  }

  const speechBandEnergyRatio =
    totalFreqEnergy > 1e-6
      ? Number(Math.min(1, speechBandEnergy / totalFreqEnergy).toFixed(3))
      : 0

  return {
    rms: Number(rms.toFixed(4)),
    dbfs,
    level,
    bands,
    speechBandEnergyRatio,
    vadSpeechProbability:
      vadSpeechProbability !== null ? Number(vadSpeechProbability.toFixed(3)) : null,
    measurementBasis: vadSpeechProbability !== null ? 'vad_model' : 'acoustic_energy',
    sampledAtMs,
  }
}

export interface AudioFilterEvaluation {
  isElevatedEnergy: boolean
  activityProgressRatio: number
  signal: ProctorAlertSignal | null
}

/**
 * Temporal filter preventing transient mic clicks/typing noises from generating
 * false AUDIO_ACTIVITY events.
 */
export class SustainedAudioActivityFilter {
  private readonly config: AudioActivityFilterConfig
  private elevatedStartedAtMs: number | null = null
  private consecutiveElevatedWindows = 0
  private lastSignalAtMs = -Infinity
  private peakRms = 0

  constructor(config: Partial<AudioActivityFilterConfig> = {}) {
    this.config = { ...DEFAULT_AUDIO_FILTER_CONFIG, ...config }
  }

  reset(): void {
    this.elevatedStartedAtMs = null
    this.consecutiveElevatedWindows = 0
    this.lastSignalAtMs = -Infinity
    this.peakRms = 0
  }

  update(metrics: ShortWindowAudioMetrics): AudioFilterEvaluation {
    const now = metrics.sampledAtMs
    const isElevatedByEnergy = metrics.rms >= this.config.rmsThreshold
    const isElevatedByVad =
      metrics.vadSpeechProbability !== null &&
      metrics.vadSpeechProbability >= this.config.vadProbabilityThreshold

    const elevated =
      metrics.measurementBasis === 'vad_model' ? isElevatedByVad : isElevatedByEnergy

    if (!elevated) {
      this.elevatedStartedAtMs = null
      this.consecutiveElevatedWindows = 0
      this.peakRms = 0
      return {
        isElevatedEnergy: false,
        activityProgressRatio: 0,
        signal: null,
      }
    }

    if (this.elevatedStartedAtMs === null) {
      this.elevatedStartedAtMs = now
    }
    this.consecutiveElevatedWindows += 1
    if (metrics.rms > this.peakRms) {
      this.peakRms = metrics.rms
    }

    const elapsed = Math.max(0, now - this.elevatedStartedAtMs)
    const progress = Math.min(1, elapsed / this.config.sustainedThresholdMs)
    const meetsSustained =
      elapsed >= this.config.sustainedThresholdMs &&
      this.consecutiveElevatedWindows >= this.config.minConsecutiveWindows

    let signal: ProctorAlertSignal | null = null
    if (meetsSustained && now - this.lastSignalAtMs >= this.config.alertCooldownMs) {
      this.lastSignalAtMs = now
      signal = {
        eventType: 'AUDIO_ACTIVITY',
        severity: 'low',
        confidence: Number(Math.min(0.95, 0.72 + progress * 0.2).toFixed(3)),
        sustainedDurationMs: Math.round(elapsed),
        consecutiveFrames: this.consecutiveElevatedWindows,
        reason:
          metrics.measurementBasis === 'vad_model'
            ? `Sustained VAD speech activity detected for ${(elapsed / 1000).toFixed(1)}s`
            : `Sustained ambient acoustic sound energy (${metrics.dbfs} dBFS) for ${(elapsed / 1000).toFixed(1)}s`,
        details: {
          measurementBasis: metrics.measurementBasis,
          isAcousticEnergyOnly: metrics.measurementBasis === 'acoustic_energy',
          isSpeechClassified: metrics.vadSpeechProbability !== null,
          vadSpeechProbability: metrics.vadSpeechProbability,
          rms: metrics.rms,
          peakRms: Number(this.peakRms.toFixed(4)),
          dbfs: metrics.dbfs,
          speechBandEnergyRatio: metrics.speechBandEnergyRatio,
          sustainedDurationMs: Math.round(elapsed),
          consecutiveWindows: this.consecutiveElevatedWindows,
        },
      }
    }

    return {
      isElevatedEnergy: true,
      activityProgressRatio: progress,
      signal,
    }
  }
}

