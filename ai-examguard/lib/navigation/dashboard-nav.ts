import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Eye,
  FilePlus2,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  Plug,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import type { UserRole } from '@/types/database';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
}

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, section: 'Command' },
  { href: '/admin/users', label: 'User Management', icon: Users, section: 'Directory' },
  { href: '/admin/users?role=instructor', label: 'Faculty', icon: BookOpen, section: 'Directory' },
  { href: '/admin/users?role=student', label: 'Students', icon: GraduationCap, section: 'Directory' },
  { href: '/admin/departments', label: 'Departments', icon: Building, section: 'Academics' },
  { href: '/admin/courses', label: 'Courses', icon: ClipboardList, section: 'Academics' },
  { href: '/admin/exams', label: 'Examinations', icon: Layers, section: 'Academics' },
  { href: '/admin/question-bank', label: 'Question Bank', icon: FileText, section: 'Academics' },
  { href: '/admin/monitoring', label: 'Live Monitoring', icon: Eye, section: 'Integrity' },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, section: 'Integrity' },
  { href: '/admin/integrations', label: 'Integrations', icon: Plug, section: 'Platform' },
  { href: '/admin/security', label: 'Security Policies', icon: ShieldCheck, section: 'Platform' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, section: 'Platform' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, section: 'Platform' },
];

export const FACULTY_NAV: DashboardNavItem[] = [
  { href: '/faculty', label: 'Overview', icon: LayoutDashboard, section: 'Command' },
  { href: '/faculty/exams', label: 'My Examinations', icon: Layers, section: 'Assessments' },
  { href: '/faculty/exams/new', label: 'Create Examination', icon: FilePlus2, section: 'Assessments' },
  { href: '/faculty/question-bank', label: 'Question Bank', icon: FileText, section: 'Assessments' },
  { href: '/faculty/assignments', label: 'Student Assignments', icon: Users, section: 'Assessments' },
  { href: '/faculty/monitoring', label: 'Live Monitoring', icon: Eye, section: 'Integrity' },
  { href: '/faculty/results', label: 'Results', icon: CheckCircle2, section: 'Integrity' },
  { href: '/faculty/review-cases', label: 'Review Cases', icon: ShieldAlert, section: 'Integrity' },
  { href: '/faculty/analytics', label: 'Analytics', icon: BarChart3, section: 'Insights' },
];

export const STUDENT_NAV: DashboardNavItem[] = [
  { href: '/student', label: 'My Dashboard', icon: LayoutDashboard, section: 'Portal' },
  { href: '/student/upcoming', label: 'Upcoming Examinations', icon: CalendarClock, section: 'Examinations' },
  { href: '/student/available', label: 'Available Examinations', icon: Layers, section: 'Examinations' },
  { href: '/student/history', label: 'Examination History', icon: History, section: 'Examinations' },
  { href: '/student/results', label: 'Results', icon: GraduationCap, section: 'Examinations' },
  { href: '/student/device-readiness', label: 'Device Readiness', icon: Cpu, section: 'System' },
  { href: '/student/profile', label: 'Profile', icon: UserCircle, section: 'Account' },
  { href: '/student/support', label: 'Support', icon: HelpCircle, section: 'Account' },
];

export const INVIGILATOR_NAV: DashboardNavItem[] = [
  { href: '/invigilator', label: 'Live Overview', icon: LayoutDashboard, section: 'Command' },
  { href: '/invigilator/examinations', label: 'Active Examinations', icon: Layers, section: 'Monitoring' },
  { href: '/invigilator/candidates', label: 'Candidate Monitoring', icon: Eye, section: 'Monitoring' },
  { href: '/invigilator/alerts', label: 'Alerts Centre', icon: AlertTriangle, section: 'Monitoring' },
  { href: '/invigilator/timeline', label: 'Event Timeline', icon: Activity, section: 'Adjudication' },
  { href: '/invigilator/review-cases', label: 'Review Cases', icon: UserCheck, section: 'Adjudication' },
  { href: '/invigilator/reports', label: 'Reports', icon: BarChart3, section: 'Adjudication' },
];

export function getNavForRole(role: UserRole | null): DashboardNavItem[] {
  switch (role) {
    case 'admin':
      return ADMIN_NAV;
    case 'instructor':
      return FACULTY_NAV;
    case 'invigilator':
      return INVIGILATOR_NAV;
    case 'student':
    default:
      return STUDENT_NAV;
  }
}

