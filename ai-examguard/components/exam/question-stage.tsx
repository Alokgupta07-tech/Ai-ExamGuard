'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudentQuestionView } from '@/types/exam-engine';

const DISPLAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface QuestionStageProps {
  question: StudentQuestionView;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionId: string | null;
  isFlagged: boolean;
  negativeMarking: number;
  onSelectOption: (optionId: string | null) => void;
  onToggleFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function QuestionStage({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  isFlagged,
  negativeMarking,
  onSelectOption,
  onToggleFlag,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: QuestionStageProps) {
  const penaltyPoints =
    negativeMarking > 0 ? Number((question.points * negativeMarking).toFixed(2)) : 0;

  return (
    <section
      aria-labelledby={`question-heading-${question.id}`}
      className="mx-auto w-full max-w-3xl space-y-6"
    >
      {/* Question Card */}
      <article className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Question Meta Header */}
        <div className="border-b border-border bg-sidebar/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id={`question-heading-${question.id}`}
              className="font-heading text-sm font-semibold text-foreground tabular-nums"
            >
              Question {questionNumber} of {totalQuestions}
            </h2>
            <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
              {question.points} {question.points === 1 ? 'mark' : 'marks'}
            </span>
            {penaltyPoints > 0 && (
              <span className="rounded border border-warning/35 bg-warning/10 px-2 py-0.5 text-xs text-warning tabular-nums">
                -{penaltyPoints} wrong
              </span>
            )}
            {question.category && (
              <span className="text-xs text-muted-foreground">{question.category}</span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={isFlagged}
            onClick={onToggleFlag}
            className={cn(
              isFlagged &&
                'border-warning/60 bg-warning/15 text-warning hover:bg-warning/20 hover:text-warning'
            )}
          >
            <Bookmark className={cn('h-3.5 w-3.5', isFlagged && 'fill-warning')} />
            {isFlagged ? 'Marked for review' : 'Mark for review'}
          </Button>
        </div>

        {/* Question Prompt */}
        <div className="px-6 py-6 sm:px-8 sm:py-7 space-y-6">
          <div className="max-w-[68ch] text-[1.075rem] sm:text-[1.1875rem] leading-[1.68] font-normal text-foreground whitespace-pre-wrap select-none">
            {question.prompt}
          </div>

          {/* Options Radio Group */}
          <div
            role="radiogroup"
            aria-labelledby={`question-heading-${question.id}`}
            className="space-y-3"
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
                  onClick={() => onSelectOption(opt.id)}
                  className={cn(
                    'w-full text-left rounded-md border px-4 py-3.5 sm:px-5 sm:py-4 flex items-start gap-3.5 transition-[background-color,border-color,color] duration-150 cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary/12 text-foreground'
                      : 'border-border bg-background hover:border-border-strong hover:bg-surface-elevated/60 text-foreground'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border font-mono text-xs font-semibold transition-[background-color,border-color,color] duration-150',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-surface-elevated text-muted-foreground'
                    )}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : displayLetter}
                  </span>

                  <span className="flex-1 text-base leading-[1.6] text-foreground pt-0.5 select-none">
                    {opt.content}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clear selection */}
          <div className="flex items-center justify-between pt-1 min-h-8">
            {selectedOptionId ? (
              <button
                type="button"
                onClick={() => onSelectOption(null)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear selection
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Select one option above.</span>
            )}

            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
              {selectedOptionId ? 'Answer selected' : 'Unanswered'}
            </span>
          </div>
        </div>

        {/* Centre Navigation Controls */}
        <div className="border-t border-border bg-sidebar/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={isFlagged}
            onClick={onToggleFlag}
            className={cn(
              'sm:hidden',
              isFlagged && 'text-warning hover:text-warning'
            )}
          >
            <Bookmark className={cn('h-3.5 w-3.5', isFlagged && 'fill-warning')} />
            {isFlagged ? 'Marked' : 'Review'}
          </Button>

          <Button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </article>
    </section>
  );
}
