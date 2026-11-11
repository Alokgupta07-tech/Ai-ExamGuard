'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusTone } from '@/components/shared/status-badge';
import { getNavForRole } from '@/lib/navigation/dashboard-nav';
import type { UserRole } from '@/types/database';

export interface AppSidebarProps {
  role: UserRole | null;
  tenantName: string;
  userName: string;
  userEmail: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

const ROLE_BADGE_TONE: Record<UserRole, StatusTone> = {
  admin: 'teal',
  instructor: 'teal',
  invigilator: 'purple',
  student: 'success',
};

const ROLE_DISPLAY: Record<UserRole, string> = {
  admin: 'Administrator',
  instructor: 'Faculty',
  invigilator: 'Invigilator',
  student: 'Candidate',
};

/**
 * Role-aware collapsible navigation sidebar with desktop collapse and mobile drawer support.
 */
export function AppSidebar({
  role,
  tenantName,
  userName,
  userEmail,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const activeRoleFilter = searchParams.get('role');
  const navItems = getNavForRole(role);
  const resolvedRole: UserRole = role || 'student';

  useEffect(() => {
    if (!mobileOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileOpen, onCloseMobile]);

  const isItemActive = (href: string) => {
    const [basePath, queryString] = href.split('?');
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
      return false;
    }
    if (basePath === '/faculty/exams' && pathname === '/faculty/exams/new') {
      return false;
    }
    if (!queryString) {
      return !activeRoleFilter;
    }
    const itemRole = new URLSearchParams(queryString).get('role');
    return activeRoleFilter === itemRole;
  };

  const renderSidebarBody = (isMobile: boolean) => {
    const isCollapsed = !isMobile && collapsed;
    let lastSection: string | undefined;

    return (
      <div className="flex h-full flex-col justify-between bg-sidebar text-foreground">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Row */}
          <div
            className={cn(
              'h-16 shrink-0 border-b border-border flex items-center justify-between px-4',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <Link href="/" aria-label="AI ExamGuard home" className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="font-heading font-bold text-base tracking-tight text-foreground block truncate">
                    AI ExamGuard
                  </span>
                  <p className="text-xs text-muted-foreground">Institutional console</p>
                </div>
              )}
            </Link>

            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          {/* University Tenant Indicator */}
          <div
            className={cn(
              'shrink-0 border-b border-border/80 bg-surface-elevated/35 px-4 py-3',
              isCollapsed && 'px-2 flex justify-center'
            )}
            title={tenantName}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              {!isCollapsed && (
                <span className="font-medium text-foreground truncate">{tenantName}</span>
              )}
            </div>
          </div>

          {/* Scrollable Navigation Links */}
          <nav
            className="p-3 space-y-0.5 overflow-y-auto flex-1"
            aria-label="Primary Navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              const showSectionHeader =
                !isCollapsed && item.section && item.section !== lastSection;
              lastSection = item.section;

              return (
                <React.Fragment key={item.href}>
                  {showSectionHeader && (
                    <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={isMobile ? onCloseMobile : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center px-2 py-2.5',
                      active
                        ? 'text-primary bg-primary/10 font-semibold'
                        : 'text-muted-foreground hover:bg-surface-elevated/70 hover:text-foreground'
                    )}
                  >
                    {active && !isCollapsed && (
                      <motion.span
                        layoutId={isMobile ? 'sidebar-active-mobile' : 'sidebar-active-desktop'}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-sm bg-primary"
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        active ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="shrink-0 p-3 border-t border-border bg-card/50 space-y-3">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                {(userName || userEmail || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {userName || 'Loading…'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
              </div>
              <StatusBadge tone={ROLE_BADGE_TONE[resolvedRole]}>
                {ROLE_DISPLAY[resolvedRole]}
              </StatusBadge>
            </div>
          )}

          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out"
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-critical/40 hover:bg-critical/10 hover:text-critical transition-colors cursor-pointer',
              isCollapsed && 'px-2'
            )}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {renderSidebarBody(false)}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            />
            <motion.aside
              initial={prefersReducedMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-72 max-w-[85vw] h-full border-r border-border"
            >
              {renderSidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
