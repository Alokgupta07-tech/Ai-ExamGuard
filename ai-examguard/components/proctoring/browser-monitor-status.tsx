'use client'

import React from 'react'
import { Eye, Focus, Maximize2, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrowserMonitorSnapshot } from '@/types/proctoring'

export interface BrowserMonitorStatusProps {
  snapshot: BrowserMonitorSnapshot
  requireFullscreen?: boolean
  className?: string
}

export function BrowserMonitorStatus({
  snapshot,
  requireFullscreen = false,
  className,
}: BrowserMonitorStatusProps) {
  return (
    <aside
      aria-label="Browser environment monitor"
      className={cn(
        'rounded-lg border border-border bg-surface-elevated p-3 space-y-2',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">Browser State</span>
        <span
          className={cn(
            'text-[11px] font-medium',
            snapshot.isOnline && snapshot.isTabVisible ? 'text-success' : 'text-warning'
          )}
        >
          {!snapshot.isOnline
            ? 'Connection Interrupted'
            : !snapshot.isTabVisible
              ? 'Tab Hidden'
              : !snapshot.isPageFocused
                ? 'Focus Lost'
                : 'Active Window'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="rounded border border-border bg-background px-2 py-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3 w-3" />
            Tab
          </span>
          <span className={snapshot.isTabVisible ? 'text-success' : 'text-warning'}>
            {snapshot.isTabVisible ? 'Visible' : 'Hidden'}
          </span>
        </div>

        <div className="rounded border border-border bg-background px-2 py-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Focus className="h-3 w-3" />
            Focus
          </span>
          <span className={snapshot.isPageFocused ? 'text-success' : 'text-warning'}>
            {snapshot.isPageFocused ? 'Active' : 'Blurred'}
          </span>
        </div>

        <div className="rounded border border-border bg-background px-2 py-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Maximize2 className="h-3 w-3" />
            Screen
          </span>
          <span
            className={
              snapshot.fullscreenActive
                ? 'text-success'
                : requireFullscreen
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }
          >
            {snapshot.fullscreenActive ? 'Locked' : requireFullscreen ? 'Exited' : 'Window'}
          </span>
        </div>

        <div className="rounded border border-border bg-background px-2 py-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {snapshot.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            Link
          </span>
          <span className={snapshot.isOnline ? 'text-success' : 'text-critical'}>
            {snapshot.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <p className="text-[10px] leading-snug text-muted-foreground">
        Monitors browser tab visibility, page focus, fullscreen, and connectivity inside this tab
        only — never scans OS apps or external devices.
      </p>
    </aside>
  )
}

