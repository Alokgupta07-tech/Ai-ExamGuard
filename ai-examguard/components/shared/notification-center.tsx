'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bell, CheckCheck, ShieldAlert, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'critical';
  read?: boolean;
}

export interface NotificationCenterProps {
  notifications?: NotificationItem[];
  onMarkAllRead?: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
  className?: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'sys-1',
    title: 'Edge AI Telemetry Ready',
    message: 'Local MediaPipe FaceDetector and Web Audio monitors initialized cleanly.',
    timestamp: 'Just now',
    severity: 'info',
    read: false,
  },
];

/**
 * Header notification bell & dropdown feed for security alerts and session updates.
 */
export function NotificationCenter({
  notifications,
  onMarkAllRead,
  onSelectNotification,
  className,
}: NotificationCenterProps) {
  const prefersReducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState<NotificationItem[]>(
    notifications ?? DEFAULT_NOTIFICATIONS
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const items = notifications ?? localItems;
  const unreadCount = items.filter((n) => !n.read).length;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleMarkAll = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      setLocalItems((prev) => prev.map((item) => ({ ...item, read: true })));
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-mono font-bold text-primary-foreground tabular-reading">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-border bg-card z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border bg-surface-elevated/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-semibold text-foreground">
                  Security Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary tabular-reading">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No active notifications.
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectNotification?.(item);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-surface-elevated/50 cursor-pointer',
                      !item.read && 'bg-primary/[0.04]'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.severity === 'critical' ? (
                        <ShieldAlert className="h-4 w-4 text-critical" />
                      ) : item.severity === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <Info className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.title}
                        </p>
                        <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-reading">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

