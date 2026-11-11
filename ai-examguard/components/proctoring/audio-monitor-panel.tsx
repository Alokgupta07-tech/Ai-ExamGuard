'use client'

import React from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AudioConnectionStatus, AudioMonitorSnapshot } from '@/types/proctoring'

export interface AudioMonitorPanelProps {
  snapshot: AudioMonitorSnapshot
  onRetryAudio: () => void
  requireAudio?: boolean
  variant?: 'preflight' | 'compact'
  className?: string
}

function getAudioStatusMeta(status: AudioConnectionStatus): {
  text: string
  toneClass: string
} {
  switch (status) {
    case 'connected':
      return { text: 'Microphone Connected', toneClass: 'text-success' }
    case 'requesting_permission':
      return { text: 'Requesting Mic Permission', toneClass: 'text-primary' }
    case 'permission_denied':
      return { text: 'Mic Permission Denied', toneClass: 'text-critical' }
    case 'disconnected':
      return { text: 'Microphone Disconnected', toneClass: 'text-critical' }
    case 'device_unavailable':
      return { text: 'Microphone Unavailable', toneClass: 'text-warning' }
    case 'unsupported':
      return { text: 'Web Audio Unsupported', toneClass: 'text-critical' }
    default:
      return { text: 'Audio Standby', toneClass: 'text-muted-foreground' }
  }
}

export function AudioMonitorPanel({
  snapshot,
  onRetryAudio,
  requireAudio = true,
  variant = 'preflight',
  className,
}: AudioMonitorPanelProps) {
  const statusMeta = getAudioStatusMeta(snapshot.audioStatus)
  const hasError =
    snapshot.audioStatus === 'permission_denied' ||
    snapshot.audioStatus === 'disconnected' ||
    snapshot.audioStatus === 'device_unavailable' ||
    snapshot.audioStatus === 'unsupported'

  const bands = snapshot.metrics?.bands ?? [0, 0, 0, 0, 0, 0, 0, 0]
  const dbfs = snapshot.metrics?.dbfs ?? -90
  const levelPct = Math.round((snapshot.metrics?.level ?? 0) * 100)

  if (variant === 'compact') {
    return (
      <aside
        aria-label="Local Web Audio monitor"
        className={cn(
          'rounded-lg border border-border bg-surface-elevated p-3 space-y-2.5',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            {hasError ? (
              <MicOff className="h-3.5 w-3.5 text-critical shrink-0" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-secondary shrink-0" />
            )}
            Audio Energy Meter
          </span>
          <span className={cn('text-[11px] font-medium', statusMeta.toneClass)}>
            {snapshot.audioStatus === 'connected'
              ? snapshot.isElevatedEnergy
                ? 'Elevated Sound'
                : 'Quiet Baseline'
              : statusMeta.text}
          </span>
        </div>

        {/* Short-window 8-band visualizer */}
        <div className="rounded-md border border-border bg-background px-2.5 py-2 space-y-1.5">
          <div className="flex items-end gap-1 h-7" aria-hidden="true">
            {bands.map((band, idx) => {
              const barPct = Math.max(10, Math.round(band * 100))
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex-1 rounded-sm transition-all duration-100',
                    snapshot.isElevatedEnergy ? 'bg-warning' : 'bg-secondary'
                  )}
                  style={{ height: `${barPct}%` }}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{snapshot.vadStatus === 'active' ? 'VAD + Energy' : 'Acoustic Energy'}</span>
            <span>{snapshot.audioStatus === 'connected' ? `${dbfs} dBFS` : '—'}</span>
          </div>
        </div>

        {snapshot.activityProgressRatio > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-warning transition-all duration-150"
              style={{ width: `${Math.round(snapshot.activityProgressRatio * 100)}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded border border-border bg-background px-1.5 py-0.5">
            {snapshot.constraints.noiseSuppressionActive ? 'NS On' : 'NS Auto'}
          </span>
          <span className="rounded border border-border bg-background px-1.5 py-0.5">
            {snapshot.constraints.echoCancellationActive ? 'AEC On' : 'AEC Auto'}
          </span>
        </div>

        {snapshot.errorMessage && (
          <p className="text-[11px] leading-snug text-warning">{snapshot.errorMessage}</p>
        )}

        {hasError && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onRetryAudio}
            className="w-full"
          >
            <RefreshCw className="h-3 w-3" />
            Reconnect Microphone
          </Button>
        )}
      </aside>
    )
  }

  return (
    <div className={cn('rounded-md border border-border bg-background p-4 space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {snapshot.audioStatus === 'requesting_permission' ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : snapshot.audioStatus === 'connected' ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : hasError ? (
            <AlertTriangle className="h-4 w-4 text-critical" />
          ) : (
            <Volume2 className="h-4 w-4 text-secondary" />
          )}
          <div>
            <p className="text-xs font-medium text-foreground">
              Local Web Audio Verification {requireAudio ? '(required)' : '(optional)'}
            </p>
            <p className={cn('text-[11px]', statusMeta.toneClass)}>
              {statusMeta.text}
              {snapshot.micLabel ? ` · ${snapshot.micLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded border border-border px-2 py-0.5">
            Noise Suppression:{' '}
            {snapshot.constraints.noiseSuppressionActive
              ? 'Active'
              : snapshot.constraints.noiseSuppressionSupported
                ? 'Supported'
                : 'Unsupported'}
          </span>
          <span className="rounded border border-border px-2 py-0.5">
            Echo Cancellation:{' '}
            {snapshot.constraints.echoCancellationActive
              ? 'Active'
              : snapshot.constraints.echoCancellationSupported
                ? 'Supported'
                : 'Unsupported'}
          </span>
        </div>
      </div>

      {/* Live audio activity visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 flex items-end gap-1.5 h-10 rounded border border-border bg-surface-elevated px-3 py-2">
          {bands.map((band, idx) => {
            const barPct = Math.max(12, Math.round(band * 100))
            return (
              <div
                key={idx}
                className={cn(
                  'flex-1 rounded-sm transition-all duration-100',
                  snapshot.isElevatedEnergy ? 'bg-warning' : 'bg-secondary'
                )}
                style={{ height: `${barPct}%` }}
              />
            )
          })}
        </div>

        <div className="sm:col-span-7 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3 text-secondary" />
              {snapshot.vadStatus === 'active'
                ? 'VAD Speech Classifier Active'
                : 'Short-Window Acoustic Energy (RMS)'}
            </span>
            <span className="tabular-nums text-foreground">
              {snapshot.audioStatus === 'connected'
                ? `${dbfs} dBFS (${levelPct}%)`
                : 'Waiting for stream'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                'h-full transition-all duration-100',
                snapshot.isElevatedEnergy ? 'bg-warning' : 'bg-secondary'
              )}
              style={{ width: `${levelPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Measures ambient acoustic energy only — sound amplitude does not confirm human speech,
        speaker identity, or academic misconduct. Raw audio is never uploaded.
      </p>

      {hasError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
          <span className="text-xs text-warning">
            {snapshot.errorMessage ?? 'Microphone access is unavailable.'}
          </span>
          <Button type="button" variant="outline" size="xs" onClick={onRetryAudio}>
            <RefreshCw className="h-3 w-3" />
            Retry Mic Check
          </Button>
        </div>
      )}
    </div>
  )
}

