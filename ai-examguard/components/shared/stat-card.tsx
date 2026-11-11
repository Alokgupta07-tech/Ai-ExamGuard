'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './animated-counter';

export type StatAccent = 'cyan' | 'teal' | 'purple' | 'success' | 'warning' | 'critical';

export interface StatCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: StatAccent;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const ACCENT_ICON_STYLES: Record<StatAccent, string> = {
  cyan: 'border-[#176B5B]/20 bg-[#E9F3EF] text-[#176B5B] dark:bg-[#142E28] dark:text-[#38A892]',
  teal: 'border-[#176B5B]/20 bg-[#E9F3EF] text-[#115447] dark:bg-[#142E28] dark:text-[#38A892]',
  purple: 'border-[#356B9A]/20 bg-[#EAF1F8] text-[#356B9A] dark:bg-[#172A3A] dark:text-[#78AEDB]',
  success: 'border-[#27845D]/20 bg-[#E8F5EE] text-[#1C6647] dark:bg-[#132D21] dark:text-[#52C593]',
  warning: 'border-[#B7791F]/20 bg-[#FEF7EC] text-[#8E5D17] dark:bg-[#302410] dark:text-[#E2A649]',
  critical: 'border-[#C44747]/20 bg-[#FDE8E8] text-[#A63636] dark:bg-[#331A1A] dark:text-[#EB7777]',
};

const TREND_STYLES: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-[#1C6647] bg-[#E8F5EE] border-[#27845D]/25 dark:bg-[#132D21] dark:text-[#52C593]',
  down: 'text-[#A63636] bg-[#FDE8E8] border-[#C44747]/25 dark:bg-[#331A1A] dark:text-[#EB7777]',
  neutral: 'text-ink-secondary bg-surface-elevated border-border',
};

/**
 * KPI metric card with animated numeric readout, semantic accent, and trend pill.
 */
export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = 'cyan',
  trend,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: StatCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn(
        'relative rounded-lg border border-border bg-card p-5 transition-all shadow-[0_1px_3px_rgba(24,35,33,0.03)] hover:shadow-[0_4px_12px_rgba(24,35,33,0.06)] hover:border-border-strong card-hover-elevate',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="text-2xl sm:text-3xl font-semibold font-heading text-foreground tracking-tight tabular-reading">
            {typeof value === 'number' ? (
              <AnimatedCounter
                value={value}
                decimals={decimals}
                prefix={prefix}
                suffix={suffix}
              />
            ) : (
              <span className="font-mono tabular-reading">{value}</span>
            )}
          </div>
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
              ACCENT_ICON_STYLES[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-border/60">
          {subtitle ? (
            <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
          ) : (
            <span />
          )}

          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-mono font-medium shrink-0 tabular-reading',
                TREND_STYLES[trend.direction]
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend.direction === 'neutral' && <Minus className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
