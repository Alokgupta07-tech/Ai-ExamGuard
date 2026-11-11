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
        'flex flex-col items-center justify-center text-center rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-6 py-10',
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-base font-semibold text-[#F8FAFC]">{title}</h3>
      <p className="mt-1.5 text-sm text-[#94A3B8] max-w-md">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 border-[#EF4444]/40 text-[#F8FAFC] hover:bg-[#EF4444]/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{retryLabel}</span>
        </Button>
      )}
    </div>
  );
}

