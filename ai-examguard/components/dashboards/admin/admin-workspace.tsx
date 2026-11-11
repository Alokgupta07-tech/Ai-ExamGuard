'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Building,
  CheckCircle2,
  Download,
  Eye,
  Flag,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UploadCloud,
  UserPlus,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import {
  getAdminDashboardAction,
  updateExamStatusAction,
  updateTenantConfigAction,
  upsertIntegrationAction,
} from '@/lib/actions/dashboard-actions';
import { removeUserAction, updateUserRoleAction } from '@/lib/actions/user-actions';
import {
  downloadCsvFile,
  formatShortDateTime,
  getExamStatusTone,
  getRoleTone,
  getSessionStatusTone,
} from '@/lib/utils/dashboard-formatters';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ChartCard } from '@/components/shared/chart-card';
import { ActivityAreaChart, DistributionBarChart } from '@/components/shared/telemetry-charts';
import { EventTimeline } from '@/components/shared/event-timeline';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertPanel } from '@/components/shared/alert-panel';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReviewInspectionDrawer } from '@/components/dashboards/shared/review-inspection-drawer';
import {
  BulkCsvModal,
  CreateCourseModal,
  CreateExamModal,
  InviteMemberModal,
} from './admin-modals';
import type { ExamStatus, UserRole } from '@/types/database';
import type {
  AuditLogView,
  CourseView,
  ExamView,
  IntegrationConfigView,
  QuestionView,
  ReviewCaseView,
  TenantMemberView,
} from '@/types/dashboard';

export type AdminSection =
  | 'overview'
  | 'users'
  | 'departments'
  | 'courses'
  | 'exams'
  | 'question-bank'
  | 'monitoring'
  | 'reports'
  | 'integrations'
  | 'security'
  | 'audit-logs'
  | 'settings';

export function AdminWorkspace({
  section,
  initialRoleFilter,
}: {
  section: AdminSection;
  initialRoleFilter?: UserRole | null;
}) {
  const { data, isLoading, error, refresh } = useDashboardData(getAdminDashboardAction);
  const [banner, setBanner] = useState<{ tone: 'success' | 'critical'; text: string } | null>(
    null
  );
  const [roleOverride, setRoleOverride] = useState<UserRole | 'all' | null>(null);
  const [prevInitialRole, setPrevInitialRole] = useState(initialRoleFilter);
  if (prevInitialRole !== initialRoleFilter) {
    setPrevInitialRole(initialRoleFilter);
    setRoleOverride(null);
  }
  const roleFilter: UserRole | 'all' = roleOverride ?? initialRoleFilter ?? 'all';
  const [showInvite, setShowInvite] = useState(false);
  const [showBulkCsv, setShowBulkCsv] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ReviewCaseView | null>(null);

  const notify = async (text: string) => {
    setBanner({ tone: 'success', text });
    await refresh();
  };

  // Security Policy & Tenant Settings local drafts initialized from data
  const [savingConfig, setSavingConfig] = useState(false);
  const [requireCam, setRequireCam] = useState<boolean | null>(null);
  const [requireMic, setRequireMic] = useState<boolean | null>(null);
  const [requireFs, setRequireFs] = useState<boolean | null>(null);
  const [trustThreshold, setTrustThreshold] = useState<number | null>(null);
  const [maxViolations, setMaxViolations] = useState<number | null>(null);
  const [tenantNameDraft, setTenantNameDraft] = useState<string | null>(null);
  const [tenantDomainDraft, setTenantDomainDraft] = useState<string | null>(null);

  // Integration draft
  const [intProvider, setIntProvider] = useState('Canvas LMS');
  const [intType, setIntType] = useState<IntegrationConfigView['integrationType']>('lms');
  const [intEndpoint, setIntEndpoint] = useState('');
  const [savingInt, setSavingInt] = useState(false);

  const examActivitySeries = useMemo(() => {
    if (!data) return [];
    const grouped = new Map<string, { primary: number; secondary: number }>();
    for (const exam of data.exams) {
      const day = new Date(exam.startTime).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const cur = grouped.get(day) || { primary: 0, secondary: 0 };
      cur.primary += exam.sessionCount;
      cur.secondary += 1;
      grouped.set(day, cur);
    }
    return Array.from(grouped.entries()).map(([label, counts]) => ({
      label,
      primary: counts.primary,
      secondary: counts.secondary,
    }));
  }, [data]);

  const usageAnalyticsSeries = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Students', value: data.metrics.totalStudents },
      { name: 'Faculty', value: data.metrics.totalFaculty },
      { name: 'Invigilators', value: data.metrics.totalInvigilators },
      { name: 'Courses', value: data.courses.length },
      { name: 'Exams', value: data.exams.length },
      { name: 'Sessions', value: data.sessions.length },
    ];
  }, [data]);

  const departmentGroups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { code: string; courseCount: number; enrollments: number }>();
    for (const c of data.courses) {
      const dept = c.code.split('-')[0] || 'GEN';
      const cur = map.get(dept) || { code: dept, courseCount: 0, enrollments: 0 };
      cur.courseCount += 1;
      cur.enrollments += c.enrollmentCount;
      map.set(dept, cur);
    }
    return Array.from(map.values());
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="stat-grid" count={4} />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Unable to Load Administration Workspace"
        message={error || 'Authentication or tenant query error.'}
        onRetry={refresh}
      />
    );
  }

  const resolvedSettings = {
    require_camera: requireCam ?? data.tenant.settings.require_camera ?? true,
    require_audio: requireMic ?? data.tenant.settings.require_audio ?? true,
    require_fullscreen: requireFs ?? data.tenant.settings.require_fullscreen ?? true,
    trust_score_threshold: trustThreshold ?? data.tenant.settings.trust_score_threshold ?? 70,
    max_violations_threshold:
      maxViolations ?? data.tenant.settings.max_violations_threshold ?? 10,
  };

  const handleRoleUpdate = async (userId: string, nextRole: UserRole) => {
    const res = await updateUserRoleAction(data.tenant.id, userId, nextRole);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error || 'Role update failed' });
      return;
    }
    await notify('Updated institutional member role.');
  };

  const handleRemoveMember = async (userId: string) => {
    const res = await removeUserAction(data.tenant.id, userId);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error || 'Failed to remove member' });
      return;
    }
    await notify('Removed member from institution.');
  };

  const handleExamStatus = async (examId: string, status: ExamStatus) => {
    const res = await updateExamStatusAction(examId, status);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    await notify(`Examination transitioned to ${status}.`);
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const res = await updateTenantConfigAction({
      settings: resolvedSettings,
    });
    setSavingConfig(false);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    await notify('Saved institutional security policies and logged audit event.');
  };

  const handleSaveTenantSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const res = await updateTenantConfigAction({
      name: tenantNameDraft ?? data.tenant.name,
      domain: tenantDomainDraft ?? data.tenant.domain,
      settings: data.tenant.settings,
    });
    setSavingConfig(false);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    await notify('Updated university profile configuration.');
  };

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInt(true);
    const res = await upsertIntegrationAction({
      integrationType: intType,
      providerName: intProvider,
      endpoint: intEndpoint || 'https://lms.university.edu/lti',
      isActive: true,
    });
    setSavingInt(false);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    setIntEndpoint('');
    await notify(`Saved integration connector for ${intProvider}.`);
  };

  const memberColumns: DataTableColumn<TenantMemberView>[] = [
    {
      key: 'name',
      header: 'Member',
      sortable: true,
      sortValue: (r) => r.fullName,
      render: (r) => (
        <div>
          <p className="font-medium text-[#F8FAFC]">{r.fullName}</p>
          <p className="text-xs text-[#94A3B8]">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      sortValue: (r) => r.role,
      render: (r) => (
        <StatusBadge tone={getRoleTone(r.role)} className="uppercase text-[10px]">
          {r.role === 'instructor' ? 'Faculty' : r.role}
        </StatusBadge>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      sortable: true,
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <span className="font-mono text-xs text-[#94A3B8]">
          {formatShortDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Manage',
      render: (r) => (
        <div className="flex items-center gap-2">
          <select
            aria-label={`Change role for ${r.fullName}`}
            value={r.role}
            onChange={(e) => handleRoleUpdate(r.userId, e.target.value as UserRole)}
            className="h-7 rounded-md border border-[#243249] bg-[#0B1220] px-2 text-xs text-[#F8FAFC]"
          >
            <option value="student">Student</option>
            <option value="instructor">Faculty</option>
            <option value="invigilator">Invigilator</option>
            <option value="admin">Admin</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRemoveMember(r.userId)}
            aria-label={`Remove ${r.fullName}`}
            className="text-[#94A3B8] hover:text-[#EF4444]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const courseColumns: DataTableColumn<CourseView>[] = [
    {
      key: 'code',
      header: 'Course',
      sortable: true,
      sortValue: (c) => c.code,
      render: (c) => (
        <div>
          <span className="font-mono text-xs text-[#38BDF8]">{c.code}</span>
          <p className="font-medium text-[#F8FAFC]">{c.name}</p>
        </div>
      ),
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (c) => <span className="text-xs text-[#94A3B8]">{c.semester}</span>,
    },
    {
      key: 'instructor',
      header: 'Instructor',
      render: (c) => <span className="text-xs text-[#F8FAFC]">{c.instructorName}</span>,
    },
    {
      key: 'enrollments',
      header: 'Enrolled',
      sortable: true,
      sortValue: (c) => c.enrollmentCount,
      render: (c) => (
        <span className="font-mono text-xs text-[#2DD4BF]">{c.enrollmentCount} students</span>
      ),
    },
  ];

  const examColumns: DataTableColumn<ExamView>[] = [
    {
      key: 'title',
      header: 'Examination',
      sortable: true,
      sortValue: (e) => e.title,
      render: (e) => (
        <div>
          <p className="font-medium text-[#F8FAFC]">{e.title}</p>
          <p className="text-xs font-mono text-[#94A3B8]">
            {e.courseCode} • {e.durationMinutes} min • {e.questionCount} questions
          </p>
        </div>
      ),
    },
    {
      key: 'window',
      header: 'Window',
      render: (e) => (
        <span className="font-mono text-xs text-[#94A3B8]">
          {formatShortDateTime(e.startTime)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <StatusBadge tone={getExamStatusTone(e.status)} className="capitalize">
          {e.status}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Lifecycle',
      render: (e) => (
        <div className="flex items-center gap-1.5">
          {e.status === 'draft' && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleExamStatus(e.id, 'published')}
            >
              Publish
            </Button>
          )}
          {e.status === 'published' && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleExamStatus(e.id, 'active')}
            >
              Activate
            </Button>
          )}
          {e.status === 'active' && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleExamStatus(e.id, 'completed')}
            >
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const questionColumns: DataTableColumn<QuestionView>[] = [
    {
      key: 'prompt',
      header: 'Question Prompt',
      render: (q) => (
        <div className="max-w-lg">
          <p className="text-sm text-[#F8FAFC] line-clamp-2">{q.prompt}</p>
          <p className="text-[11px] font-mono text-[#94A3B8]">
            {q.courseCode} • {q.examTitle}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Format',
      render: (q) => (
        <StatusBadge tone="cyan" className="font-mono text-[10px]">
          {q.type}
        </StatusBadge>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (q) => <span className="font-mono text-xs text-[#F8FAFC]">{q.points} pts</span>,
    },
  ];

  const auditColumns: DataTableColumn<AuditLogView>[] = [
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      sortValue: (a) => a.action,
      render: (a) => (
        <StatusBadge tone="teal" className="font-mono text-[10px]">
          {a.action}
        </StatusBadge>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (a) => <span className="text-xs text-[#F8FAFC]">{a.actorName}</span>,
    },
    {
      key: 'entity',
      header: 'Target',
      render: (a) => (
        <span className="font-mono text-xs text-[#94A3B8]">
          {a.entityType || 'system'}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Timestamp',
      sortable: true,
      sortValue: (a) => a.createdAt,
      render: (a) => (
        <span className="font-mono text-xs text-[#94A3B8]">
          {formatShortDateTime(a.createdAt)}
        </span>
      ),
    },
  ];

  const filteredMembers =
    roleFilter === 'all' ? data.members : data.members.filter((m) => m.role === roleFilter);

  const sectionHeaders: Record<AdminSection, { title: string; desc: string }> = {
    overview: {
      title: 'University Administration Command',
      desc: `Tenant overview, exam volume, and compliance metrics for ${data.tenant.name}.`,
    },
    users: {
      title:
        roleFilter === 'instructor'
          ? 'Faculty Directory'
          : roleFilter === 'student'
          ? 'Student Roster'
          : 'User & Role Management',
      desc: 'Invite staff, assign tenant authorities, and onboard student cohorts.',
    },
    departments: {
      title: 'Academic Departments',
      desc: 'Departmental course distribution grouped from active catalog codes.',
    },
    courses: {
      title: 'Course Catalog',
      desc: 'Manage institutional courses and student enrollments.',
    },
    exams: {
      title: 'All Examinations',
      desc: 'Tenant-wide examination schedules, lifecycles, and telemetry rules.',
    },
    'question-bank': {
      title: 'Central Question Bank',
      desc: 'Audit authored questions across university courses (answer keys restricted).',
    },
    monitoring: {
      title: 'Institutional Live Monitoring',
      desc: 'Real-time view of active examinees and flagged review cases.',
    },
    reports: {
      title: 'Integrity Reports & Exports',
      desc: 'Exportable examination participation and security audit datasets.',
    },
    integrations: {
      title: 'University Integrations',
      desc: 'Configure future-ready LMS, SSO/SAML, and notification connectors.',
    },
    security: {
      title: 'Security & Proctoring Policies',
      desc: 'Configure default edge telemetry and trust thresholds for all exams.',
    },
    'audit-logs': {
      title: 'Immutable Audit Trail',
      desc: 'Chronological ledger of authentication, exam, and review actions.',
    },
    settings: {
      title: 'Institution Settings',
      desc: 'Configure university tenant identity and verified email domain.',
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={sectionHeaders[section].title}
        description={sectionHeaders[section].desc}
        badge={<StatusBadge tone="cyan">{data.tenant.slug}</StatusBadge>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            {(section === 'overview' || section === 'users') && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowBulkCsv(true)}>
                  <UploadCloud className="h-3.5 w-3.5" />
                  Bulk CSV
                </Button>
                <Button size="sm" onClick={() => setShowInvite(true)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Member
                </Button>
              </>
            )}
            {(section === 'courses' || section === 'departments') && (
              <Button size="sm" onClick={() => setShowCreateCourse(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create Course
              </Button>
            )}
            {section === 'exams' && (
              <Button size="sm" onClick={() => setShowCreateExam(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create Exam
              </Button>
            )}
          </>
        }
      />

      {banner && (
        <AlertPanel
          tone={banner.tone}
          title={banner.tone === 'success' ? 'Success' : 'Action Error'}
          description={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Students"
              value={data.metrics.totalStudents}
              subtitle="Enrolled examinees"
              accent="success"
              icon={<GraduationCap className="h-5 w-5" />}
            />
            <StatCard
              label="Total Faculty"
              value={data.metrics.totalFaculty}
              subtitle="Course instructors"
              accent="teal"
              icon={<BookOpen className="h-5 w-5" />}
            />
            <StatCard
              label="Active Examinations"
              value={data.metrics.activeExams}
              subtitle="Published or live"
              accent="cyan"
              icon={<Layers className="h-5 w-5" />}
            />
            <StatCard
              label="Completed Exams"
              value={data.metrics.completedExams}
              subtitle="Closed windows"
              accent="purple"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              label="Flagged Sessions"
              value={data.metrics.flaggedSessions}
              subtitle="Requiring review"
              accent={data.metrics.flaggedSessions > 0 ? 'warning' : 'cyan'}
              icon={<Flag className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Examination Activity"
              subtitle="Scheduled assessments & candidate session volume by date"
              isEmpty={examActivitySeries.length === 0}
              emptyMessage="No examinations scheduled yet. Create an exam to populate activity telemetry."
            >
              <ActivityAreaChart
                data={examActivitySeries}
                primaryLabel="Sessions"
                secondaryLabel="Exams"
              />
            </ChartCard>

            <ChartCard
              title="University Usage Analytics"
              subtitle="Live Supabase entity counts across the institution"
            >
              <DistributionBarChart data={usageAnalyticsSeries} valueLabel="Records" />
            </ChartCard>
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-[#F8FAFC]">
              Recent Institutional Activity
            </h2>
            <EventTimeline
              events={data.auditLogs.slice(0, 8).map((log) => ({
                id: log.id,
                title: log.action.replace(/_/g, ' '),
                description: `Actor: ${log.actorName} (${log.entityType || 'system'})`,
                timestamp: formatShortDateTime(log.createdAt),
                severity: log.action.includes('TERMINATED') ? 'high' : 'info',
                category: 'system',
              }))}
              emptyTitle="No recent audit events"
              emptyDescription="Institutional activity logs will populate as members sign in and create exams."
            />
          </div>
        </div>
      )}

      {/* USERS / FACULTY / STUDENTS */}
      {section === 'users' && (
        <DataTable
          data={filteredMembers}
          columns={memberColumns}
          getRowKey={(r) => `${r.userId}-${r.role}`}
          searchPlaceholder="Search by name or email..."
          searchFilter={(r, q) =>
            r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
          }
          toolbarActions={
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'student', 'instructor', 'invigilator', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleOverride(r)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium capitalize cursor-pointer transition-colors ${
                    roleFilter === r
                      ? 'border-[#38BDF8]/50 bg-[#38BDF8]/15 text-[#38BDF8]'
                      : 'border-[#243249] bg-[#111B2D] text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {r === 'instructor' ? 'Faculty' : r}
                </button>
              ))}
            </div>
          }
          emptyTitle="No institutional members found"
          emptyDescription="Invite faculty, invigilators, or import students via CSV."
        />
      )}

      {/* DEPARTMENTS */}
      {section === 'departments' &&
        (departmentGroups.length === 0 ? (
          <EmptyState
            title="No Departments Derived Yet"
            description="Departments are automatically derived from course codes (e.g., CS-201). Create a course to establish a department."
            icon={<Building className="h-5 w-5" />}
            action={
              <Button size="sm" onClick={() => setShowCreateCourse(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create First Course
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentGroups.map((dept) => (
              <StatCard
                key={dept.code}
                label={`Department • ${dept.code}`}
                value={dept.courseCount}
                suffix=" courses"
                subtitle={`${dept.enrollments} enrolled student seats`}
                icon={<Building className="h-5 w-5" />}
              />
            ))}
          </div>
        ))}

      {/* COURSES */}
      {section === 'courses' && (
        <DataTable
          data={data.courses}
          columns={courseColumns}
          getRowKey={(c) => c.id}
          searchPlaceholder="Search courses by code or name..."
          emptyTitle="No Courses Created"
          emptyDescription="Add your first university course to start scheduling protected examinations."
        />
      )}

      {/* EXAMS */}
      {section === 'exams' && (
        <DataTable
          data={data.exams}
          columns={examColumns}
          getRowKey={(e) => e.id}
          searchPlaceholder="Search examinations..."
          emptyTitle="No Examinations Found"
          emptyDescription="Create an examination under an active course to configure monitoring rules."
        />
      )}

      {/* QUESTION BANK */}
      {section === 'question-bank' && (
        <DataTable
          data={data.questions}
          columns={questionColumns}
          getRowKey={(q) => q.id}
          searchPlaceholder="Search question prompts..."
          emptyTitle="Question Bank is Empty"
          emptyDescription="Faculty-authored questions will appear here once added to examinations."
        />
      )}

      {/* MONITORING */}
      {section === 'monitoring' && (
        <div className="space-y-6">
          <DataTable
            data={data.sessions}
            columns={[
              {
                key: 'student',
                header: 'Candidate',
                render: (s) => (
                  <div>
                    <p className="font-medium text-[#F8FAFC]">{s.studentName}</p>
                    <p className="text-xs text-[#94A3B8]">{s.examTitle}</p>
                  </div>
                ),
              },
              {
                key: 'trust',
                header: 'Trust Score',
                render: (s) => (
                  <span className="font-mono text-sm font-bold text-[#38BDF8]">
                    {s.trustScore.toFixed(0)}%
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Session Status',
                render: (s) => (
                  <StatusBadge tone={getSessionStatusTone(s.status)}>
                    {s.status.replace(/_/g, ' ')}
                  </StatusBadge>
                ),
              },
            ]}
            getRowKey={(s) => s.id}
            emptyTitle="No Exam Sessions Recorded"
            emptyDescription="Candidate monitoring telemetry appears once students launch an exam."
          />

          {data.reviewCases.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading text-base font-semibold text-[#F8FAFC]">
                Flagged Review Queue
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.reviewCases.map((rc) => (
                  <div
                    key={rc.id}
                    className="rounded-xl border border-[#243249] bg-[#111B2D] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#F8FAFC] truncate">{rc.studentName}</p>
                      <p className="text-xs text-[#94A3B8] truncate">{rc.examTitle}</p>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => setSelectedCase(rc)}>
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORTS */}
      {section === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                downloadCsvFile(
                  'examguard-sessions-report.csv',
                  ['Session ID', 'Student', 'Email', 'Exam', 'Status', 'Score', 'Trust Score'],
                  data.sessions.map((s) => [
                    s.id,
                    s.studentName,
                    s.studentEmail,
                    s.examTitle,
                    s.status,
                    s.score ?? 'N/A',
                    s.trustScore,
                  ])
                )
              }
            >
              <Download className="h-4 w-4" />
              Export Sessions CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsvFile(
                  'examguard-audit-logs.csv',
                  ['ID', 'Action', 'Actor', 'Entity', 'Created At'],
                  data.auditLogs.map((a) => [
                    a.id,
                    a.action,
                    a.actorName,
                    a.entityType || 'system',
                    a.createdAt,
                  ])
                )
              }
            >
              <Download className="h-4 w-4" />
              Export Audit Logs CSV
            </Button>
          </div>

          <ChartCard title="Institutional Activity Summary" subtitle="Real record counts">
            <DistributionBarChart data={usageAnalyticsSeries} valueLabel="Records" />
          </ChartCard>
        </div>
      )}

      {/* INTEGRATIONS */}
      {section === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl border border-[#243249] bg-[#111B2D] p-6 space-y-4">
            <h3 className="font-heading text-base font-semibold text-[#F8FAFC]">
              Add / Update Connector
            </h3>
            <form onSubmit={handleSaveIntegration} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="int-type">Category</Label>
                <select
                  id="int-type"
                  value={intType}
                  onChange={(e) =>
                    setIntType(e.target.value as IntegrationConfigView['integrationType'])
                  }
                  className="h-9 w-full rounded-lg border border-[#243249] bg-[#0B1220] px-3 text-sm text-[#F8FAFC]"
                >
                  <option value="lms">LMS (LTI 1.3)</option>
                  <option value="sso">SSO / SAML 2.0</option>
                  <option value="notification">Webhook Notification</option>
                  <option value="analytics">Analytics Export</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-provider">Provider Name</Label>
                <Input
                  id="int-provider"
                  required
                  value={intProvider}
                  onChange={(e) => setIntProvider(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-endpoint">Endpoint / Issuer URL</Label>
                <Input
                  id="int-endpoint"
                  value={intEndpoint}
                  onChange={(e) => setIntEndpoint(e.target.value)}
                  placeholder="https://lms.university.edu/lti"
                />
              </div>
              <Button type="submit" disabled={savingInt} className="w-full">
                {savingInt && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Integration Config
              </Button>
            </form>
          </div>

          <div className="lg:col-span-7">
            <DataTable
              data={data.integrations}
              columns={[
                {
                  key: 'provider',
                  header: 'Provider',
                  render: (i) => (
                    <div>
                      <p className="font-medium text-[#F8FAFC]">{i.providerName}</p>
                      <p className="text-xs font-mono text-[#94A3B8]">{i.configSummary}</p>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (i) => (
                    <StatusBadge tone="purple" className="uppercase text-[10px]">
                      {i.integrationType}
                    </StatusBadge>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (i) => (
                    <StatusBadge tone={i.isActive ? 'success' : 'neutral'}>
                      {i.isActive ? 'Configured' : 'Disabled'}
                    </StatusBadge>
                  ),
                },
              ]}
              getRowKey={(i) => i.id}
              searchable={false}
              emptyTitle="No External Integrations Configured"
              emptyDescription="Configure Canvas, Moodle, or institutional SSO endpoints on the left."
            />
          </div>
        </div>
      )}

      {/* SECURITY POLICIES */}
      {section === 'security' && (
        <form
          onSubmit={handleSavePolicies}
          className="max-w-2xl rounded-xl border border-[#243249] bg-[#111B2D] p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#38BDF8]" />
            <h3 className="font-heading text-lg font-semibold text-[#F8FAFC]">
              Default Proctoring & Integrity Thresholds
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between rounded-lg border border-[#243249] bg-[#0B1220] p-3.5 cursor-pointer">
              <span>Require In-Browser Webcam Monitoring</span>
              <input
                type="checkbox"
                checked={resolvedSettings.require_camera}
                onChange={(e) => setRequireCam(e.target.checked)}
                className="accent-[#38BDF8]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[#243249] bg-[#0B1220] p-3.5 cursor-pointer">
              <span>Require Local Acoustic Energy Detection</span>
              <input
                type="checkbox"
                checked={resolvedSettings.require_audio}
                onChange={(e) => setRequireMic(e.target.checked)}
                className="accent-[#38BDF8]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[#243249] bg-[#0B1220] p-3.5 cursor-pointer">
              <span>Enforce Fullscreen & Visibility Guard</span>
              <input
                type="checkbox"
                checked={resolvedSettings.require_fullscreen}
                onChange={(e) => setRequireFs(e.target.checked)}
                className="accent-[#38BDF8]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="trust-thresh">Review Escalation Trust Score (&lt;%)</Label>
              <Input
                id="trust-thresh"
                type="number"
                min={10}
                max={99}
                value={resolvedSettings.trust_score_threshold}
                onChange={(e) => setTrustThreshold(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-viol">Max Events Before Flagging</Label>
              <Input
                id="max-viol"
                type="number"
                min={1}
                max={100}
                value={resolvedSettings.max_violations_threshold}
                onChange={(e) => setMaxViolations(Number(e.target.value))}
              />
            </div>
          </div>

          <Button type="submit" disabled={savingConfig}>
            {savingConfig && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Security Policies
          </Button>
        </form>
      )}

      {/* AUDIT LOGS */}
      {section === 'audit-logs' && (
        <DataTable
          data={data.auditLogs}
          columns={auditColumns}
          getRowKey={(a) => a.id}
          searchPlaceholder="Filter audit actions or actors..."
          toolbarActions={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsvFile(
                  'audit-logs.csv',
                  ['ID', 'Action', 'Actor', 'Entity', 'Timestamp'],
                  data.auditLogs.map((a) => [
                    a.id,
                    a.action,
                    a.actorName,
                    a.entityType || 'system',
                    a.createdAt,
                  ])
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          }
          emptyTitle="No Audit Logs Yet"
          emptyDescription="Every privileged mutation is recorded automatically in audit_logs."
        />
      )}

      {/* SETTINGS */}
      {section === 'settings' && (
        <form
          onSubmit={handleSaveTenantSettings}
          className="max-w-xl rounded-xl border border-[#243249] bg-[#111B2D] p-6 space-y-4"
        >
          <h3 className="font-heading text-lg font-semibold text-[#F8FAFC]">
            University Tenant Identity
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name">Institution Name</Label>
            <Input
              id="tenant-name"
              required
              value={tenantNameDraft ?? data.tenant.name}
              onChange={(e) => setTenantNameDraft(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-domain">Institutional Email Domain</Label>
            <Input
              id="tenant-domain"
              value={tenantDomainDraft ?? data.tenant.domain ?? ''}
              onChange={(e) => setTenantDomainDraft(e.target.value)}
              placeholder="university.edu"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tenant Slug (Immutable)</Label>
            <Input disabled value={data.tenant.slug} className="font-mono opacity-70" />
          </div>
          <Button type="submit" disabled={savingConfig}>
            {savingConfig && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Institution Profile
          </Button>
        </form>
      )}

      {/* Modals & Drawer */}
      <InviteMemberModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        tenantId={data.tenant.id}
        onSuccess={notify}
      />
      <BulkCsvModal
        open={showBulkCsv}
        onClose={() => setShowBulkCsv(false)}
        tenantId={data.tenant.id}
        onSuccess={notify}
      />
      <CreateCourseModal
        open={showCreateCourse}
        onClose={() => setShowCreateCourse(false)}
        onSuccess={notify}
      />
      <CreateExamModal
        open={showCreateExam}
        onClose={() => setShowCreateExam(false)}
        courses={data.courses}
        onSuccess={notify}
      />
      <ReviewInspectionDrawer
        reviewCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onActionRecorded={refresh}
      />
    </div>
  );
}
