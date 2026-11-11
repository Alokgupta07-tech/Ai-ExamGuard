'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty state card for tables, feeds, and unpopulated views.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-[#243249] bg-[#111B2D]/60 px-6 py-12',
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#243249] bg-[#17243A] text-[#94A3B8]">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="font-heading text-base font-semibold text-[#F8FAFC]">{title}</h3>
      <p className="mt-1.5 text-sm text-[#94A3B8] max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

