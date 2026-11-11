'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  className?: string;
}

/**
 * Slide-out right-hand drawer designed for rapid invigilator incident and session inspection.
 */
export function ReviewDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  widthClassName = 'max-w-xl',
  className,
}: ReviewDrawerProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/75 backdrop-blur-xs"
          />

          {/* Slide-over Panel */}
          <motion.aside
            initial={prefersReducedMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 flex h-full w-full flex-col border-l border-border bg-sidebar',
              widthClassName,
              className
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border bg-card/85 px-6 py-5">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    id="drawer-title"
                    className="font-heading text-lg font-semibold text-foreground truncate"
                  >
                    {title}
                  </h2>
                  {badge}
                </div>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close review drawer"
                className="rounded-md border border-border bg-surface-elevated/60 p-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors shrink-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Inspection Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>

            {/* Sticky Action Footer */}
            {footer && (
              <div className="border-t border-border bg-card px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

