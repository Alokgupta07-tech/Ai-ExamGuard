'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'critical';

export interface AlertPanelProps {
  tone?: AlertTone;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const ALERT_STYLES: Record<AlertTone, { wrapper: string; iconBg: string; icon: React.ReactNode }> = {
  info: {
    wrapper: 'border-[#38BDF8]/30 bg-[#38BDF8]/10 text-[#F8FAFC]',
    iconBg: 'text-[#38BDF8]',
    icon: <Info className="h-4 w-4" />,
  },
  success: {
    wrapper: 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#F8FAFC]',
    iconBg: 'text-[#22C55E]',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  warning: {
    wrapper: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F8FAFC]',
    iconBg: 'text-[#F59E0B]',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  critical: {
    wrapper: 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#F8FAFC]',
    iconBg: 'text-[#EF4444]',
    icon: <ShieldAlert className="h-4 w-4" />,
  },
};

/**
 * High-contrast cybersecurity alert banner for telemetry warnings and human-review notices.
 */
export function AlertPanel({
  tone = 'info',
  title,
  description,
  action,
  onDismiss,
  className,
}: AlertPanelProps) {
  const style = ALERT_STYLES[tone];

  return (
    <div
      role={tone === 'critical' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm',
        style.wrapper,
        className
      )}
    >
      <div className={cn('mt-0.5 shrink-0', style.iconBg)}>{style.icon}</div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-[#F8FAFC] leading-snug">{title}</p>
        {description && <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">{description}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="rounded-md p-1 text-[#94A3B8] hover:bg-[#17243A] hover:text-[#F8FAFC] transition-colors shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

