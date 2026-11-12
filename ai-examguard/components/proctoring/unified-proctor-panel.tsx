'use client'

import React, { useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Maximize2,
  Mic,
  Monitor,
  Phone,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  Smartphone,
  UserCheck,
  UserX,
  Users,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  AudioMonitorSnapshot,
  BrowserMonitorSnapshot,
  CameraMonitorSnapshot,
  DetectedObjectBox,
} from '@/types/proctoring'

export interface UnifiedProctorPanelProps {
  cameraSnapshot: CameraMonitorSnapshot
  audioSnapshot: AudioMonitorSnapshot
  browserSnapshot: BrowserMonitorSnapshot
  warningCount: number
  maxWarnings?: number
  requireCamera?: boolean
  requireAudio?: boolean
  requireFullscreen?: boolean
  attachVideoElement: (node: HTMLVideoElement | null) => void
  onRetryCamera: () => void
  onRetryAudio: () => void
  onRequestFullscreen?: () => void
  variant?: 'sidebar' | 'drawer'
}

export function UnifiedProctorPanel({
  cameraSnapshot,
  audioSnapshot,
  browserSnapshot,
  warningCount,
  maxWarnings = 3,
  requireCamera = true,
  requireAudio = true,
  requireFullscreen = true,
  attachVideoElement,
  onRetryCamera,
  onRetryAudio,
  onRequestFullscreen,
  variant = 'sidebar',
}: UnifiedProctorPanelProps) {
  const [cameraExpanded, setCameraExpanded] = useState(true)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const isCameraLive = cameraSnapshot.cameraStatus === 'connected'
  const isFacePresent = cameraSnapshot.faceStatus === 'present'
  const isMultipleFaces = cameraSnapshot.faceStatus === 'multiple_faces_detected'
  const isFaceAbsent = cameraSnapshot.faceStatus === 'face_not_visible'

  const objSnap = cameraSnapshot.objectDetection
  const phoneDetected = Boolean(objSnap?.phoneDetected)
  const personCount = objSnap?.personCount ?? (isFacePresent ? 1 : 0)

  const isAudioLive = audioSnapshot.audioStatus === 'connected'
  const isSpeechDetected = audioSnapshot.activityProgressRatio > 0.5 || audioSnapshot.isElevatedEnergy

  const metrics = cameraSnapshot.metrics
  const yaw = metrics?.estimatedYawOffset ?? 0
  const pitch = metrics?.estimatedPitchOffset ?? 0
  const isGazeAverted = metrics?.isGazeAverted ?? false

  return (
    <div className="w-full flex flex-col space-y-3 font-sans">
      {/* 1. THREE-STRIKE WARNING CENTER HEADER */}
      <div
        className={cn(
          'rounded-xl border p-3.5 transition-all',
          warningCount >= maxWarnings
            ? 'border-destructive/60 bg-destructive/10'
            : warningCount === maxWarnings - 1
            ? 'border-warning/60 bg-warning/15'
            : warningCount > 0
            ? 'border-warning/40 bg-warning/8'
            : 'border-border bg-card shadow-sm'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={cn(
                'h-4 w-4',
                warningCount >= maxWarnings
                  ? 'text-destructive'
                  : warningCount > 0
                  ? 'text-warning'
                  : 'text-primary'
              )}
            />
            <span className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
              Integrity Status
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-mono text-xs font-bold px-2 py-0.5 rounded-md border',
                warningCount >= maxWarnings
                  ? 'border-destructive/50 bg-destructive text-destructive-foreground'
                  : warningCount === 2
                  ? 'border-warning/50 bg-warning text-warning-foreground'
                  : warningCount === 1
                  ? 'border-warning/40 bg-warning/20 text-warning'
                  : 'border-border bg-surface-elevated text-foreground'
              )}
            >
              {warningCount} / {maxWarnings} Strikes
            </span>
          </div>
        </div>

        {/* 3-Strike Visual Indicator Bars */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
          {Array.from({ length: maxWarnings }).map((_, i) => {
            const strikeNum = i + 1
            const isFilled = warningCount >= strikeNum
            const isDanger = strikeNum === maxWarnings

            return (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  isFilled
                    ? isDanger
                      ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-warning'
                    : 'bg-border/60'
                )}
                title={`Strike ${strikeNum}`}
              />
            )
          })}
        </div>

        {warningCount > 0 && (
          <p className="text-[11px] font-medium text-warning mt-2 leading-tight">
            {warningCount >= maxWarnings
              ? 'Examination automatically submitted under policy.'
              : warningCount === maxWarnings - 1
              ? 'Final Warning! One more violation triggers auto-submission.'
              : 'Violation recorded. Return to compliant environment.'}
          </p>
        )}
      </div>

      {/* 2. LIVE CAMERA & AI OBJECT DETECTOR MODULE */}
      {requireCamera && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border bg-surface-elevated/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span className="font-heading text-xs font-semibold text-foreground">
                Camera &amp; Vision AI
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium',
                  isCameraLive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border border-border'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isCameraLive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                  )}
                />
                {isCameraLive ? 'LIVE' : 'OFFLINE'}
              </span>

              <button
                type="button"
                onClick={() => setCameraExpanded(!cameraExpanded)}
                className="text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Toggle camera view"
              >
                {cameraExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {cameraExpanded && (
            <div className="p-3 space-y-2.5">
              {/* Webcam Viewport */}
              <div className="relative aspect-video w-full rounded-lg bg-black/90 overflow-hidden border border-border/80 flex items-center justify-center">
                <video
                  ref={attachVideoElement}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />

                {/* Overlaid Detection Badges */}
                {phoneDetected && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold shadow-lg animate-bounce">
                    <Smartphone className="h-3 w-3" />
                    PHONE DETECTED
                  </div>
                )}

                {personCount > 1 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-lg">
                    <Users className="h-3 w-3" />
                    +{personCount - 1} PERSON
                  </div>
                )}

                {!isCameraLive && (
                  <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="h-6 w-6 text-muted-foreground mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Camera Disconnected</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-2.5">
                      Ensure camera permissions are enabled.
                    </p>
                    <Button size="xs" variant="outline" onClick={onRetryCamera}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reconnect
                    </Button>
                  </div>
                )}
              </div>

              {/* Status Indicator Pills */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {/* Face Presence Pill */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border',
                    isFaceAbsent
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : isMultipleFaces
                      ? 'border-warning/40 bg-warning/15 text-warning'
                      : 'border-border bg-surface-elevated text-foreground'
                  )}
                >
                  {isFaceAbsent ? (
                    <UserX className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  ) : isMultipleFaces ? (
                    <Users className="h-3.5 w-3.5 shrink-0 text-warning" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate">
                    {isFaceAbsent
                      ? 'Face Absent'
                      : isMultipleFaces
                      ? 'Multiple Faces'
                      : 'Candidate Verified'}
                  </span>
                </div>

                {/* Mobile Phone Status Pill */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border',
                    phoneDetected
                      ? 'border-destructive/50 bg-destructive/15 text-destructive font-semibold'
                      : 'border-border bg-surface-elevated text-muted-foreground'
                  )}
                >
                  <Smartphone
                    className={cn('h-3.5 w-3.5 shrink-0', phoneDetected ? 'text-destructive' : 'text-muted-foreground')}
                  />
                  <span className="truncate">
                    {phoneDetected ? 'Phone Detected' : 'No Devices'}
                  </span>
                </div>
              </div>

              {/* Head-Pose & Attention Radar */}
              <div className="rounded-lg border border-border/80 bg-surface-elevated/40 p-2.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Eye className={cn('h-3.5 w-3.5', isGazeAverted ? 'text-warning' : 'text-primary')} />
                  <span className="text-muted-foreground">Screen Attention</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded font-semibold',
                      isGazeAverted
                        ? 'bg-warning/20 text-warning'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {isGazeAverted ? 'Looking Away' : 'Screen Focused'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. AUDIO INTELLIGENCE & VAD MODULE */}
      {requireAudio && (
        <div className="rounded-xl border border-border bg-card shadow-sm p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-primary" />
              <span className="font-heading text-xs font-semibold text-foreground">
                Audio Intelligence
              </span>
            </div>

            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {audioSnapshot.metrics?.dbfs ?? -90} dBFS
            </span>
          </div>

          {/* Sound Energy Level Bar */}
          <div className="space-y-1">
            <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-150',
                  (audioSnapshot.metrics?.rms ?? 0) > 0.08
                    ? 'bg-destructive'
                    : (audioSnapshot.metrics?.rms ?? 0) > 0.04
                    ? 'bg-warning'
                    : 'bg-primary'
                )}
                style={{
                  width: `${Math.min(100, Math.round((audioSnapshot.metrics?.level ?? 0) * 100))}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Ambient Noise</span>
              <span className="font-medium text-foreground">
                {isSpeechDetected ? (
                  <span className="text-warning font-semibold">Speech Activity</span>
                ) : (
                  'Quiet'
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. BROWSER & FULLSCREEN INTEGRITY */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-primary" />
            <span className="font-heading text-xs font-semibold text-foreground">
              Browser Security
            </span>
          </div>

          <span
            className={cn(
              'h-2 w-2 rounded-full',
              browserSnapshot.isOnline ? 'bg-emerald-500' : 'bg-destructive'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div
            className={cn(
              'flex items-center justify-between px-2.5 py-1.5 rounded-md border',
              browserSnapshot.fullscreenActive
                ? 'border-border bg-surface-elevated text-foreground'
                : 'border-warning/50 bg-warning/15 text-warning font-semibold'
            )}
          >
            <span>Fullscreen</span>
            <span>{browserSnapshot.fullscreenActive ? 'Active' : 'Exited'}</span>
          </div>

          <div
            className={cn(
              'flex items-center justify-between px-2.5 py-1.5 rounded-md border',
              browserSnapshot.isTabVisible
                ? 'border-border bg-surface-elevated text-foreground'
                : 'border-destructive/40 bg-destructive/10 text-destructive font-semibold'
            )}
          >
            <span>Tab</span>
            <span>{browserSnapshot.isTabVisible ? 'Focused' : 'Switched'}</span>
          </div>
        </div>

        {!browserSnapshot.fullscreenActive && requireFullscreen && onRequestFullscreen && (
          <Button
            size="xs"
            variant="outline"
            onClick={onRequestFullscreen}
            className="w-full mt-1 border-warning/50 text-warning hover:bg-warning/10"
          >
            <Maximize2 className="h-3 w-3 mr-1.5" />
            Re-enter Fullscreen
          </Button>
        )}
      </div>
    </div>
  )
}
