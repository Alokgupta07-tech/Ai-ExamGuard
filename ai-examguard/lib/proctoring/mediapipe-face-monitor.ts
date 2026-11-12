import type { FaceBoundingBox, FaceLandmarkMetrics } from '@/types/proctoring'

export const MEDIAPIPE_BUNDLE_PATH = '/mediapipe/vision_bundle.mjs'
export const MEDIAPIPE_WASM_ROOT = '/mediapipe/wasm'

export const MEDIAPIPE_FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export class MediaPipeModelError extends Error {
  readonly stage: 'download_failed' | 'init_failed' | 'unsupported'

  constructor(
    message: string,
    stage: 'download_failed' | 'init_failed' | 'unsupported',
    cause?: unknown
  ) {
    super(message, { cause })
    this.name = 'MediaPipeModelError'
    this.stage = stage
  }
}

interface NormalizedLandmarkLike {
  x: number
  y: number
  z?: number
}

interface FaceLandmarkerInstance {
  detectForVideo(
    videoFrame: HTMLVideoElement,
    timestampMs: number
  ): {
    faceLandmarks?: NormalizedLandmarkLike[][]
  }
  close(): void
}

export interface LoadFaceMonitorOptions {
  bundleUrl?: string
  wasmRoot?: string
  modelAssetPath?: string
  downloadTimeoutMs?: number
  onStageChange?: (stage: 'downloading' | 'initializing') => void
}

async function verifyAssetReachable(
  url: string,
  timeoutMs: number,
  label: string
): Promise<void> {
  if (typeof fetch !== 'function') return

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new MediaPipeModelError(
        `${label} download failed (HTTP ${response.status}).`,
        'download_failed'
      )
    }
  } catch (error) {
    if (error instanceof MediaPipeModelError) throw error
    throw new MediaPipeModelError(
      `Unable to download ${label}. Check network connectivity and reload.`,
      'download_failed',
      error
    )
  } finally {
    clearTimeout(timer)
  }
}

export function extractLandmarkMetrics(
  faceLandmarks: NormalizedLandmarkLike[][],
  processedAtMs: number
): FaceLandmarkMetrics {
  const faceCount = faceLandmarks.length
  const primary = faceLandmarks[0]
  const landmarkCount = primary?.length ?? 0

  if (!primary || landmarkCount === 0) {
    return {
      faceCount,
      landmarkCount: 0,
      centeredInFrame: false,
      primaryBox: null,
      estimatedYawOffset: null,
      estimatedPitchOffset: null,
      estimatedRollDegrees: null,
      isGazeAverted: false,
      isObstructed: false,
      processedAtMs,
    }
  }

  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const pt of primary) {
    if (pt.x < minX) minX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.x > maxX) maxX = pt.x
    if (pt.y > maxY) maxY = pt.y
  }

  const width = Math.max(0, maxX - minX)
  const height = Math.max(0, maxY - minY)
  const centerX = minX + width / 2
  const centerY = minY + height / 2

  const primaryBox: FaceBoundingBox = {
    minX: Number(minX.toFixed(3)),
    minY: Number(minY.toFixed(3)),
    maxX: Number(maxX.toFixed(3)),
    maxY: Number(maxY.toFixed(3)),
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
    centerX: Number(centerX.toFixed(3)),
    centerY: Number(centerY.toFixed(3)),
  }

  // MediaPipe FaceMesh landmarks:
  // Nose: 1, Left cheek/temple: 234, Right cheek/temple: 454, Forehead: 10, Chin: 152
  let estimatedYawOffset: number | null = null
  let estimatedPitchOffset: number | null = null
  let estimatedRollDegrees: number | null = null
  let isGazeAverted = false

  if (landmarkCount > 454 && width > 0.01 && height > 0.01) {
    const nose = primary[1]
    const leftEdge = primary[234]
    const rightEdge = primary[454]
    const forehead = primary[10]
    const chin = primary[152]

    if (nose && leftEdge && rightEdge) {
      const faceMidX = (leftEdge.x + rightEdge.x) / 2
      const spanX = Math.max(0.05, Math.abs(rightEdge.x - leftEdge.x))
      estimatedYawOffset = Number(((nose.x - faceMidX) / spanX).toFixed(3))

      const rollRad = Math.atan2(rightEdge.y - leftEdge.y, rightEdge.x - leftEdge.x)
      estimatedRollDegrees = Number((rollRad * (180 / Math.PI)).toFixed(1))
    }

    if (nose && forehead && chin) {
      const faceMidY = (forehead.y + chin.y) / 2
      const spanY = Math.max(0.05, Math.abs(chin.y - forehead.y))
      estimatedPitchOffset = Number(((nose.y - faceMidY) / spanY).toFixed(3))
    }

    // Iris gaze checking if 468+ landmarks available
    if (landmarkCount > 473) {
      const leftIris = primary[468]
      const rightIris = primary[473]
      const leftEyeOuter = primary[33]
      const leftEyeInner = primary[133]
      if (leftIris && leftEyeOuter && leftEyeInner) {
        const eyeW = Math.abs(leftEyeInner.x - leftEyeOuter.x)
        if (eyeW > 0.01) {
          const irisPos = (leftIris.x - Math.min(leftEyeOuter.x, leftEyeInner.x)) / eyeW
          if (irisPos < 0.22 || irisPos > 0.78) {
            isGazeAverted = true
          }
        }
      }
    }

    // Gaze averted from extreme yaw or pitch (e.g. looking down at desk or sideways)
    if (
      (estimatedYawOffset !== null && Math.abs(estimatedYawOffset) > 0.32) ||
      (estimatedPitchOffset !== null && (estimatedPitchOffset > 0.28 || estimatedPitchOffset < -0.25))
    ) {
      isGazeAverted = true
    }
  }

  const isObstructed = landmarkCount > 0 && (landmarkCount < 350 || width < 0.08 || height < 0.08)

  const centeredInFrame =
    centerX >= 0.2 && centerX <= 0.8 && centerY >= 0.15 && centerY <= 0.85

  return {
    faceCount,
    landmarkCount,
    centeredInFrame,
    primaryBox,
    estimatedYawOffset,
    estimatedPitchOffset,
    estimatedRollDegrees,
    isGazeAverted,
    isObstructed,
    processedAtMs,
  }
}

export class LocalMediaPipeFaceMonitor {
  private readonly landmarker: FaceLandmarkerInstance
  readonly delegate: 'GPU' | 'CPU'
  private disposed = false

  private constructor(landmarker: FaceLandmarkerInstance, delegate: 'GPU' | 'CPU') {
    this.landmarker = landmarker
    this.delegate = delegate
  }

  static async create(
    options: LoadFaceMonitorOptions = {}
  ): Promise<LocalMediaPipeFaceMonitor> {
    if (typeof window === 'undefined' || typeof WebAssembly === 'undefined') {
      throw new MediaPipeModelError(
        'This browser does not support WebAssembly required for local AI monitoring.',
        'unsupported'
      )
    }

    const bundleUrl = options.bundleUrl ?? MEDIAPIPE_BUNDLE_PATH
    const wasmRoot = options.wasmRoot ?? MEDIAPIPE_WASM_ROOT
    const modelAssetPath = options.modelAssetPath ?? MEDIAPIPE_FACE_LANDMARKER_MODEL_URL
    const downloadTimeoutMs = options.downloadTimeoutMs ?? 15000

    options.onStageChange?.('downloading')

    await Promise.all([
      verifyAssetReachable(
        `${wasmRoot}/vision_wasm_internal.js`,
        downloadTimeoutMs,
        'MediaPipe Vision runtime'
      ),
      verifyAssetReachable(modelAssetPath, downloadTimeoutMs, 'MediaPipe Face Landmarker model'),
    ])

    options.onStageChange?.('initializing')

    let visionModule: typeof import('@mediapipe/tasks-vision')
    try {
      const resolvedBundleUrl =
        bundleUrl.startsWith('http://') || bundleUrl.startsWith('https://')
          ? bundleUrl
          : `${window.location.origin}${bundleUrl}`
      visionModule = (await import(
        /* turbopackIgnore: true */
        /* webpackIgnore: true */
        resolvedBundleUrl
      )) as typeof import('@mediapipe/tasks-vision')
    } catch (error) {
      throw new MediaPipeModelError(
        'Failed to load MediaPipe Vision module.',
        'init_failed',
        error
      )
    }

    const { FilesetResolver, FaceLandmarker } = visionModule
    let fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>
    try {
      fileset = await FilesetResolver.forVisionTasks(wasmRoot)
    } catch (error) {
      throw new MediaPipeModelError(
        'Failed to initialize MediaPipe WASM vision tasks runtime.',
        'download_failed',
        error
      )
    }

    const baseConfig = {
      runningMode: 'VIDEO' as const,
      numFaces: 4,
      minFaceDetectionConfidence: 0.55,
      minFacePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    }

    try {
      const gpuLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        ...baseConfig,
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
      })
      return new LocalMediaPipeFaceMonitor(gpuLandmarker, 'GPU')
    } catch {
      try {
        const cpuLandmarker = await FaceLandmarker.createFromOptions(fileset, {
          ...baseConfig,
          baseOptions: {
            modelAssetPath,
            delegate: 'CPU',
          },
        })
        return new LocalMediaPipeFaceMonitor(cpuLandmarker, 'CPU')
      } catch (cpuError) {
        throw new MediaPipeModelError(
          'Unable to initialize MediaPipe Face Landmarker runtime on GPU or CPU.',
          'init_failed',
          cpuError
        )
      }
    }
  }

  detectFrame(video: HTMLVideoElement, timestampMs: number): FaceLandmarkMetrics {
    if (this.disposed) {
      throw new MediaPipeModelError(
        'Face monitor has already been disposed.',
        'init_failed'
      )
    }
    const result = this.landmarker.detectForVideo(video, timestampMs)
    return extractLandmarkMetrics(result.faceLandmarks ?? [], timestampMs)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    try {
      this.landmarker.close()
    } catch {
      // Ignore cleanup failures during unmount
    }
  }
}
