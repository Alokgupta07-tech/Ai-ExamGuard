'use client'

import React from 'react'
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Cpu,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  VideoOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  CameraConnectionStatus,
  CameraMonitorSnapshot,
  FacePresenceStatus,
  ModelStatus,
} from '@/types/proctoring'

export interface CameraMonitorPanelProps {
  snapshot: CameraMonitorSnapshot
  attachVideoElement: (node: HTMLVideoElement | null) => void
  onRetryCamera: () => void
  requireCamera?: boolean
  variant?: 'preflight' | 'compact'
  className?: string
}

function getCameraLabel(status: CameraConnectionStatus): {
  text: string
  toneClass: string
} {
  switch (status) {
    case 'connected':
      return { text: 'Camera Connected', toneClass: 'text-success' }
    case 'requesting_permission':
      return { text: 'Requesting Permission', toneClass: 'text-primary' }
    case 'permission_denied':
      return { text: 'Permission Denied', toneClass: 'text-critical' }
    case 'disconnected':
      return { text: 'Camera Disconnected', toneClass: 'text-critical' }
    case 'device_unavailable':
      return { text: 'Camera Unavailable', toneClass: 'text-warning' }
    case 'unsupported':
      return { text: 'Browser Unsupported', toneClass: 'text-critical' }
    default:
      return { text: 'Camera Standby', toneClass: 'text-muted-foreground' }
  }
}

function getModelLabel(
  status: ModelStatus,
  delegate: 'GPU' | 'CPU' | null
): { text: string; toneClass: string } {
  switch (status) {
    case 'downloading':
      return { text: 'Downloading MediaPipe Model…', toneClass: 'text-primary' }
    case 'initializing':
      return { text: 'Initializing Face Landmarker…', toneClass: 'text-primary' }
    case 'ready':
      return {
        text: delegate ? `Face Landmarker Ready (${delegate})` : 'Face Landmarker Ready',
        toneClass: 'text-success',
      }
    case 'download_failed':
      return { text: 'Model Download Failed', toneClass: 'text-critical' }
    case 'init_failed':
      return { text: 'Model Init Failed', toneClass: 'text-critical' }
    default:
      return { text: 'AI Standby', toneClass: 'text-muted-foreground' }
  }
}

function getFaceLabel(status: FacePresenceStatus, faceCount: number | undefined): {
  text: string
  toneClass: string
} {
  switch (status) {
    case 'present':
      return {
        text: faceCount === 1 ? 'Single Face Present' : 'Face Monitoring Active',
        toneClass: 'text-success',
      }
    case 'face_not_visible':
      return { text: 'Face Not Visible', toneClass: 'text-warning' }
    case 'multiple_faces_detected':
      return { text: 'Multiple Faces Detected', toneClass: 'text-critical' }
    case 'calibrating':
      return { text: 'Calibrating Frame…', toneClass: 'text-primary' }
    case 'initializing':
      return { text: 'Starting Vision Loop…', toneClass: 'text-primary' }
    case 'paused':
      return { text: 'Monitoring Paused', toneClass: 'text-muted-foreground' }
    default:
      return { text: 'Not Started', toneClass: 'text-muted-foreground' }
  }
}

export function CameraMonitorPanel({
  snapshot,
  attachVideoElement,
  onRetryCamera,
  requireCamera = true,
  variant = 'preflight',
  className,
}: CameraMonitorPanelProps) {
  const camMeta = getCameraLabel(snapshot.cameraStatus)
  const modelMeta = getModelLabel(snapshot.modelStatus, snapshot.modelDelegate)
  const faceMeta = getFaceLabel(snapshot.faceStatus, snapshot.metrics?.faceCount)

  const cameraHasError =
    snapshot.cameraStatus === 'permission_denied' ||
    snapshot.cameraStatus === 'disconnected' ||
    snapshot.cameraStatus === 'device_unavailable' ||
    snapshot.cameraStatus === 'unsupported'

  const modelHasError =
    snapshot.modelStatus === 'download_failed' || snapshot.modelStatus === 'init_failed'

  const showRetry = cameraHasError || modelHasError
  const showVideo = snapshot.cameraStatus === 'connected'

  const landmarkCount = snapshot.metrics?.landmarkCount ?? 0
  const sustainedProgress = Math.max(
    snapshot.absenceProgressRatio,
    snapshot.multipleFaceProgressRatio
  )

  if (variant === 'compact') {
    return (
      <aside
        aria-label="Local AI camera monitor"
        className={cn(
          'rounded-lg border border-border bg-surface-elevated p-3 space-y-2.5',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-secondary shrink-0" />
            Local Camera Monitor
          </span>
          <span className={cn('text-[11px] font-medium', faceMeta.toneClass)}>
            {faceMeta.text}
          </span>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-background">
          <video
            ref={attachVideoElement}
            autoPlay
            muted
            playsInline
            className={cn(
              'h-full w-full object-cover -scale-x-100',
              !showVideo && 'hidden'
            )}
          />
          {!showVideo && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center">
              {snapshot.cameraStatus === 'requesting_permission' ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <VideoOff className="h-5 w-5 text-warning" />
              )}
              <span className={cn('text-[11px] font-medium', camMeta.toneClass)}>
                {camMeta.text}
              </span>
            </div>
          )}
        </div>

        {sustainedProgress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {snapshot.multipleFaceProgressRatio > 0
                  ? 'Multiple faces filter'
                  : 'Face visibility filter'}
              </span>
              <span className="tabular-nums">{Math.round(sustainedProgress * 100)}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  'h-full transition-all duration-150',
                  snapshot.multipleFaceProgressRatio > 0 ? 'bg-critical' : 'bg-warning'
                )}
                style={{ width: `${Math.round(sustainedProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className={cn('inline-flex items-center gap-1', modelMeta.toneClass)}>
            <Cpu className="h-3 w-3 shrink-0" />
            {snapshot.modelStatus === 'ready'
              ? `MediaPipe ${snapshot.modelDelegate ?? 'Ready'}`
              : modelMeta.text}
          </span>
          {landmarkCount > 0 && (
            <span className="tabular-nums text-foreground">
              {landmarkCount} pts · {snapshot.fps || 5} fps
            </span>
          )}
        </div>

        {snapshot.errorMessage && (
          <p className="text-[11px] leading-snug text-warning">{snapshot.errorMessage}</p>
        )}

        {showRetry && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onRetryCamera}
            className="w-full"
          >
            <RefreshCw className="h-3 w-3" />
            Reconnect Camera & AI
          </Button>
        )}
      </aside>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-12 gap-4 items-start', className)}>
      {/* Live webcam viewport */}
      <div className="md:col-span-5 relative aspect-video w-full overflow-hidden rounded-md border border-border bg-background">
        <video
          ref={attachVideoElement}
          autoPlay
          muted
          playsInline
          className={cn(
            'h-full w-full object-cover -scale-x-100',
            !showVideo && 'hidden'
          )}
        />

        {!showVideo && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            {snapshot.cameraStatus === 'requesting_permission' ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <CameraOff className="h-6 w-6 text-muted-foreground" />
            )}
            <p className={cn('text-xs font-medium', camMeta.toneClass)}>{camMeta.text}</p>
            <p className="text-[11px] text-muted-foreground max-w-[240px]">
              {snapshot.errorMessage ??
                (requireCamera
                  ? 'Allow webcam permission to verify your face framing locally.'
                  : 'Optional local camera framing preview.')}
            </p>
          </div>
        )}
      </div>

      {/* Diagnostic Telemetry Readouts */}
      <div className="md:col-span-7 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-md border border-border bg-background p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="h-3.5 w-3.5 text-primary" />
                Webcam Stream
              </span>
              {snapshot.cameraStatus === 'connected' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : cameraHasError ? (
                <AlertTriangle className="h-3.5 w-3.5 text-critical" />
              ) : null}
            </div>
            <p className={cn('text-xs font-medium', camMeta.toneClass)}>{camMeta.text}</p>
            {snapshot.cameraLabel && (
              <p className="text-[11px] text-muted-foreground truncate">{snapshot.cameraLabel}</p>
            )}
          </div>

          <div className="rounded-md border border-border bg-background p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cpu className="h-3.5 w-3.5 text-secondary" />
                MediaPipe Vision
              </span>
              {snapshot.modelStatus === 'ready' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : modelHasError ? (
                <AlertTriangle className="h-3.5 w-3.5 text-critical" />
              ) : snapshot.modelStatus === 'downloading' ||
                snapshot.modelStatus === 'initializing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : null}
            </div>
            <p className={cn('text-xs font-medium', modelMeta.toneClass)}>{modelMeta.text}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {landmarkCount > 0
                ? `${landmarkCount} facial landmarks tracked (${snapshot.fps || 5} fps)`
                : 'Face Landmarker v1 float16'}
            </p>
          </div>
        </div>

        {/* Face presence & temporal filter card */}
        <div className="rounded-md border border-border bg-background p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {snapshot.faceStatus === 'multiple_faces_detected' ? (
                <Users className="h-3.5 w-3.5 text-critical" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-primary" />
              )}
              Presence Verification
            </span>
            <span className={cn('text-xs font-medium', faceMeta.toneClass)}>
              {faceMeta.text}
            </span>
          </div>

          {sustainedProgress > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  'h-full transition-all duration-150',
                  snapshot.multipleFaceProgressRatio > 0 ? 'bg-critical' : 'bg-warning'
                )}
                style={{ width: `${Math.round(sustainedProgress * 100)}%` }}
              />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            All video frames are processed locally inside your browser using MediaPipe. Raw video
            is never continuously uploaded; only advisory monitoring events are recorded.
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
            <span className="text-xs text-warning">
              {snapshot.errorMessage ?? 'Monitoring check requires attention before continuing.'}
            </span>
            <Button type="button" variant="outline" size="xs" onClick={onRetryCamera}>
              <RefreshCw className="h-3 w-3" />
              Retry Check
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

