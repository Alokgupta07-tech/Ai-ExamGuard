'use client';

import React, { useMemo, useState } from 'react';
import { Bookmark, Check, Clock, HelpCircle, Layers, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentQuestionView } from '@/types/exam-engine';

type NavFilter = 'all' | 'unanswered' | 'flagged';

export interface QuestionNavigatorProps {
  questions: StudentQuestionView[];
  currentIndex: number;
  answersMap: Record<string, string | null>;
  flaggedSet: Set<string>;
  onSelectQuestion: (index: number) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  remainingSeconds?: number;
  totalDurationSeconds?: number;
  maxAllowedAttempts?: number | null;
}

function formatTimerMmSs(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answersMap,
  flaggedSet,
  onSelectQuestion,
  mobileOpen = false,
  onCloseMobile,
  remainingSeconds,
  totalDurationSeconds = 3600,
  maxAllowedAttempts,
}: QuestionNavigatorProps) {
  const [filter, setFilter] = useState<NavFilter>('all');

  const counts = useMemo(() => {
    let answered = 0;
    let flagged = 0;
    for (const q of questions) {
      const val = answersMap[q.id];
      if (val && val.trim().length > 0) answered += 1;
      if (flaggedSet.has(q.id)) flagged += 1;
    }
    return {
      all: questions.length,
      answered,
      unanswered: Math.max(0, questions.length - answered),
      flagged,
    };
  }, [questions, answersMap, flaggedSet]);

  const visibleIndices = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        const val = answersMap[q.id];
        const isAnswered = Boolean(val && val.trim().length > 0);
        if (filter === 'unanswered') return !isAnswered;
        if (filter === 'flagged') return flaggedSet.has(q.id);
        return true;
      });
  }, [questions, filter, answersMap, flaggedSet]);

  // Circular timer progress computation (circumference for r=38 is 2 * PI * 38 ≈ 238.76)
  const timerRadius = 38;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress =
    typeof remainingSeconds === 'number' && totalDurationSeconds > 0
      ? Math.max(0, Math.min(1, remainingSeconds / totalDurationSeconds))
      : 1;
  const strokeDashoffset = timerCircumference - timerProgress * timerCircumference;

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Examination Navigation
          </h2>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {counts.answered} of {questions.length} completed
          </p>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close question navigator"
            className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Circular Timer Widget (from Reference Image 3) */}
      {typeof remainingSeconds === 'number' && (
        <div className="p-5 border-b border-border bg-card/60 flex flex-col items-center justify-center space-y-2">
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={timerRadius}
                className="stroke-muted/30"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={timerRadius}
                className={cn(
                  'transition-all duration-300 ease-linear',
                  remainingSeconds <= 300
                    ? 'stroke-critical'
                    : remainingSeconds <= 600
                    ? 'stroke-warning'
                    : 'stroke-primary'
                )}
                strokeWidth="6"
                strokeDasharray={timerCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold tracking-tight text-foreground">
                {formatTimerMmSs(remainingSeconds)}
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Timer Remaining
          </span>
        </div>
      )}

      {/* 5-of-7 Attempt Rule Tracker if applicable */}
      {typeof maxAllowedAttempts === 'number' && maxAllowedAttempts > 0 && (
        <div className="px-4 py-3 border-b border-border bg-primary/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Attempt Rule</span>
            <span className="font-mono font-semibold text-primary">
              {counts.answered} / {maxAllowedAttempts}
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-200',
                counts.answered >= maxAllowedAttempts ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{
                width: `${Math.min(100, (counts.answered / maxAllowedAttempts) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {counts.answered >= maxAllowedAttempts
              ? 'Required questions answered. Clear an answer to switch.'
              : `Answer any ${maxAllowedAttempts} questions to complete.`}
          </p>
        </div>
      )}

      {/* Quick Action Filters (from Reference Image 3) */}
      <div className="p-3 border-b border-border space-y-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
            filter === 'all'
              ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
              : 'border-transparent hover:bg-surface-elevated text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Layers className="h-3.5 w-3.5" /> All Questions
          </span>
          <span className="font-mono font-semibold">{counts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('flagged')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
            filter === 'flagged'
              ? 'border-warning/50 bg-warning/15 text-warning font-semibold'
              : 'border-transparent hover:bg-surface-elevated text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5" /> View Bookmarked
          </span>
          <span className="font-mono font-semibold">{counts.flagged}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('unanswered')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
            filter === 'unanswered'
              ? 'border-secondary/40 bg-secondary/15 text-secondary font-semibold'
              : 'border-transparent hover:bg-surface-elevated text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5" /> View Unanswered
          </span>
          <span className="font-mono font-semibold">{counts.unanswered}</span>
        </button>
      </div>

      {/* Question Number Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Question Grid
        </span>

        {visibleIndices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No questions match this filter.
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2" role="list" aria-label="Question numbers">
            {visibleIndices.map(({ q, idx }) => {
              const isCurrent = idx === currentIndex;
              const val = answersMap[q.id];
              const isAnswered = Boolean(val && val.trim().length > 0);
              const isFlagged = flaggedSet.has(q.id);

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    onSelectQuestion(idx);
                    onCloseMobile?.();
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Question ${idx + 1}, ${isAnswered ? 'answered' : 'unanswered'}${
                    isFlagged ? ', bookmarked' : ''
                  }${isCurrent ? ', current question' : ''}`}
                  className={cn(
                    'relative flex h-10 items-center justify-center rounded-lg border font-mono text-xs font-semibold tabular-nums transition-all duration-150 cursor-pointer shadow-sm',
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/40'
                      : isAnswered
                      ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                      : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                  )}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <Bookmark
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 h-3.5 w-3.5 fill-warning text-warning"
                    />
                  )}
                  {isAnswered && !isCurrent && (
                    <span className="sr-only">(Answered)</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Accessible Legend */}
      <div className="px-4 py-3 border-t border-border bg-card/60 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-primary bg-primary shrink-0" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-emerald-500 bg-emerald-500/20 shrink-0" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-border bg-card shrink-0" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <Bookmark className="h-3.5 w-3.5 fill-warning text-warning shrink-0" />
          <span>Bookmarked</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent left rail */}
      <aside
        aria-label="Examination question navigator"
        className="hidden lg:block w-72 shrink-0"
      >
        <div className="sticky top-16 h-[calc(100vh-8rem)]">{content}</div>
      </aside>

      {/* Mobile slide-over navigator */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-background/85 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="Examination question navigator"
            className="relative z-10 w-72 max-w-[85vw] h-full"
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
