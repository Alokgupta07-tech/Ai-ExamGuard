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
  neutral: 'border-border bg-surface-elevated text-ink-secondary',
  info: 'border-[#3977A6]/30 bg-[#EAF3FA] text-[#295D82] dark:bg-[#152636] dark:text-[#78AEDB] dark:border-[#3977A6]/40',
  cyan: 'border-[#176B5B]/30 bg-[#E9F3EF] text-[#176B5B] dark:bg-[#142E28] dark:text-[#38A892] dark:border-[#2BA089]/40',
  teal: 'border-[#176B5B]/30 bg-[#E9F3EF] text-[#115447] dark:bg-[#142E28] dark:text-[#38A892] dark:border-[#2BA089]/40',
  purple: 'border-[#6B5B95]/30 bg-[#F2EEF8] text-[#55477B] dark:bg-[#241E33] dark:text-[#B3A4D6] dark:border-[#6B5B95]/40',
  success: 'border-[#27845D]/30 bg-[#E8F5EE] text-[#1C6647] dark:bg-[#132D21] dark:text-[#52C593] dark:border-[#27845D]/40',
  warning: 'border-[#B7791F]/30 bg-[#FEF7EC] text-[#8E5D17] dark:bg-[#302410] dark:text-[#E2A649] dark:border-[#B7791F]/40',
  critical: 'border-[#C44747]/30 bg-[#FDE8E8] text-[#A63636] dark:bg-[#331A1A] dark:text-[#EB7777] dark:border-[#C44747]/40',
};

const DOT_STYLES: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-[#3977A6]',
  cyan: 'bg-[#176B5B]',
  teal: 'bg-[#176B5B]',
  purple: 'bg-[#6B5B95]',
  success: 'bg-[#27845D]',
  warning: 'bg-[#B7791F]',
  critical: 'bg-[#C44747]',
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap leading-tight',
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
