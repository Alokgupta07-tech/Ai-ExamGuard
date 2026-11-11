'use client';

import React, { Suspense, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';

export interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Global responsive dashboard shell combining collapsible sidebar, topbar, and viewport.
 */
export function AppShell({ children }: AppShellProps) {
  const { user, role, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tenantName = user?.activeTenant?.name || 'Test University';
  const userName = user?.full_name || 'Authenticated User';
  const userEmail = user?.email || '';

  return (
    <div className="flex min-h-screen bg-[#080D18] text-[#F8FAFC]">
      <Suspense fallback={<div className="hidden lg:block w-64 border-r border-[#243249] bg-[#0B1220]" />}>
        <AppSidebar
          role={role}
          tenantName={tenantName}
          userName={userName}
          userEmail={userEmail}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onSignOut={signOut}
        />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          role={role}
          tenantName={tenantName}
          userName={userName}
          userEmail={userEmail}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onSignOut={signOut}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

