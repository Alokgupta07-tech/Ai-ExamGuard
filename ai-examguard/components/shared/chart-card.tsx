'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';
import { LoadingSkeleton } from './loading-skeleton';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  heightClassName?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Container card tailored for Recharts telemetry & analytics visualizations.
 */
export function ChartCard({
  title,
  subtitle,
  actions,
  footer,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No analytical data available for the selected range.',
  heightClassName = 'h-72',
  children,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-5 flex flex-col',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="space-y-1 min-w-0">
          <h3 className="font-heading text-base font-semibold text-foreground truncate">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <div className={cn('w-full relative', heightClassName)}>
        {isLoading ? (
          <LoadingSkeleton variant="text" count={5} className="pt-4" />
        ) : isEmpty ? (
          <EmptyState
            title="No telemetry data"
            description={emptyMessage}
            icon={<BarChart3 className="h-5 w-5" />}
            className="h-full py-6"
          />
        ) : (
          children
        )}
      </div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

