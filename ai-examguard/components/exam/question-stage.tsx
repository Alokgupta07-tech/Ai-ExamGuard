'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudentQuestionView } from '@/types/exam-engine';

const DISPLAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface QuestionStageProps {
  question: StudentQuestionView;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionId: string | null;
  responseText?: string | null;
  isFlagged: boolean;
  negativeMarking: number;
  onSelectOption: (optionId: string | null) => void;
  onChangeResponseText?: (text: string | null) => void;
  onToggleFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  maxAllowedAttempts?: number | null;
  totalAnsweredCount?: number;
}

export function QuestionStage({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  responseText = '',
  isFlagged,
  negativeMarking,
  onSelectOption,
  onChangeResponseText,
  onToggleFlag,
  onPrevious,
  onNext,
  onFirst,
  onLast,
  hasPrevious,
  hasNext,
  maxAllowedAttempts,
  totalAnsweredCount = 0,
}: QuestionStageProps) {
  const penaltyPoints =
    negativeMarking > 0 ? Number((question.points * negativeMarking).toFixed(2)) : 0;

  const isDescriptive =
    question.type === 'essay' ||
    question.type === 'short_answer' ||
    (question.options && question.options.length === 0);

  const isCurrentAnswered = isDescriptive
    ? Boolean(responseText && responseText.trim().length > 0)
    : Boolean(selectedOptionId);

  const isAttemptLimitReached =
    typeof maxAllowedAttempts === 'number' &&
    maxAllowedAttempts > 0 &&
    totalAnsweredCount >= maxAllowedAttempts &&
    !isCurrentAnswered;

  const wordCount = useMemo(() => {
    if (!responseText) return 0;
    const words = responseText.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [responseText]);

  const charCount = responseText?.length ?? 0;

  return (
    <section
      aria-labelledby={`question-heading-${question.id}`}
      className="mx-auto w-full max-w-4xl space-y-6"
    >
      {/* Mid-Sem / Selection Rule Notice Banner */}
      {typeof maxAllowedAttempts === 'number' && maxAllowedAttempts > 0 && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 flex items-center justify-between gap-3 text-sm transition-colors',
            isAttemptLimitReached
              ? 'border-warning/50 bg-warning/10 text-warning-foreground'
              : 'border-primary/30 bg-primary/8 text-foreground'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>SRM AP Examination Rule:</strong> Answer any{' '}
              <strong>{maxAllowedAttempts}</strong> of {totalQuestions} questions.
            </span>
          </div>
          <div className="shrink-0 font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-background border border-border">
            Answered: {totalAnsweredCount} / {maxAllowedAttempts}
          </div>
        </div>
      )}

      {/* Attempt Limit Alert (when trying to answer a 6th question) */}
      {isAttemptLimitReached && (
        <div className="rounded-lg border border-warning/60 bg-warning/15 px-4 py-3 flex items-start gap-3 text-sm text-foreground">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-warning">Maximum selection limit reached</p>
            <p className="text-xs text-muted-foreground">
              You have already answered the required {maxAllowedAttempts} questions for this examination.
              To answer Question {questionNumber}, please return to one of your previously answered questions
              and click &ldquo;Clear selection&rdquo; or erase the written response.
            </p>
          </div>
        </div>
      )}

      {/* Main Question Card (Styled after Reference Image 3) */}
      <article className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(24,35,33,0.04)] overflow-hidden">
        {/* Header Bar */}
        <div className="border-b border-border bg-surface-elevated/60 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-heading text-base font-semibold text-foreground tracking-tight">
              Question: {questionNumber}
            </span>
            <span className="rounded-md border border-border bg-card px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
              {question.points} {question.points === 1 ? 'mark' : 'marks'}
            </span>
            {penaltyPoints > 0 && (
              <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                -{penaltyPoints} wrong
              </span>
            )}
            {question.category && (
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                {question.category}
              </span>
            )}
            <span className="text-xs font-medium text-muted-foreground">
              ({isDescriptive ? 'Descriptive / Written' : 'Multiple Choice'})
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={isFlagged}
            onClick={onToggleFlag}
            className={cn(
              'transition-all duration-150',
              isFlagged
                ? 'border-warning/70 bg-warning/15 text-warning hover:bg-warning/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bookmark className={cn('h-3.5 w-3.5 mr-1.5', isFlagged && 'fill-warning text-warning')} />
            {isFlagged ? 'Bookmarked' : 'Save for Revision'}
          </Button>
        </div>

        {/* Question Prompt */}
        <div className="px-6 py-6 sm:px-8 sm:py-8 space-y-6">
          <div className="text-[1.125rem] sm:text-[1.25rem] leading-[1.65] font-medium text-foreground whitespace-pre-wrap select-none">
            {question.prompt}
          </div>

          {/* Conditional Rendering: MCQ Options vs Descriptive Written Response */}
          {!isDescriptive ? (
            /* MCQ Option Buttons */
            <div
              role="radiogroup"
              aria-labelledby={`question-heading-${question.id}`}
              className="space-y-3 pt-2"
            >
              {question.options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                const displayLetter = DISPLAY_LETTERS[idx] ?? opt.label;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isAttemptLimitReached && !isSelected}
                    onClick={() => {
                      if (isAttemptLimitReached && !isSelected) return;
                      onSelectOption(opt.id);
                    }}
                    className={cn(
                      'w-full text-left rounded-xl border px-5 py-4 flex items-center gap-4 transition-all duration-150 cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : isAttemptLimitReached
                        ? 'border-border/50 bg-surface-elevated/40 opacity-60 cursor-not-allowed text-muted-foreground'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-surface-elevated/70 text-foreground'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold transition-all duration-150',
                        isSelected
                          ? 'border border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground'
                          : 'border border-border bg-surface-elevated text-muted-foreground'
                      )}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : displayLetter}
                    </span>

                    <span className="flex-1 text-[0.975rem] sm:text-base leading-[1.55] select-none font-normal">
                      {opt.content}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Descriptive / Written Answer Input Area */
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Written Response (Auto-saved continuously)
                </span>
                <span className="font-mono">
                  {wordCount} words · {charCount} characters
                </span>
              </div>

              <textarea
                value={responseText || ''}
                disabled={isAttemptLimitReached}
                onChange={(e) => {
                  if (isAttemptLimitReached) return;
                  onChangeResponseText?.(e.target.value);
                }}
                placeholder={
                  isAttemptLimitReached
                    ? 'Selection limit reached. Clear an answer from another question to write here.'
                    : 'Compose your detailed academic answer here. Use clear headings, bullet points, or pseudocode as required by the rubric…'
                }
                rows={10}
                className={cn(
                  'w-full rounded-xl border border-border bg-surface-elevated/50 p-4 font-sans text-sm sm:text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner resize-y transition-all',
                  isAttemptLimitReached && 'opacity-60 cursor-not-allowed bg-muted/40'
                )}
              />

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  Rubric: Structured explanations with architectural diagrams and step-by-step reasoning receive full credit.
                </span>
              </div>
            </div>
          )}

          {/* Clear Selection & Status Row */}
          <div className="flex items-center justify-between pt-2 min-h-8 border-t border-border/70">
            {isCurrentAnswered ? (
              <button
                type="button"
                onClick={() => {
                  if (isDescriptive) {
                    onChangeResponseText?.('');
                  } else {
                    onSelectOption(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Answer
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {isAttemptLimitReached
                  ? 'Locked: 5 of 5 questions already answered.'
                  : isDescriptive
                  ? 'Type your answer above to mark this question as answered.'
                  : 'Select an option above.'}
              </span>
            )}

            <span className="text-xs font-mono font-medium text-muted-foreground">
              {isCurrentAnswered ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Answer Saved
                </span>
              ) : (
                'Unanswered'
              )}
            </span>
          </div>
        </div>

        {/* Bottom Pagination Controls (Styled exactly like Image 3: First, Back, X/Y, Next, Last) */}
        <div className="border-t border-border bg-surface-elevated/60 px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFirst}
                disabled={!hasPrevious}
                className="hidden sm:inline-flex"
              >
                <ChevronsLeft className="h-4 w-4 mr-1" />
                First
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          <div className="font-mono text-sm font-semibold px-3 py-1.5 rounded-lg bg-card border border-border text-foreground">
            {questionNumber} / {totalQuestions}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>

            {onLast && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLast}
                disabled={!hasNext}
                className="hidden sm:inline-flex"
              >
                Last
                <ChevronsRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
