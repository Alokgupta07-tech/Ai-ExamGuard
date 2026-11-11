'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
    wrapper: 'border-primary/35 bg-primary/10 text-foreground',
    iconBg: 'text-primary',
    icon: <Info className="h-4 w-4" />,
  },
  success: {
    wrapper: 'border-success/35 bg-success/10 text-foreground',
    iconBg: 'text-success',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  warning: {
    wrapper: 'border-warning/35 bg-warning/10 text-foreground',
    iconBg: 'text-warning',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  critical: {
    wrapper: 'border-critical/40 bg-critical/10 text-foreground',
    iconBg: 'text-critical',
    icon: <ShieldAlert className="h-4 w-4" />,
  },
};

/**
 * High-contrast cybersecurity alert banner for warnings, notifications, and validation states.
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
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      role={tone === 'critical' || tone === 'warning' ? 'alert' : 'status'}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm',
        style.wrapper,
        className
      )}
    >
      <div className={cn('mt-0.5 shrink-0', style.iconBg)}>{style.icon}</div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-foreground leading-snug">{title}</p>
        {description && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
