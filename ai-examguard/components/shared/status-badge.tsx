'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'cyan'
  | 'teal'
  | 'purple'
  | 'success'
  | 'warning'
  | 'critical';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  pulse?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: 'border-border bg-surface-elevated/80 text-muted-foreground',
  info: 'border-primary/35 bg-primary/10 text-primary',
  cyan: 'border-primary/35 bg-primary/10 text-primary',
  teal: 'border-secondary/35 bg-secondary/10 text-secondary',
  purple: 'border-purple/35 bg-purple/10 text-purple',
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  critical: 'border-critical/35 bg-critical/10 text-critical',
};

const DOT_STYLES: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-primary',
  cyan: 'bg-primary',
  teal: 'bg-secondary',
  purple: 'bg-purple',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
};

/**
 * Semantic status & risk severity indicator badge.
 */
export function StatusBadge({
  tone = 'neutral',
  pulse = false,
  icon,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_STYLES[tone],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden="true">
          <span
            className={cn(
              'status-ping-ring absolute inline-flex h-2 w-2 rounded-full motion-reduce:hidden',
              DOT_STYLES[tone]
            )}
          />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', DOT_STYLES[tone])} />
        </span>
      )}
      {!pulse && icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
