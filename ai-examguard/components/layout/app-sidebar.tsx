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
  admin: 'cyan',
  instructor: 'teal',
  invigilator: 'purple',
  student: 'success',
};

const ROLE_DISPLAY: Record<UserRole, string> = {
  admin: 'Admin',
  instructor: 'Faculty',
  invigilator: 'Invigilator',
  student: 'Student',
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
    if (pathname !== basePath) {
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
      <div className="flex h-full flex-col justify-between bg-[#0B1220] text-[#F8FAFC]">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Row */}
          <div
            className={cn(
              'h-16 shrink-0 border-b border-[#243249] flex items-center justify-between px-4',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#38BDF8]/40 bg-[#38BDF8]/10 shadow-[0_0_16px_rgba(56,189,248,0.18)]">
                <ShieldCheck className="h-5 w-5 text-[#38BDF8]" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="font-heading font-bold text-base tracking-tight text-[#F8FAFC] block truncate">
                    AI <span className="text-[#38BDF8]">ExamGuard</span>
                  </span>
                  <p className="text-[10px] text-[#94A3B8] font-mono">v1.0 • Enterprise</p>
                </div>
              )}
            </Link>

            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#17243A] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={cn(
                  'hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-[#243249] bg-[#111B2D] text-[#94A3B8] hover:border-[#38BDF8]/40 hover:text-[#F8FAFC] transition-colors cursor-pointer',
                  isCollapsed && 'ml-0'
                )}
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
              'shrink-0 border-b border-[#243249]/70 bg-[#17243A]/30 px-4 py-3',
              isCollapsed && 'px-2 flex justify-center'
            )}
            title={tenantName}
          >
            <div className="flex items-center gap-2 text-xs text-[#94A3B8] min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
              {!isCollapsed && (
                <span className="font-medium text-[#F8FAFC] truncate">{tenantName}</span>
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
                    <div className="px-3 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[#94A3B8]/70">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={isMobile ? onCloseMobile : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center px-2 py-2.5',
                      active
                        ? 'text-[#38BDF8] bg-[#38BDF8]/12 border border-[#38BDF8]/30'
                        : 'text-[#94A3B8] border border-transparent hover:bg-[#17243A]/60 hover:text-[#F8FAFC]'
                    )}
                  >
                    {active && !isCollapsed && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#38BDF8]"
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        active ? 'text-[#38BDF8]' : 'text-[#94A3B8]'
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
        <div className="shrink-0 p-3 border-t border-[#243249] bg-[#111B2D]/40 space-y-3">
          {!isCollapsed && (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                  {userName || 'Loading...'}
                </p>
                <p className="text-[11px] text-[#94A3B8] truncate">{userEmail}</p>
              </div>
              <StatusBadge tone={ROLE_BADGE_TONE[resolvedRole]} className="text-[10px]">
                {ROLE_DISPLAY[resolvedRole]}
              </StatusBadge>
            </div>
          )}

          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out"
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-lg border border-[#243249] bg-[#111B2D] px-3 py-2 text-xs font-medium text-[#94A3B8] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] transition-colors cursor-pointer',
              isCollapsed && 'px-2'
            )}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-[#243249] bg-[#0B1220] transition-[width] duration-200 sticky top-0 h-screen',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Slide-Out Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-xs"
            />
            <motion.aside
              initial={prefersReducedMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-72 max-w-[85vw] h-full border-r border-[#243249] shadow-2xl"
            >
              {renderSidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
