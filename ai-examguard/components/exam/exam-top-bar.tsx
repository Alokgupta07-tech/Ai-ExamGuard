'use client';

import React from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Clock,
  CloudOff,
  Loader2,
  Maximize2,
  Mic,
  PanelLeft,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  AudioConnectionStatus,
  CameraConnectionStatus,
  FacePresenceStatus,
} from '@/types/proctoring';

export type SaveSyncStatus = 'saved' | 'saving' | 'queued' | 'error';

export interface ExamTopBarProps {
  title: string;
  courseCode: string;
  remainingSeconds: number;
  saveStatus: SaveSyncStatus;
  pendingCount: number;
  lastSavedAt: string | null;
  isOnline: boolean;
  monitoring: {
    cameraReady: boolean;
    micReady: boolean;
    fullscreenActive: boolean;
    requireCamera: boolean;
    requireAudio: boolean;
    requireFullscreen: boolean;
    visibilitySwitches: number;
    cameraStatus?: CameraConnectionStatus;
    faceStatus?: FacePresenceStatus;
    audioStatus?: AudioConnectionStatus;
    isPageFocused?: boolean;
    isTabVisible?: boolean;
  };
  onRetrySync: () => void;
  onEnterFullscreen: () => void;
  onToggleMobileNav: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function formatSavedTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function ExamTopBar({
  title,
  courseCode,
  remainingSeconds,
  saveStatus,
  pendingCount,
  lastSavedAt,
  isOnline,
  monitoring,
  onRetrySync,
  onEnterFullscreen,
  onToggleMobileNav,
}: ExamTopBarProps) {
  const isCriticalTime = remainingSeconds <= 60;
  const isWarningTime = !isCriticalTime && remainingSeconds <= 300;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-sidebar">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Exam Title + Mobile Navigator Trigger */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileNav}
            aria-label="Open question navigator"
            className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-surface-elevated transition-[background-color,border-color] duration-150 cursor-pointer"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-primary">
                {courseCode}
              </span>
              <h1 className="font-heading text-sm sm:text-base font-semibold text-foreground truncate">
                {title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Monitoring, Connection, Save Status, Countdown Timer */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Monitoring status */}
          <div
            className="hidden md:flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
            aria-label="Monitoring status"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-secondary shrink-0" />
            <span>Monitoring</span>
            {monitoring.requireCamera && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-[11px]',
                  monitoring.faceStatus === 'multiple_faces_detected' ||
                    monitoring.cameraStatus === 'disconnected' ||
                    monitoring.cameraStatus === 'permission_denied'
                    ? 'text-critical'
                    : monitoring.faceStatus === 'face_not_visible'
                      ? 'text-warning'
                      : monitoring.cameraReady
                        ? 'text-success'
                        : 'text-warning'
                )}
                title={
                  monitoring.faceStatus === 'multiple_faces_detected'
                    ? 'Multiple faces detected'
                    : monitoring.faceStatus === 'face_not_visible'
                      ? 'Face not visible'
                      : monitoring.cameraReady
                        ? 'Camera & face monitoring active'
                        : 'Camera unavailable'
                }
              >
                <Camera className="h-3 w-3" />
                {monitoring.faceStatus === 'multiple_faces_detected'
                  ? '2+ Faces'
                  : monitoring.faceStatus === 'face_not_visible'
                    ? 'No Face'
                    : monitoring.cameraStatus === 'disconnected'
                      ? 'Cam Lost'
                      : monitoring.cameraStatus === 'permission_denied'
                        ? 'Cam Denied'
                        : monitoring.cameraReady
                          ? 'Cam Live'
                          : 'No Cam'}
              </span>
            )}
            {monitoring.requireAudio && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-[11px]',
                  monitoring.audioStatus === 'disconnected' ||
                    monitoring.audioStatus === 'permission_denied' ||
                    monitoring.audioStatus === 'device_unavailable'
                    ? 'text-critical'
                    : monitoring.micReady
                      ? 'text-success'
                      : 'text-warning'
                )}
                title={
                  monitoring.audioStatus === 'disconnected'
                    ? 'Microphone disconnected during session'
                    : monitoring.audioStatus === 'permission_denied'
                      ? 'Microphone permission denied'
                      : monitoring.micReady
                        ? 'Microphone live (local energy analysis only)'
                        : 'Microphone unavailable'
                }
              >
                <Mic className="h-3 w-3" />
                {monitoring.audioStatus === 'disconnected'
                  ? 'Mic Lost'
                  : monitoring.audioStatus === 'permission_denied'
                    ? 'Mic Denied'
                    : monitoring.micReady
                      ? 'Mic Live'
                      : 'No Mic'}
              </span>
            )}
            {monitoring.isTabVisible === false && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[11px] text-warning"
                title="Examination tab is hidden"
              >
                Tab Hidden
              </span>
            )}
            {monitoring.isTabVisible !== false && monitoring.isPageFocused === false && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[11px] text-warning"
                title="Examination window is not currently focused"
              >
                Focus Lost
              </span>
            )}
            {monitoring.requireFullscreen && !monitoring.fullscreenActive && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onEnterFullscreen}
                className="border-warning/50 text-warning hover:text-warning h-5 px-1.5"
              >
                <Maximize2 className="h-3 w-3" />
                Fullscreen
              </Button>
            )}
            {monitoring.requireFullscreen && monitoring.fullscreenActive && (
              <span className="text-[11px] font-medium text-success">Locked</span>
            )}
          </div>

          {/* Connection status */}
          <div
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium',
              isOnline
                ? 'border-border bg-card text-foreground'
                : 'border-critical/40 bg-critical/10 text-critical'
            )}
            role="status"
            aria-label={isOnline ? 'Connection online' : 'Connection offline'}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-critical" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Save status */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium',
              saveStatus === 'saved' && 'border-border bg-card text-muted-foreground',
              saveStatus === 'saving' && 'border-primary/35 bg-primary/10 text-primary',
              saveStatus === 'queued' && 'border-warning/40 bg-warning/10 text-warning',
              saveStatus === 'error' && 'border-critical/40 bg-critical/10 text-critical'
            )}
            role="status"
            aria-live="polite"
          >
            {saveStatus === 'saved' && (
              <>
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="hidden sm:inline">
                  Saved{lastSavedAt ? ` · ${formatSavedTime(lastSavedAt)}` : ''}
                </span>
                <span className="sm:hidden">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>Saving…</span>
              </>
            )}
            {saveStatus === 'queued' && (
              <>
                <CloudOff className="h-3.5 w-3.5 shrink-0" />
                <span>Queued ({pendingCount})</span>
              </>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={onRetrySync}
                className="inline-flex items-center gap-1 cursor-pointer hover:underline"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Retry sync</span>
                <RefreshCw className="h-3 w-3 shrink-0" />
              </button>
            )}
          </div>

          {/* Server-controlled Countdown Timer */}
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm sm:text-base font-semibold tabular-nums',
              isCriticalTime
                ? 'border-critical/60 bg-critical/15 text-critical'
                : isWarningTime
                  ? 'border-warning/60 bg-warning/15 text-warning'
                  : 'border-primary/35 bg-card text-foreground'
            )}
            aria-label={`Time remaining ${formatCountdown(remainingSeconds)}`}
          >
            <Clock
              className={cn(
                'h-4 w-4 shrink-0',
                isCriticalTime
                  ? 'text-critical'
                  : isWarningTime
                    ? 'text-warning'
                    : 'text-primary'
              )}
            />
            <span>{formatCountdown(remainingSeconds)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
