'use client';

import React from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ExamBottomBarProps {
  answeredCount: number;
  totalQuestions: number;
  flaggedCount: number;
  pendingSyncCount: number;
  isSubmitting: boolean;
  onRequestSubmit: () => void;
}

export function ExamBottomBar({
  answeredCount,
  totalQuestions,
  flaggedCount,
  pendingSyncCount,
  isSubmitting,
  onRequestSubmit,
}: ExamBottomBarProps) {
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const progressPct =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <footer className="sticky bottom-0 z-20 border-t border-border bg-sidebar">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="hidden sm:block w-36 h-1.5 rounded-full bg-card overflow-hidden border border-border">
            <div
              className="h-full bg-primary transition-[transform] duration-200 origin-left"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground tabular-nums truncate">
            <span className="text-foreground font-semibold">{answeredCount}</span>/{totalQuestions}{' '}
            answered
            <span className="mx-2 text-border">|</span>
            <span>{unansweredCount} open</span>
            {flaggedCount > 0 && (
              <>
                <span className="mx-2 text-border">|</span>
                <span className="text-warning">{flaggedCount} marked</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {pendingSyncCount > 0 && (
            <span className="hidden md:inline text-xs text-warning">
              {pendingSyncCount} offline change{pendingSyncCount === 1 ? '' : 's'} pending
            </span>
          )}
          <Button
            type="button"
            variant="default"
            onClick={onRequestSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Examination
              </>
            )}
          </Button>
        </div>
      </div>
    </footer>
  );
}
