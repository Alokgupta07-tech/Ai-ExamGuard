'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'card' | 'table' | 'list' | 'stat-grid' | 'text';

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
}

function PulseBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-elevated', className)}
      aria-hidden="true"
    />
  );
}

/**
 * Reusable loading skeleton patterns aligned with AI ExamGuard panel & table geometry.
 */
export function LoadingSkeleton({
  variant = 'card',
  count = 3,
  className,
}: LoadingSkeletonProps) {
  if (variant === 'stat-grid') {
    return (
      <div
        className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}
        aria-busy="true"
        aria-label="Loading metrics"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <PulseBlock className="h-3.5 w-24" />
              <PulseBlock className="h-9 w-9 rounded-md" />
            </div>
            <PulseBlock className="h-8 w-20" />
            <PulseBlock className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}
        aria-busy="true"
        aria-label="Loading table"
      >
        <div className="border-b border-border bg-surface-elevated/40 px-4 py-3 flex items-center gap-4">
          <PulseBlock className="h-4 w-32" />
          <PulseBlock className="h-4 w-24" />
          <PulseBlock className="h-4 w-28 ml-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center gap-4">
              <PulseBlock className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <PulseBlock className="h-3.5 w-40" />
                <PulseBlock className="h-2.5 w-24" />
              </div>
              <PulseBlock className="h-6 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading list">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 flex items-center gap-4"
          >
            <PulseBlock className="h-10 w-10 rounded-md shrink-0" />
            <div className="space-y-2 flex-1">
              <PulseBlock className="h-4 w-1/3" />
              <PulseBlock className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2.5', className)} aria-busy="true" aria-label="Loading text">
        {Array.from({ length: count }).map((_, i) => (
          <PulseBlock
            key={i}
            className={cn('h-3.5', i === count - 1 ? 'w-3/5' : 'w-full')}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-4">
          <PulseBlock className="h-5 w-1/2" />
          <PulseBlock className="h-20 w-full" />
          <div className="flex justify-between">
            <PulseBlock className="h-3 w-20" />
            <PulseBlock className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
