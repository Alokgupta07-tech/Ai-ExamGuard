'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/shared/breadcrumbs';
import { StatusBadge } from '@/components/shared/status-badge';
import { NotificationCenter } from '@/components/shared/notification-center';
import { ProfileMenu } from '@/components/shared/profile-menu';
import type { UserRole } from '@/types/database';

export interface AppHeaderProps {
  role: UserRole | null;
  tenantName: string;
  userName: string;
  userEmail: string;
  onOpenMobileNav: () => void;
  onSignOut: () => void;
  onSearchChange?: (query: string) => void;
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Administration',
  faculty: 'Faculty Console',
  invigilator: 'Invigilator Center',
  student: 'Student Portal',
  exams: 'Examinations',
  new: 'New Exam Wizard',
  edit: 'Edit Examination',
  'question-bank': 'Question Bank',
  courses: 'Courses',
  review: 'Incident Review',
};

/**
 * Global dashboard topbar featuring mobile navigation trigger, breadcrumbs, search,
 * workspace telemetry status, notifications, and profile menu.
 */
export function AppHeader({
  role,
  tenantName,
  userName,
  userEmail,
  onOpenMobileNav,
  onSignOut,
  onSearchChange,
}: AppHeaderProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbItems: BreadcrumbItem[] =
    segments.length > 0
      ? segments.map((seg, idx) => ({
          label:
            SEGMENT_LABELS[seg] ||
            (/^[0-9a-f-]{8,}$/i.test(seg) ? 'Exam draft' : seg.charAt(0).toUpperCase() + seg.slice(1)),
          href: idx < segments.length - 1 ? `/${segments.slice(0, idx + 1).join('/')}` : undefined,
        }))
      : [{ label: 'Workspace' }];

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    onSearchChange?.(val);
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-sidebar/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden sm:block truncate">
          <Breadcrumbs items={breadcrumbItems} homeHref="/" />
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search exams, candidates, or events..."
          aria-label="Workspace search"
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-12 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 transition-colors"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          /
        </kbd>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden xl:flex items-center gap-2">
          <StatusBadge tone="success" role="status">
            Edge telemetry ready
          </StatusBadge>
        </div>

        <NotificationCenter />

        <ProfileMenu
          fullName={userName}
          email={userEmail}
          role={role}
          tenantName={tenantName}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
