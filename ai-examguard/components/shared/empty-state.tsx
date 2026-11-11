'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty state panel for tables, feeds, and unpopulated views.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border bg-card/60 px-6 py-12',
        className
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-elevated text-muted-foreground">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
