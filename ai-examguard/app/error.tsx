'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error without leaking sensitive credentials
    console.error('AI ExamGuard application exception:', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-card p-6 sm:p-8 text-center space-y-6 shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-destructive font-semibold">
            Application Interruption
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            AI ExamGuard encountered an unexpected error. Your examination state and
            progress remain safely saved.
          </p>
        </div>

        {error.digest && (
          <div className="rounded-lg bg-surface-elevated/50 p-2.5 font-mono text-[11px] text-muted-foreground border border-border">
            Diagnostic Reference: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Return to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

