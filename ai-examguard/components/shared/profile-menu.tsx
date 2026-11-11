'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Building2, ChevronDown, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusTone } from './status-badge';
import type { UserRole } from '@/types/database';

export interface ProfileMenuProps {
  fullName: string;
  email: string;
  role: UserRole | null;
  tenantName?: string;
  onSignOut: () => void;
  className?: string;
}

const ROLE_TONE: Record<UserRole, StatusTone> = {
  admin: 'cyan',
  instructor: 'teal',
  invigilator: 'purple',
  student: 'success',
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  instructor: 'Faculty',
  invigilator: 'Invigilator',
  student: 'Student',
};

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  instructor: '/faculty',
  invigilator: '/invigilator',
  student: '/student',
};

/**
 * Compact header user profile dropdown displaying role badge, tenant, and sign-out action.
 */
export function ProfileMenu({
  fullName,
  email,
  role,
  tenantName,
  onSignOut,
  className,
}: ProfileMenuProps) {
  const prefersReducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const initials = (fullName || email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const resolvedRole: UserRole = role || 'student';

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-lg border border-[#243249] bg-[#111B2D] px-2.5 py-1.5 hover:border-[#38BDF8]/40 transition-colors cursor-pointer"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-xs font-mono font-bold text-[#38BDF8]">
          {initials || 'U'}
        </div>
        <div className="hidden md:flex flex-col items-start text-left max-w-[140px]">
          <span className="text-xs font-semibold text-[#F8FAFC] truncate w-full">
            {fullName || 'User'}
          </span>
          <span className="text-[10px] font-mono text-[#94A3B8] uppercase">
            {ROLE_LABEL[resolvedRole]}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            role="menu"
            className="absolute right-0 mt-2 w-64 rounded-xl border border-[#243249] bg-[#111B2D] shadow-2xl shadow-black/60 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-[#243249] bg-[#17243A]/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#F8FAFC] truncate">
                  {fullName || 'Account'}
                </span>
                <StatusBadge tone={ROLE_TONE[resolvedRole]} className="text-[10px]">
                  {ROLE_LABEL[resolvedRole]}
                </StatusBadge>
              </div>
              <p className="text-xs text-[#94A3B8] truncate">{email}</p>
              {tenantName && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] pt-1">
                  <Building2 className="h-3 w-3 text-[#38BDF8]" />
                  <span className="truncate">{tenantName}</span>
                </div>
              )}
            </div>

            <div className="p-1.5 space-y-0.5">
              <Link
                href={ROLE_HOME[resolvedRole]}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:bg-[#17243A] transition-colors"
                role="menuitem"
              >
                <UserIcon className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span>Role Workspace</span>
              </Link>
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#94A3B8] hover:bg-[#17243A] hover:text-[#F8FAFC] transition-colors"
                role="menuitem"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#2DD4BF]" />
                <span>Platform Overview</span>
              </Link>
            </div>

            <div className="p-1.5 border-t border-[#243249]">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                role="menuitem"
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

