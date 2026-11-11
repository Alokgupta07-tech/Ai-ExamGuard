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
  neutral: 'border-[#243249] bg-[#17243A]/80 text-[#94A3B8]',
  info: 'border-[#38BDF8]/30 bg-[#38BDF8]/10 text-[#38BDF8]',
  cyan: 'border-[#38BDF8]/30 bg-[#38BDF8]/10 text-[#38BDF8]',
  teal: 'border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-[#2DD4BF]',
  purple: 'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6]',
  success: 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]',
  warning: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
  critical: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]',
};

const DOT_STYLES: Record<StatusTone, string> = {
  neutral: 'bg-[#94A3B8]',
  info: 'bg-[#38BDF8]',
  cyan: 'bg-[#38BDF8]',
  teal: 'bg-[#2DD4BF]',
  purple: 'bg-[#8B5CF6]',
  success: 'bg-[#22C55E]',
  warning: 'bg-[#F59E0B]',
  critical: 'bg-[#EF4444]',
};

/**
 * Semantic status & risk severity indicator badge with optional live pulse dot.
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide whitespace-nowrap',
        TONE_STYLES[tone],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              DOT_STYLES[tone]
            )}
          />
          <span
            className={cn('relative inline-flex rounded-full h-2 w-2', DOT_STYLES[tone])}
          />
        </span>
      )}
      {!pulse && icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

