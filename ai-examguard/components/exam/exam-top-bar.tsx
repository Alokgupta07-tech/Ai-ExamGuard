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
  Send,
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
  courseName?: string;
  examType?: string;
  remainingSeconds: number;
  saveStatus: SaveSyncStatus;
  pendingCount: number;
  lastSavedAt: string | null;
  isOnline: boolean;
  answeredCount?: number;
  totalQuestions?: number;
  onRequestSubmit?: () => void;
  isSubmitting?: boolean;
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

export function ExamTopBar({
  title,
  courseCode,
  courseName,
  examType,
  remainingSeconds,
  saveStatus,
  pendingCount,
  lastSavedAt,
  isOnline,
  answeredCount = 0,
  totalQuestions = 0,
  onRequestSubmit,
  isSubmitting = false,
  monitoring,
  onRetrySync,
  onEnterFullscreen,
  onToggleMobileNav,
}: ExamTopBarProps) {
  const isCriticalTime = remainingSeconds <= 60;
  const isWarningTime = !isCriticalTime && remainingSeconds <= 300;

  const progressPct =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const derivedExamType =
    examType ||
    (title.toLowerCase().includes('mid-sem')
      ? 'Mid-Semester Written'
      : title.toLowerCase().includes('end-sem')
      ? 'End-Semester Draft'
      : title.toLowerCase().includes('cla-3')
      ? 'Continuous Assessment (CLA-3)'
      : 'Academic Examination');

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-sidebar shadow-[0_1px_4px_rgba(24,35,33,0.03)]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Left: Mobile Nav Button + Brand & Subject (Image 3 Style) */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileNav}
            aria-label="Open question navigator"
            className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex items-center gap-3">
            {/* Exam Type pill */}
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Exam Type
              </span>
              <span className="font-heading text-xs font-semibold text-primary truncate max-w-[180px]">
                {derivedExamType}
              </span>
            </div>

            <div className="hidden sm:block h-7 w-px bg-border" />

            {/* Subject */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded border border-border bg-card px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                  {courseCode}
                </span>
                <h1 className="font-heading text-sm sm:text-base font-semibold text-foreground truncate max-w-[260px] sm:max-w-[360px]">
                  {courseName || title}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Completion Progress Bar (Image 3 Style: Completed (1/4) 40%) */}
        {totalQuestions > 0 && (
          <div className="hidden md:flex flex-col items-center gap-1 min-w-[180px]">
            <div className="flex items-center justify-between w-full text-xs">
              <span className="text-muted-foreground font-medium">
                Completed ({answeredCount}/{totalQuestions})
              </span>
              <span className="font-mono font-semibold text-foreground">
                {progressPct}%
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Right: Proctoring, Online status, and Submit Button (Image 3 Style) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Proctoring telemetry pill */}
          <div
            className="hidden xl:flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
            aria-label="Proctoring status"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium text-[11px]">AI Proctor</span>
            {monitoring.requireCamera && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-[11px]',
                  monitoring.cameraReady ? 'text-emerald-600 font-medium' : 'text-amber-600'
                )}
              >
                <Camera className="h-3 w-3" />
                {monitoring.cameraReady ? 'Live' : 'Off'}
              </span>
            )}
            {monitoring.requireAudio && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-[11px]',
                  monitoring.micReady ? 'text-emerald-600 font-medium' : 'text-amber-600'
                )}
              >
                <Mic className="h-3 w-3" />
                {monitoring.micReady ? 'Live' : 'Off'}
              </span>
            )}
            {monitoring.requireFullscreen && (
              <span className={cn(
                'text-[11px] font-mono',
                monitoring.fullscreenActive ? 'text-emerald-600' : 'text-amber-600'
              )}>
                {monitoring.fullscreenActive ? 'Full' : 'Windowed'}
              </span>
            )}
          </div>

          {/* Sync indicator */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono',
              saveStatus === 'saved'
                ? 'border-border bg-card text-muted-foreground'
                : saveStatus === 'saving'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-amber-500/40 bg-amber-50 text-amber-800'
            )}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            ) : saveStatus === 'saved' ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <CloudOff className="h-3 w-3 text-amber-600" />
            )}
            <span className="hidden sm:inline">
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Queued'}
            </span>
          </div>

          {/* Prominent Submit Answer Button (as featured in Reference Image 3) */}
          {onRequestSubmit && (
            <Button
              type="button"
              onClick={onRequestSubmit}
              disabled={isSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition-all text-xs sm:text-sm px-3.5 sm:px-5 py-2 h-9 sm:h-10 rounded-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Submit Answer
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
