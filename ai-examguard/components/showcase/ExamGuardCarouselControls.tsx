'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FeatureCardData } from './ExamGuardFeatureCard';

export interface ExamGuardCarouselControlsProps {
  cards: FeatureCardData[];
  activeIndex: number;
  isPaused: boolean;
  isFlipped: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (index: number) => void;
  onTogglePause: () => void;
  onToggleFlip: () => void;
}

export function ExamGuardCarouselControls({
  cards,
  activeIndex,
  isPaused,
  isFlipped,
  onPrev,
  onNext,
  onSelectIndex,
  onTogglePause,
  onToggleFlip,
}: ExamGuardCarouselControlsProps) {
  return (
    <div className="w-full flex flex-col items-center gap-4 select-none">
      {/* 6 Feature Pill Indicators */}
      <div
        role="tablist"
        aria-label="AI ExamGuard Feature Modules"
        className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2"
      >
        {cards.map((card, idx) => {
          const isCurrent = idx === activeIndex;
          return (
            <button
              key={card.id}
              role="tab"
              aria-selected={isCurrent}
              tabIndex={isCurrent ? 0 : -1}
              onClick={() => onSelectIndex(idx)}
              className={cn(
                'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-300 border cursor-pointer',
                isCurrent
                  ? 'bg-primary/15 border-primary/40 text-primary font-semibold shadow-xs'
                  : 'bg-surface-elevated/40 border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-surface-elevated'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors duration-300',
                  isCurrent ? 'bg-primary' : 'bg-muted-foreground/40 group-hover:bg-muted-foreground'
                )}
              />
              <span className="hidden md:inline">{card.title}</span>
              <span className="md:hidden">{card.badge}</span>
            </button>
          );
        })}
      </div>

      {/* Primary Carousel Action Controls */}
      <div className="flex items-center gap-3">
        {/* Previous Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          aria-label="Previous feature module"
          className="h-9 w-9 p-0 rounded-full border-border/80 hover:border-primary/40 text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Play/Pause Auto-Rotate */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTogglePause}
          aria-label={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
          className={cn(
            'h-9 px-3 rounded-full border-border/80 text-xs font-mono gap-1.5 transition-colors',
            isPaused
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          <span>{isPaused ? 'Paused' : 'Auto-Rotate'}</span>
        </Button>

        {/* 3D Flip Active Card */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleFlip}
          aria-label={isFlipped ? 'Flip to preview' : 'Flip to technical specs'}
          className={cn(
            'h-9 px-3 rounded-full border-border/80 text-xs font-mono gap-1.5 transition-colors',
            isFlipped
              ? 'bg-secondary/10 border-secondary/30 text-secondary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>{isFlipped ? 'Show Front' : 'Flip Specs'}</span>
        </Button>

        {/* Next Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          aria-label="Next feature module"
          className="h-9 w-9 p-0 rounded-full border-border/80 hover:border-primary/40 text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Helpful Subtle Interaction Hint */}
      <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground pt-1">
        <span className="hidden sm:inline">Drag or swipe to rotate</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">←</kbd> <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">→</kbd> to navigate</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Space</kbd> to toggle</span>
      </div>
    </div>
  );
}

