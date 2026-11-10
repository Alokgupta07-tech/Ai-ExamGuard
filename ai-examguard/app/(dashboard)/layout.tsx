'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Eye,
  LogOut,
  FileText,
  Building,
  Activity,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  // Role navigation configuration
  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { href: '/admin', label: 'Overview', icon: LayoutDashboard },
          { href: '/admin?tab=users', label: 'User Directory', icon: Users },
          { href: '/admin?tab=courses', label: 'Courses', icon: BookOpen },
          { href: '/admin?tab=exams', label: 'All Exams', icon: Layers },
          { href: '/admin?tab=audit', label: 'Audit Trail', icon: Activity },
        ];
      case 'instructor':
        return [
          { href: '/faculty', label: 'Overview', icon: LayoutDashboard },
          { href: '/faculty?tab=courses', label: 'My Courses', icon: BookOpen },
          { href: '/faculty?tab=exams', label: 'Examinations', icon: Layers },
          { href: '/faculty?tab=questions', label: 'Question Bank', icon: FileText },
        ];
      case 'invigilator':
        return [
          { href: '/invigilator', label: 'Live Overview', icon: LayoutDashboard },
          { href: '/invigilator?tab=active', label: 'Active Rooms', icon: Eye },
          { href: '/invigilator?tab=review', label: 'Incident Review', icon: Activity },
        ];
      case 'student':
      default:
        return [
          { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/student?tab=exams', label: 'Upcoming Exams', icon: Layers },
          { href: '/student?tab=results', label: 'Exam Results', icon: GraduationCap },
        ];
    }
  };

  const navLinks = getNavLinks();

  const getRoleBadgeVariant = (r: string | null): 'cyan' | 'secondary' | 'purple' | 'success' => {
    switch (r) {
      case 'admin':
        return 'cyan';
      case 'instructor':
        return 'secondary';
      case 'invigilator':
        return 'purple';
      case 'student':
      default:
        return 'success';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#080D18] text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#243249] bg-[#0B1220] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo and Brand */}
          <div className="h-16 border-b border-[#243249] flex items-center px-6 gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-heading font-bold text-base tracking-tight text-foreground">
                AI <span className="text-primary">ExamGuard</span>
              </span>
              <p className="text-[10px] text-muted-foreground font-mono">v1.0 • Enterprise</p>
            </div>
          </div>

          {/* Tenant Indicator */}
          <div className="px-4 py-3 border-b border-[#243249]/60 bg-surface-elevated/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground truncate">
                {user?.activeTenant?.name || 'Test University'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-surface-elevated/50 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#243249] bg-surface-elevated/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.full_name || 'Loading...'}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {user?.email || ''}
              </span>
            </div>
            <Badge variant={getRoleBadgeVariant(role)} className="uppercase text-[10px] tracking-wider">
              {role || 'student'}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="w-full justify-center gap-2 border-border/80 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#243249] bg-[#0B1220]/60 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Portal</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground capitalize">{role || 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>AI Proctoring Engine Online</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
