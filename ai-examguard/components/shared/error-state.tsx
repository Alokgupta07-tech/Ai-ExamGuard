'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Error display panel with optional retry action.
 */
export function ErrorState({
  title = 'Operation Failed',
  message,
  onRetry,
  retryLabel = 'Try Again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-lg border border-critical/35 bg-critical/5 px-6 py-10',
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-critical/35 bg-critical/10 text-critical">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 border-critical/40 text-foreground hover:bg-critical/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{retryLabel}</span>
        </Button>
      )}
    </div>
  );
}

