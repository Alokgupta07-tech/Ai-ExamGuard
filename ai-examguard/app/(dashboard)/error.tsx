'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error.message);
  }, [error]);

  return (
    <div className="p-6 sm:p-12 text-center rounded-2xl border border-destructive/20 bg-card space-y-4 max-w-lg mx-auto my-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Dashboard View Unavailable
        </h2>
        <p className="text-xs text-ink-secondary leading-relaxed">
          {error.message || 'An error occurred while loading this section of the workspace.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Button size="sm" onClick={() => reset()} className="inline-flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Section
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/student" className="inline-flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Default Workspace
          </Link>
        </Button>
      </div>
    </div>
  );
}

