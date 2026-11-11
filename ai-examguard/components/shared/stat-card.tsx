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
  cyan: 'border-[#38BDF8]/30 bg-[#38BDF8]/10 text-[#38BDF8]',
  teal: 'border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-[#2DD4BF]',
  purple: 'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#8B5CF6]',
  success: 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]',
  warning: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
  critical: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]',
};

const TREND_STYLES: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/25',
  down: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/25',
  neutral: 'text-[#94A3B8] bg-[#17243A] border-[#243249]',
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
      transition={{ duration: 0.25 }}
      className={cn(
        'relative rounded-xl border border-[#243249] bg-[#111B2D] p-5 shadow-lg transition-colors hover:border-[#38BDF8]/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
            {label}
          </p>
          <div className="text-2xl sm:text-3xl font-bold font-heading text-[#F8FAFC] tracking-tight">
            {typeof value === 'number' ? (
              <AnimatedCounter
                value={value}
                decimals={decimals}
                prefix={prefix}
                suffix={suffix}
              />
            ) : (
              <span className="font-mono">{value}</span>
            )}
          </div>
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
              ACCENT_ICON_STYLES[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-[#243249]/60">
          {subtitle ? (
            <span className="text-xs text-[#94A3B8] truncate">{subtitle}</span>
          ) : (
            <span />
          )}

          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono font-medium shrink-0',
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

