import type { DetectedObjectBox, ObjectDetectionSnapshot, ProctorAlertSignal } from '@/types/proctoring'

export const MEDIAPIPE_OBJECT_DETECTOR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'

interface ObjectDetectorDetection {
  categories: {
    categoryName: string
    displayName?: string
    score: number
    index: number
  }[]
  boundingBox?: {
    originX: number
    originY: number
    width: number
    height: number
  }
}

interface ObjectDetectorInstance {
  detectForVideo(
    videoFrame: HTMLVideoElement,
    timestampMs: number
  ): {
    detections?: ObjectDetectorDetection[]
  }
  close(): void
}

export class LocalMediaPipeObjectDetector {
  private readonly detector: ObjectDetectorInstance
  readonly delegate: 'GPU' | 'CPU'
  private disposed = false

  // Temporal state for phone detection
  private phoneDetectedStartedAtMs: number | null = null
  private consecutivePhoneFrames = 0
  private lastPhoneAlertAtMs = -Infinity

  // Temporal state for additional person detection
  private personDetectedStartedAtMs: number | null = null
  private consecutivePersonFrames = 0
  private lastPersonAlertAtMs = -Infinity

  private constructor(detector: ObjectDetectorInstance, delegate: 'GPU' | 'CPU') {
    this.detector = detector
    this.delegate = delegate
  }

  static async create(options?: {
    wasmRoot?: string
    modelAssetPath?: string
  }): Promise<LocalMediaPipeObjectDetector | null> {
    if (typeof window === 'undefined' || typeof WebAssembly === 'undefined') {
      return null
    }

    const wasmRoot = options?.wasmRoot ?? '/mediapipe/wasm'
    const modelAssetPath = options?.modelAssetPath ?? MEDIAPIPE_OBJECT_DETECTOR_MODEL_URL

    try {
      const visionModule = (await import(
        /* turbopackIgnore: true */
        /* webpackIgnore: true */
        `${window.location.origin}/mediapipe/vision_bundle.mjs`
      )) as typeof import('@mediapipe/tasks-vision')

      const { FilesetResolver, ObjectDetector } = visionModule
      const fileset = await FilesetResolver.forVisionTasks(wasmRoot)

      const baseConfig = {
        runningMode: 'VIDEO' as const,
        scoreThreshold: 0.38,
        categoryAllowlist: ['cell phone', 'person', 'laptop', 'book', 'tablet'],
      }

      try {
        const gpuDetector = await ObjectDetector.createFromOptions(fileset, {
          ...baseConfig,
          baseOptions: {
            modelAssetPath,
            delegate: 'GPU',
          },
        })
        return new LocalMediaPipeObjectDetector(gpuDetector as unknown as ObjectDetectorInstance, 'GPU')
      } catch {
        const cpuDetector = await ObjectDetector.createFromOptions(fileset, {
          ...baseConfig,
          baseOptions: {
            modelAssetPath,
            delegate: 'CPU',
          },
        })
        return new LocalMediaPipeObjectDetector(cpuDetector as unknown as ObjectDetectorInstance, 'CPU')
      }
    } catch {
      // Graceful degradation if model download fails or hardware does not support
      return null
    }
  }

  detectFrame(
    video: HTMLVideoElement,
    timestampMs: number
  ): {
    snapshot: ObjectDetectionSnapshot
    signals: ProctorAlertSignal[]
  } {
    if (this.disposed) {
      return {
        snapshot: {
          status: 'error',
          phoneDetected: false,
          personCount: 0,
          objects: [],
          lastDetectedAtMs: null,
          sustainedPhoneDurationMs: 0,
        },
        signals: [],
      }
    }

    const result = this.detector.detectForVideo(video, timestampMs)
    const detections = result.detections ?? []
    const signals: ProctorAlertSignal[] = []

    const detectedObjects: DetectedObjectBox[] = []
    let hasPhone = false
    let phoneScore = 0
    let personCount = 0
    let hasLaptop = false

    const videoW = video.videoWidth || 640
    const videoH = video.videoHeight || 480

    for (const d of detections) {
      const cat = d.categories[0]
      if (!cat) continue
      const name = cat.categoryName.toLowerCase()
      const score = cat.score

      if (d.boundingBox) {
        detectedObjects.push({
          category: name,
          score: Number(score.toFixed(3)),
          boundingBox: {
            originX: Number((d.boundingBox.originX / videoW).toFixed(3)),
            originY: Number((d.boundingBox.originY / videoH).toFixed(3)),
            width: Number((d.boundingBox.width / videoW).toFixed(3)),
            height: Number((d.boundingBox.height / videoH).toFixed(3)),
          },
        })
      }

      if (name.includes('phone') && score >= 0.40) {
        hasPhone = true
        phoneScore = Math.max(phoneScore, score)
      } else if (name === 'person' && score >= 0.45) {
        personCount += 1
      } else if (name.includes('laptop') && score >= 0.45) {
        hasLaptop = true
      }
    }

    // Temporal Phone Persistence Logic (must be detected for ~1.8s sustained)
    let sustainedPhoneMs = 0
    if (hasPhone) {
      if (this.phoneDetectedStartedAtMs === null) {
        this.phoneDetectedStartedAtMs = timestampMs
      }
      this.consecutivePhoneFrames += 1
      sustainedPhoneMs = Math.max(0, timestampMs - this.phoneDetectedStartedAtMs)

      if (
        sustainedPhoneMs >= 1800 &&
        this.consecutivePhoneFrames >= 6 &&
        timestampMs - this.lastPhoneAlertAtMs >= 20000
      ) {
        this.lastPhoneAlertAtMs = timestampMs
        signals.push({
          eventType: 'PHONE_DETECTED',
          severity: 'critical',
          confidence: Number(Math.min(0.99, phoneScore + 0.1).toFixed(3)),
          sustainedDurationMs: Math.round(sustainedPhoneMs),
          consecutiveFrames: this.consecutivePhoneFrames,
          reason: `Mobile phone detected in camera workspace continuously for ${(sustainedPhoneMs / 1000).toFixed(1)}s (confidence: ${Math.round(phoneScore * 100)}%)`,
          details: {
            objectType: 'cell phone',
            score: phoneScore,
            sustainedDurationMs: Math.round(sustainedPhoneMs),
            consecutiveFrames: this.consecutivePhoneFrames,
          },
        })

        if (hasLaptop) {
          signals.push({
            eventType: 'MULTIPLE_DEVICES_DETECTED',
            severity: 'high',
            confidence: 0.88,
            reason: 'Multiple electronic devices (secondary laptop + phone) observed in candidate workspace',
            details: { secondaryDevices: ['laptop', 'cell phone'] },
          })
        }
      }
    } else {
      this.phoneDetectedStartedAtMs = null
      this.consecutivePhoneFrames = 0
    }

    // Temporal Person Detection Logic (detecting additional person > 1)
    if (personCount > 1) {
      if (this.personDetectedStartedAtMs === null) {
        this.personDetectedStartedAtMs = timestampMs
      }
      this.consecutivePersonFrames += 1
      const personElapsed = Math.max(0, timestampMs - this.personDetectedStartedAtMs)

      if (
        personElapsed >= 2500 &&
        this.consecutivePersonFrames >= 7 &&
        timestampMs - this.lastPersonAlertAtMs >= 20000
      ) {
        this.lastPersonAlertAtMs = timestampMs
        signals.push({
          eventType: 'ADDITIONAL_PERSON_DETECTED',
          severity: 'high',
          confidence: 0.89,
          sustainedDurationMs: Math.round(personElapsed),
          consecutiveFrames: this.consecutivePersonFrames,
          reason: `Additional person detected in examination room continuously for ${(personElapsed / 1000).toFixed(1)}s (${personCount} people detected)`,
          details: {
            personCount,
            sustainedDurationMs: Math.round(personElapsed),
            consecutiveFrames: this.consecutivePersonFrames,
          },
        })
      }
    } else {
      this.personDetectedStartedAtMs = null
      this.consecutivePersonFrames = 0
    }

    return {
      snapshot: {
        status: 'ready',
        phoneDetected: hasPhone,
        personCount,
        objects: detectedObjects,
        lastDetectedAtMs: hasPhone ? timestampMs : null,
        sustainedPhoneDurationMs: sustainedPhoneMs,
      },
      signals,
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    try {
      this.detector.close()
    } catch {
      // Ignore cleanup error during unmount
    }
  }
}

