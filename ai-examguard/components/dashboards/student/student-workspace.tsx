'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { getStudentDashboardAction } from '@/lib/actions/dashboard-actions';
import {
  formatShortDateTime,
  getExamStatusTone,
  getSessionStatusTone,
} from '@/lib/utils/dashboard-formatters';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertPanel } from '@/components/shared/alert-panel';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { DeviceReadinessPanel } from './device-readiness-panel';
import type { ExamView, SessionView } from '@/types/dashboard';

export type StudentSection =
  | 'overview'
  | 'upcoming'
  | 'available'
  | 'history'
  | 'results'
  | 'device-readiness'
  | 'profile'
  | 'support';

export function StudentWorkspace({ section }: { section: StudentSection }) {
  const { data, isLoading, error, refresh } = useDashboardData(getStudentDashboardAction);

  const { upcomingList, availableList, completedSessions, sessionsByExam } = useMemo(() => {
    if (!data) {
      return {
        upcomingList: [],
        availableList: [],
        completedSessions: [],
        sessionsByExam: new Map<string, SessionView>(),
      };
    }
    const serverNow = data.serverTimeMs;
    const completed = data.sessions.filter(
      (s) => s.status === 'submitted' || s.status === 'graded'
    );
    const completedIds = new Set(completed.map((s) => s.examId));

    const available = data.exams.filter((e) => {
      const start = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      return (
        !completedIds.has(e.id) &&
        (e.status === 'active' ||
          (e.status === 'published' && start <= serverNow && end >= serverNow))
      );
    });

    const upcoming = data.exams.filter(
      (e) => e.status === 'published' && new Date(e.startTime).getTime() > serverNow
    );

    const sessionMap = new Map(data.sessions.map((s) => [s.examId, s]));

    return {
      upcomingList: upcoming,
      availableList: available,
      completedSessions: completed,
      sessionsByExam: sessionMap,
    };
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="stat-grid" count={3} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Unable to Load Student Portal"
        message={error || 'Failed to retrieve enrolled examination schedule.'}
        onRetry={refresh}
      />
    );
  }

  const examColumns: DataTableColumn<ExamView>[] = [
    {
      key: 'title',
      header: 'Examination',
      render: (e) => (
        <div>
          <p className="font-medium text-foreground">{e.title}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {e.courseCode} • {e.durationMinutes} mins • {e.totalPoints} pts
          </p>
        </div>
      ),
    },
    {
      key: 'window',
      header: 'Scheduled Window',
      render: (e) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortDateTime(e.startTime)} → {formatShortDateTime(e.endTime)}
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
      key: 'action',
      header: 'Access',
      render: (e) => {
        const existing = sessionsByExam.get(e.id);
        if (existing?.status === 'in_progress') {
          return (
            <Button asChild size="xs" variant="secondary">
              <Link href={`/exam/${e.id}`}>
                Resume Exam
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          );
        }
        if (existing && (existing.status === 'submitted' || existing.status === 'graded')) {
          return (
            <Button asChild size="xs" variant="outline">
              <Link href={`/exam/${e.id}/preflight`}>View Receipt</Link>
            </Button>
          );
        }
        return e.status === 'active' || e.status === 'published' ? (
          <Button asChild size="xs">
            <Link href={`/exam/${e.id}/preflight`}>
              Pre-Flight
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Closed</span>
        );
      },
    },
  ];

  const sessionColumns: DataTableColumn<SessionView>[] = [
    {
      key: 'exam',
      header: 'Examination',
      render: (s) => (
        <div>
          <p className="font-medium text-foreground">{s.examTitle}</p>
          <p className="text-xs font-mono text-muted-foreground">{s.courseCode}</p>
        </div>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (s) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortDateTime(s.submittedAt || s.createdAt)}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (s) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          {s.score !== null ? `${s.score.toFixed(1)}%` : 'Pending Review'}
        </span>
      ),
    },
    {
      key: 'trust',
      header: 'Integrity Score',
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-success">{s.trustScore.toFixed(0)}%</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <StatusBadge tone={getSessionStatusTone(s.status)}>
          {s.status.replace(/_/g, ' ')}
        </StatusBadge>
      ),
    },
  ];

  const HEADER_META: Record<StudentSection, { title: string; desc: string }> = {
    overview: {
      title: `Welcome, ${data.profile.fullName}`,
      desc: `Track your scheduled examinations, verify device readiness, and review published results for ${data.tenantName}.`,
    },
    upcoming: {
      title: 'Upcoming Examinations',
      desc: 'Published exams scheduled for your enrolled courses.',
    },
    available: {
      title: 'Available Examinations',
      desc: 'Open examination windows ready for pre-flight calibration and entry.',
    },
    history: {
      title: 'Examination History',
      desc: 'Complete record of your past assessment sessions.',
    },
    results: {
      title: 'Certified Results & Integrity',
      desc: 'Published scores and session integrity confirmations.',
    },
    'device-readiness': {
      title: 'Device & Browser Readiness Check',
      desc: 'Verify webcam, microphone, and fullscreen API compatibility before entering an exam.',
    },
    profile: {
      title: 'Candidate Profile & Enrollments',
      desc: 'Review your verified institutional identity and course enrollments.',
    },
    support: {
      title: 'Student Integrity & Privacy Support',
      desc: 'Understand how AI ExamGuard works locally and protects your privacy.',
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={HEADER_META[section].title}
        description={HEADER_META[section].desc}
        badge={<StatusBadge tone="success">Candidate Portal</StatusBadge>}
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Upcoming Exams"
              value={data.metrics.upcomingExams}
              subtitle="Scheduled ahead"
              accent="cyan"
              icon={<CalendarClock className="h-5 w-5" />}
            />
            <StatCard
              label="Available Now"
              value={data.metrics.availableExams}
              subtitle="Ready for entry"
              accent="teal"
              icon={<Layers className="h-5 w-5" />}
            />
            <StatCard
              label="Completed Exams"
              value={data.metrics.completedExams}
              subtitle={`Avg integrity ${data.metrics.averageTrustScore}%`}
              accent="success"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Examination Calendar / Schedule */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Examination Calendar
                </h2>
                <Link
                  href="/student/upcoming"
                  className="text-xs font-mono text-primary hover:underline font-semibold"
                >
                  View All →
                </Link>
              </div>

              {upcomingList.length === 0 && availableList.length === 0 ? (
                <EmptyState
                  title="No Scheduled Examinations"
                  description="You currently have no upcoming or open exams in your enrolled courses."
                  icon={<CalendarClock className="h-5 w-5" />}
                />
              ) : (
                <div className="space-y-3">
                  {[...availableList, ...upcomingList].slice(0, 5).map((ex) => {
                    const existing = sessionsByExam.get(ex.id);
                    const isAvailableNow = availableList.some((a) => a.id === ex.id);
                    const href =
                      existing?.status === 'in_progress'
                        ? `/exam/${ex.id}`
                        : `/exam/${ex.id}/preflight`;
                    const ctaLabel =
                      existing?.status === 'in_progress'
                        ? 'Resume Exam'
                        : isAvailableNow
                          ? 'Enter Exam'
                          : 'Pre-Flight Check';

                    return (
                      <div
                        key={ex.id}
                        className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-primary">{ex.courseCode}</span>
                            <StatusBadge tone={getExamStatusTone(ex.status)}>{ex.status}</StatusBadge>
                          </div>
                          <p className="font-heading font-semibold text-foreground">{ex.title}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {formatShortDateTime(ex.startTime)} • {ex.durationMinutes} min
                          </p>
                        </div>
                        <Button asChild size="sm" variant={existing?.status === 'in_progress' ? 'secondary' : 'default'}>
                          <Link href={href}>
                            {ctaLabel}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Results */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Recent Results
                </h2>
                <Link
                  href="/student/results"
                  className="text-xs font-mono text-primary hover:underline font-semibold"
                >
                  History →
                </Link>
              </div>

              {completedSessions.length === 0 ? (
                <EmptyState
                  title="No Completed Results"
                  description="Submitted examination grades will appear here once evaluated."
                  icon={<GraduationCap className="h-5 w-5" />}
                />
              ) : (
                <div className="space-y-3">
                  {completedSessions.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border bg-card p-4 flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <p className="font-medium text-foreground">{s.examTitle}</p>
                        <p className="text-xs text-muted-foreground">{s.courseCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-bold text-success">
                          {s.score !== null ? `${s.score.toFixed(1)}%` : 'Pending'}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          Trust {s.trustScore.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DeviceReadinessPanel compact />
        </div>
      )}

      {section === 'upcoming' && (
        <DataTable
          data={upcomingList}
          columns={examColumns}
          getRowKey={(e) => e.id}
          emptyTitle="No Upcoming Examinations"
          emptyDescription="Upcoming published examinations for your enrolled courses will appear here."
        />
      )}

      {section === 'available' && (
        <DataTable
          data={availableList}
          columns={examColumns}
          getRowKey={(e) => e.id}
          emptyTitle="No Open Examinations Right Now"
          emptyDescription="Check Upcoming Examinations to see when your next assessment window opens."
        />
      )}

      {(section === 'history' || section === 'results') && (
        <DataTable
          data={data.sessions}
          columns={sessionColumns}
          getRowKey={(s) => s.id}
          emptyTitle="No Examination History"
          emptyDescription="Your attempted and graded examinations will be listed here."
        />
      )}

      {section === 'device-readiness' && <DeviceReadinessPanel />}

      {section === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-success/30 bg-success/10 text-success">
                <UserCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {data.profile.fullName}
                </h3>
                <p className="text-xs text-muted-foreground">{data.profile.email}</p>
              </div>
            </div>
            <div className="border-t border-border pt-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Institution</span>
                <span className="font-medium text-foreground">{data.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enrolled Courses</span>
                <span className="font-mono font-semibold text-primary">{data.enrolledCourses.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-3 shadow-xs">
            <h3 className="font-heading text-base font-semibold text-foreground">
              Enrolled Course Catalog
            </h3>
            {data.enrolledCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enrolled in any courses yet.</p>
            ) : (
              <div className="space-y-2">
                {data.enrolledCourses.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-border bg-surface-elevated/40 px-3 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground">
                      <span className="font-mono text-primary font-semibold mr-2">{c.code}</span>
                      {c.name}
                    </span>
                    <span className="text-muted-foreground">{c.semester}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'support' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AlertPanel
            tone="info"
            title="Zero Continuous Video or Audio Recording"
            description="AI ExamGuard processes camera face counts and microphone decibel levels locally inside your browser. Raw video frames and audio are never continuously recorded or uploaded."
          />
          <AlertPanel
            tone="success"
            title="Human Invigilator Review"
            description="Automated monitoring indicators never automatically fail or disqualify your exam. All flagged signals are reviewed by a human proctor."
          />
          <div className="md:col-span-2 rounded-lg border border-border bg-card p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-foreground">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-base font-semibold">
                Pre-Exam Troubleshooting Checklist
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>Use an updated Chromium, Firefox, or Safari browser with camera/mic access enabled.</li>
              <li>Ensure adequate front-facing lighting so single-face presence remains clear.</li>
              <li>Remain in fullscreen exam mode and avoid switching tabs during timed attempts.</li>
            </ul>
            <div className="pt-2 flex items-center gap-2 text-xs text-success">
              <Lock className="h-3.5 w-3.5" />
              <span>Protected by {data.tenantName} Academic Integrity Policy</span>
              <ShieldCheck className="h-3.5 w-3.5 ml-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
