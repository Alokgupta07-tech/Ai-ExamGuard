'use client';

import React, { useMemo, useState } from 'react';
import { Bookmark, Check, X } from 'lucide-react';
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
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answersMap,
  flaggedSet,
  onSelectQuestion,
  mobileOpen = false,
  onCloseMobile,
}: QuestionNavigatorProps) {
  const [filter, setFilter] = useState<NavFilter>('all');

  const counts = useMemo(() => {
    let answered = 0;
    let flagged = 0;
    for (const q of questions) {
      if (answersMap[q.id]) answered += 1;
      if (flaggedSet.has(q.id)) flagged += 1;
    }
    return {
      all: questions.length,
      answered,
      unanswered: questions.length - answered,
      flagged,
    };
  }, [questions, answersMap, flaggedSet]);

  const visibleIndices = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        if (filter === 'unanswered') return !answersMap[q.id];
        if (filter === 'flagged') return flaggedSet.has(q.id);
        return true;
      });
  }, [questions, filter, answersMap, flaggedSet]);

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Question Navigator
          </h2>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {counts.answered} answered · {counts.unanswered} remaining
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

      {/* Filter pills */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
        {(
          [
            { key: 'all', label: `All (${counts.all})` },
            { key: 'unanswered', label: `Open (${counts.unanswered})` },
            { key: 'flagged', label: `Marked (${counts.flagged})` },
          ] as { key: NavFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-[background-color,color,border-color] duration-150 cursor-pointer border',
              filter === tab.key
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-transparent bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Number Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {visibleIndices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No questions match this filter.
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-2" role="list" aria-label="Question numbers">
            {visibleIndices.map(({ q, idx }) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = Boolean(answersMap[q.id]);
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
                    isFlagged ? ', marked for review' : ''
                  }${isCurrent ? ', current question' : ''}`}
                  className={cn(
                    'relative flex h-10 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums transition-[background-color,border-color,color] duration-150 cursor-pointer',
                    isCurrent
                      ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/45'
                      : isAnswered
                        ? 'border-success/45 bg-success/10 text-success hover:bg-success/15'
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
                  {!isFlagged && isAnswered && !isCurrent && (
                    <Check
                      aria-hidden="true"
                      className="sr-only"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Accessible Legend */}
      <div className="px-4 py-3.5 border-t border-border bg-card/50 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded border border-primary bg-primary/20 ring-1 ring-primary/50 shrink-0" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded border border-success/50 bg-success/15 shrink-0" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded border border-border bg-card shrink-0" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <Bookmark className="h-3.5 w-3.5 fill-warning text-warning shrink-0" />
          <span>Marked</span>
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
            className="fixed inset-0 bg-background/85"
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
