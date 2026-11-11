'use client';

import React from 'react';
import { Clock, ShieldAlert, Eye, Volume2, Monitor, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusTone } from './status-badge';
import { EmptyState } from './empty-state';

export type TimelineSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type TimelineCategory = 'camera' | 'audio' | 'browser' | 'review' | 'system';

export interface TimelineEventItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: TimelineSeverity;
  category?: TimelineCategory;
  metadata?: Record<string, string | number>;
}

export interface EventTimelineProps {
  events: TimelineEventItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  onSelectEvent?: (event: TimelineEventItem) => void;
  className?: string;
}

const SEVERITY_MAP: Record<TimelineSeverity, { tone: StatusTone; dot: string; label: string }> = {
  info: { tone: 'cyan', dot: 'bg-[#38BDF8] border-[#38BDF8]/40', label: 'Info' },
  low: { tone: 'teal', dot: 'bg-[#2DD4BF] border-[#2DD4BF]/40', label: 'Low' },
  medium: { tone: 'warning', dot: 'bg-[#F59E0B] border-[#F59E0B]/40', label: 'Medium' },
  high: { tone: 'critical', dot: 'bg-[#EF4444] border-[#EF4444]/40', label: 'High' },
  critical: { tone: 'critical', dot: 'bg-[#EF4444] border-[#EF4444]/60', label: 'Critical' },
};

function CategoryIcon({ category }: { category?: TimelineCategory }) {
  switch (category) {
    case 'camera':
      return <Eye className="h-3.5 w-3.5" />;
    case 'audio':
      return <Volume2 className="h-3.5 w-3.5" />;
    case 'browser':
      return <Monitor className="h-3.5 w-3.5" />;
    case 'review':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    default:
      return <ShieldAlert className="h-3.5 w-3.5" />;
  }
}

/**
 * Chronological integrity telemetry & audit trail timeline with explainable event metadata.
 */
export function EventTimeline({
  events,
  emptyTitle = 'No telemetry events recorded',
  emptyDescription = 'Integrity signals and human review logs will appear here chronologically.',
  onSelectEvent,
  className,
}: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<Clock className="h-5 w-5" />}
        className={className}
      />
    );
  }

  return (
    <div className={cn('relative pl-6 space-y-4', className)}>
      {/* Vertical rail */}
      <div
        aria-hidden="true"
        className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[#38BDF8]/50 via-[#243249] to-transparent"
      />

      {events.map((event) => {
        const sev = SEVERITY_MAP[event.severity];
        const clickable = Boolean(onSelectEvent);

        return (
          <div key={event.id} className="relative">
            {/* Timeline dot */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute -left-6 top-3 flex h-5 w-5 items-center justify-center rounded-full border bg-[#080D18]',
                sev.dot.replace(/bg-\S+/, '')
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', sev.dot.split(' ')[0])} />
            </span>

            <div
              onClick={() => onSelectEvent?.(event)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectEvent?.(event);
                }
              }}
              className={cn(
                'rounded-xl border border-[#243249] bg-[#111B2D] p-4 transition-colors',
                clickable && 'cursor-pointer hover:border-[#38BDF8]/50 hover:bg-[#17243A]/70'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#94A3B8]">
                    <CategoryIcon category={event.category} />
                  </span>
                  <h4 className="font-heading text-sm font-semibold text-[#F8FAFC] truncate">
                    {event.title}
                  </h4>
                  <StatusBadge
                    tone={sev.tone}
                    pulse={event.severity === 'critical'}
                    className="text-[10px] py-0 px-2"
                  >
                    {sev.label}
                  </StatusBadge>
                </div>

                <span className="text-[11px] font-mono text-[#94A3B8] shrink-0">
                  {event.timestamp}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                {event.description}
              </p>

              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(event.metadata).map(([key, val]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-md border border-[#243249] bg-[#0B1220] px-2 py-0.5 text-[11px] font-mono text-[#94A3B8]"
                    >
                      <span className="text-[#38BDF8]">{key}:</span>
                      <span className="text-[#F8FAFC]">{String(val)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

