'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useMonitoringRealtime } from '@/hooks/use-monitoring-realtime';
import {
  createExamAction,
  getFacultyDashboardAction,
} from '@/lib/actions/dashboard-actions';
import {
  deleteDraftExamAction,
  updateExamStatusAction,
} from '@/lib/actions/exam-actions';
import {
  downloadCsvFile,
  formatRiskCategoryLabel,
  formatShortDateTime,
  getExamStatusTone,
  getReviewStatusTone,
  getRiskCategoryTone,
  getSessionStatusTone,
  mapSeverityToTimeline,
} from '@/lib/utils/dashboard-formatters';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ChartCard } from '@/components/shared/chart-card';
import { ActivityAreaChart, DistributionBarChart } from '@/components/shared/telemetry-charts';
import { EventTimeline } from '@/components/shared/event-timeline';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertPanel } from '@/components/shared/alert-panel';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReviewInspectionDrawer } from '@/components/dashboards/shared/review-inspection-drawer';
import { CreateCourseModal } from '@/components/dashboards/admin/admin-modals';
import type { ExamStatus } from '@/types/database';
import type { ExamView, QuestionView, ReviewCaseView, SessionView } from '@/types/dashboard';

export type FacultySection =
  | 'overview'
  | 'exams'
  | 'create-exam'
  | 'question-bank'
  | 'assignments'
  | 'monitoring'
  | 'results'
  | 'review-cases'
  | 'analytics';

export function FacultyWorkspace({ section }: { section: FacultySection }) {
  const router = useRouter();
  const { data, isLoading, error, refresh } = useDashboardData(getFacultyDashboardAction);
  const realtime = useMonitoringRealtime({
    tenantId: data?.tenantId ?? null,
    enabled: Boolean(data?.tenantId),
    onUpdate: refresh,
  });
  const [banner, setBanner] = useState<{ tone: 'success' | 'critical'; text: string } | null>(
    null
  );
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ReviewCaseView | null>(null);

  // Create Examination form state
  const [courseId, setCourseId] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalPoints, setTotalPoints] = useState(100);
  const [requireCamera, setRequireCamera] = useState(true);
  const [requireAudio, setRequireAudio] = useState(true);
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [creatingExam, setCreatingExam] = useState(false);

  const sessionSeries = useMemo(() => {
    if (!data) return [];
    return data.exams.map((ex) => ({
      label: ex.courseCode,
      primary: ex.sessionCount,
      secondary: ex.questionCount,
    }));
  }, [data]);

  const trustDistribution = useMemo(() => {
    if (!data) return [];
    const high = data.sessions.filter((s) => s.trustScore >= 85).length;
    const med = data.sessions.filter((s) => s.trustScore >= 65 && s.trustScore < 85).length;
    const low = data.sessions.filter((s) => s.trustScore < 65).length;
    return [
      { name: 'High Trust (85+)', value: high },
      { name: 'Moderate (65-84)', value: med },
      { name: 'Needs Review (<65)', value: low },
    ];
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="stat-grid" count={5} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Unable to Load Faculty Command"
        message={error || 'Failed to fetch faculty workspace data.'}
        onRetry={refresh}
      />
    );
  }

  const handleStatusChange = async (examId: string, status: ExamStatus) => {
    const res = await updateExamStatusAction(examId, status);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    setBanner({ tone: 'success', text: `Examination status updated to ${status}.` });
    await refresh();
  };

  const handleDeleteDraft = async (examId: string) => {
    const res = await deleteDraftExamAction(examId);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    setBanner({ tone: 'success', text: 'Draft examination deleted.' });
    await refresh();
  };

  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourseId = courseId || data.courses[0]?.id;
    if (!targetCourseId) {
      setBanner({
        tone: 'critical',
        text: 'Create at least one course before scheduling an examination.',
      });
      return;
    }
    setCreatingExam(true);
    const start = new Date(Date.now() + 30 * 60 * 1000);
    const end = new Date(start.getTime() + Math.max(durationMinutes, 60) * 60 * 1000 * 2);

    const res = await createExamAction({
      courseId: targetCourseId,
      title: examTitle,
      description: examDesc,
      durationMinutes,
      totalPoints,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      requireCamera,
      requireAudio,
      requireFullscreen,
    });
    setCreatingExam(false);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    setExamTitle('');
    setExamDesc('');
    setBanner({ tone: 'success', text: 'Examination created as draft.' });
    await refresh();
    router.push('/faculty/exams');
  };

  const examColumns: DataTableColumn<ExamView>[] = [
    {
      key: 'title',
      header: 'Examination',
      sortable: true,
      sortValue: (e) => e.title,
      render: (e) => (
        <div>
          <p className="font-medium text-foreground">{e.title}</p>
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-0.5 tabular-nums">
            <span className="font-mono text-primary">{e.courseCode}</span>
            <span>{e.durationMinutes} min</span>
            <span>{e.questionCount} MCQs</span>
            <span>{e.totalPoints} pts (pass {e.passingMarks})</span>
          </p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (e) => (
        <span className="font-mono text-xs text-muted-foreground">
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
      header: 'Actions',
      render: (e) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button asChild size="xs" variant="outline">
            <Link href={`/faculty/exams/${e.id}/edit`}>
              <Edit3 className="h-3 w-3" />
              Edit Wizard
            </Link>
          </Button>
          {e.status === 'draft' && (
            <>
              <Button size="xs" variant="outline" onClick={() => handleStatusChange(e.id, 'published')}>
                Publish
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Delete draft examination"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteDraft(e.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {e.status === 'published' && (
            <Button size="xs" variant="outline" onClick={() => handleStatusChange(e.id, 'active')}>
              Start Window
            </Button>
          )}
          {e.status === 'active' && (
            <Button size="xs" variant="outline" onClick={() => handleStatusChange(e.id, 'completed')}>
              Close Exam
            </Button>
          )}
        </div>
      ),
    },
  ];

  const questionColumns: DataTableColumn<QuestionView>[] = [
    {
      key: 'prompt',
      header: 'Prompt',
      render: (q) => (
        <div>
          <p className="text-sm text-foreground line-clamp-2">{q.prompt}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {q.courseCode} · {q.examTitle}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (q) => <StatusBadge tone="teal">{q.type}</StatusBadge>,
    },
    {
      key: 'points',
      header: 'Points',
      render: (q) => <span className="font-mono text-xs">{q.points} pts</span>,
    },
  ];

  const sessionColumns: DataTableColumn<SessionView>[] = [
    {
      key: 'student',
      header: 'Student',
      sortable: true,
      sortValue: (s) => s.studentName,
      render: (s) => (
        <div>
          <p className="font-medium text-foreground">{s.studentName}</p>
          <p className="text-xs text-muted-foreground">{s.studentEmail}</p>
        </div>
      ),
    },
    {
      key: 'exam',
      header: 'Examination',
      render: (s) => (
        <span className="text-xs text-foreground">
          {s.courseCode} · {s.examTitle}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (s) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {s.score !== null ? `${s.score.toFixed(1)}%` : 'Pending'}
        </span>
      ),
    },
    {
      key: 'trust',
      header: 'Trust Score',
      render: (s) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-primary">
          {s.trustScore.toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk Category',
      sortable: true,
      sortValue: (s) => s.riskScore,
      render: (s) => (
        <div className="flex items-center gap-2">
          <StatusBadge tone={getRiskCategoryTone(s.riskCategory)}>
            {formatRiskCategoryLabel(s.riskCategory)}
          </StatusBadge>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {s.riskScore.toFixed(0)}
          </span>
        </div>
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

  const HEADER_META: Record<FacultySection, { title: string; desc: string }> = {
    overview: {
      title: 'Faculty Examination Command',
      desc: `Manage assessments, student integrity reviews, and analytics for ${data.tenantName}.`,
    },
    exams: {
      title: 'My Examinations',
      desc: 'Publish drafts, manage active exam windows, and monitor question counts.',
    },
    'create-exam': {
      title: 'Create Examination',
      desc: 'Configure examination schedule, scoring, and browser edge telemetry rules.',
    },
    'question-bank': {
      title: 'Course Question Bank',
      desc: 'Inspect authored questions linked to your examinations.',
    },
    assignments: {
      title: 'Student Course Assignments',
      desc: 'View enrolled students across your active courses.',
    },
    monitoring: {
      title: 'Live Course Monitoring',
      desc: 'Inspect ongoing student sessions and live telemetry events.',
    },
    results: {
      title: 'Examination Results & Grades',
      desc: 'Review submitted scores alongside integrity trust metrics.',
    },
    'review-cases': {
      title: 'Student Review Cases',
      desc: 'Human-in-the-loop review queue for flagged examination attempts.',
    },
    analytics: {
      title: 'Course & Assessment Analytics',
      desc: 'Participation and integrity distribution across your examinations.',
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={HEADER_META[section].title}
        description={HEADER_META[section].desc}
        badge={<StatusBadge tone="teal">Faculty Portal</StatusBadge>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCourseModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Course
            </Button>
            {section !== 'create-exam' && (
              <Button asChild size="sm">
                <Link href="/faculty/exams/new">
                  <FilePlus2 className="h-3.5 w-3.5" />
                  Create Examination
                </Link>
              </Button>
            )}
          </>
        }
      />

      {banner && (
        <AlertPanel
          tone={banner.tone}
          title={banner.tone === 'success' ? 'Saved' : 'Error'}
          description={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="My Examinations"
              value={data.metrics.myExaminations}
              subtitle={`${data.courses.length} active courses`}
              accent="cyan"
              icon={<Layers className="h-5 w-5" />}
            />
            <StatCard
              label="Upcoming Exams"
              value={data.metrics.upcomingExaminations}
              subtitle="Published or open"
              accent="teal"
              icon={<CalendarClock className="h-5 w-5" />}
            />
            <StatCard
              label="Active Students"
              value={data.metrics.activeStudents}
              subtitle="Enrolled across courses"
              accent="success"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Submissions"
              value={data.metrics.submissions}
              subtitle="Submitted / graded"
              accent="purple"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              label="Requiring Review"
              value={data.metrics.studentsRequiringReview}
              subtitle="Flagged attempts"
              accent={data.metrics.studentsRequiringReview > 0 ? 'warning' : 'cyan'}
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Examination Participation"
              subtitle="Candidate sessions vs authored questions per course"
              isEmpty={sessionSeries.length === 0}
              emptyMessage="Create a course and examination to visualize participation."
            >
              <ActivityAreaChart
                data={sessionSeries}
                primaryLabel="Sessions"
                secondaryLabel="Questions"
              />
            </ChartCard>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Recent Examination Activity
                </h2>
                <StatusBadge
                  tone={realtime.connectionStatus === 'live' ? 'success' : 'neutral'}
                >
                  {realtime.connectionStatus === 'live'
                    ? 'Realtime Live'
                    : 'Monitoring Sync'}
                </StatusBadge>
              </div>
              <EventTimeline
                events={data.proctorEvents.slice(0, 6).map((ev) => ({
                  id: ev.id,
                  title: `${ev.studentName} • ${ev.eventType.replace(/_/g, ' ')}`,
                  description: `${ev.examTitle} — ${ev.explanation}`,
                  timestamp: formatShortDateTime(ev.createdAt),
                  severity: mapSeverityToTimeline(ev.severity),
                  category:
                    ev.sourceModule === 'mediapipe_face' || ev.eventType.includes('FACE')
                      ? 'camera'
                      : ev.sourceModule === 'web_audio' || ev.eventType.includes('AUDIO')
                        ? 'audio'
                        : 'browser',
                }))}
                emptyTitle="No Recent Exam Telemetry"
                emptyDescription="Monitoring alerts and examination submissions from your courses will appear here."
              />
            </div>
          </div>
        </div>
      )}

      {/* MY EXAMINATIONS */}
      {section === 'exams' && (
        <DataTable
          data={data.exams}
          columns={examColumns}
          getRowKey={(e) => e.id}
          searchPlaceholder="Filter your examinations..."
          emptyTitle="No Examinations Authored Yet"
          emptyDescription="Create a course and launch the Create Examination wizard to publish your first test."
        />
      )}

      {/* CREATE EXAMINATION */}
      {section === 'create-exam' && (
        <form
          onSubmit={handleCreateExamSubmit}
          className="max-w-2xl rounded-lg border border-border bg-card p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-secondary" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Examination Blueprint
              </h2>
            </div>
            {data.courses.length === 0 && (
              <Button type="button" size="xs" onClick={() => setShowCourseModal(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create Course First
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fac-course">Assigned Course</Label>
            <select
              id="fac-course"
              value={courseId || data.courses[0]?.id || ''}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-sidebar px-3 text-sm text-foreground"
            >
              {data.courses.length === 0 ? (
                <option value="">No courses assigned to you yet</option>
              ) : (
                data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name} ({c.semester})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fac-title">Examination Title</Label>
            <Input
              id="fac-title"
              required
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="CS-201 Final Assessment"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fac-desc">Candidate Instructions</Label>
            <textarea
              id="fac-desc"
              rows={3}
              value={examDesc}
              onChange={(e) => setExamDesc(e.target.value)}
              placeholder="Closed-book examination. Maintain camera framing throughout..."
              className="w-full rounded-md border border-border bg-sidebar p-3 text-sm text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fac-dur">Duration (Minutes)</Label>
              <Input
                id="fac-dur"
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fac-pts">Total Points</Label>
              <Input
                id="fac-pts"
                type="number"
                min={1}
                max={1000}
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-sidebar p-4 space-y-2.5 text-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Integrity guardrails
            </p>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Require Local Face Presence Check</span>
              <input
                type="checkbox"
                checked={requireCamera}
                onChange={(e) => setRequireCamera(e.target.checked)}
                className="accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Require Acoustic Energy Monitor</span>
              <input
                type="checkbox"
                checked={requireAudio}
                onChange={(e) => setRequireAudio(e.target.checked)}
                className="accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Require Fullscreen &amp; Focus Lock</span>
              <input
                type="checkbox"
                checked={requireFullscreen}
                onChange={(e) => setRequireFullscreen(e.target.checked)}
                className="accent-primary"
              />
            </label>
          </div>

          <Button type="submit" disabled={creatingExam || data.courses.length === 0}>
            {creatingExam && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Draft Examination
          </Button>
        </form>
      )}

      {/* QUESTION BANK */}
      {section === 'question-bank' && (
        <DataTable
          data={data.questions}
          columns={questionColumns}
          getRowKey={(q) => q.id}
          emptyTitle="No Questions Added Yet"
          emptyDescription="Questions authored for your examinations will populate here."
        />
      )}

      {/* ASSIGNMENTS */}
      {section === 'assignments' && (
        <DataTable
          data={data.enrollments}
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (enr) => (
                <div>
                  <p className="font-medium text-foreground">{enr.studentName}</p>
                  <p className="text-xs text-muted-foreground">{enr.studentEmail}</p>
                </div>
              ),
            },
            {
              key: 'course',
              header: 'Enrolled Course',
              render: (enr) => (
                <span className="font-mono text-xs text-secondary">
                  {enr.courseCode} · {enr.courseName}
                </span>
              ),
            },
            {
              key: 'date',
              header: 'Enrolled At',
              render: (enr) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {formatShortDateTime(enr.enrolledAt)}
                </span>
              ),
            },
          ]}
          getRowKey={(enr) => `${enr.courseId}-${enr.studentId}`}
          emptyTitle="No Student Enrollments"
          emptyDescription="Enrolled students for your assigned courses will appear here."
        />
      )}

      {/* MONITORING */}
      {section === 'monitoring' && (
        <DataTable
          data={data.sessions}
          columns={sessionColumns}
          getRowKey={(s) => s.id}
          emptyTitle="No Active or Past Candidate Sessions"
          emptyDescription="Once enrolled students begin an examination, live status appears here."
        />
      )}

      {/* RESULTS */}
      {section === 'results' && (
        <DataTable
          data={data.sessions}
          columns={sessionColumns}
          getRowKey={(s) => s.id}
          toolbarActions={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsvFile(
                  'faculty-results.csv',
                  ['Student', 'Email', 'Exam', 'Score', 'Trust Score', 'Status'],
                  data.sessions.map((s) => [
                    s.studentName,
                    s.studentEmail,
                    s.examTitle,
                    s.score ?? 'Pending',
                    s.trustScore,
                    s.status,
                  ])
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Export Results CSV
            </Button>
          }
          emptyTitle="No Exam Results Available"
          emptyDescription="Submitted examination attempts will appear here with scores and trust ratings."
        />
      )}

      {/* REVIEW CASES */}
      {section === 'review-cases' && (
        <DataTable
          data={data.reviewCases}
          columns={[
            {
              key: 'student',
              header: 'Candidate',
              render: (rc) => (
                <div>
                  <p className="font-medium text-foreground">{rc.studentName}</p>
                  <p className="text-xs text-muted-foreground">{rc.examTitle}</p>
                </div>
              ),
            },
            {
              key: 'trust',
              header: 'Trust Score',
              render: (rc) => (
                <span className="font-mono text-xs font-bold tabular-nums text-warning">
                  {rc.trustScore.toFixed(0)}%
                </span>
              ),
            },
            {
              key: 'risk',
              header: 'Risk Category',
              sortable: true,
              sortValue: (rc) => rc.riskScore,
              render: (rc) => (
                <StatusBadge tone={getRiskCategoryTone(rc.riskCategory)}>
                  {formatRiskCategoryLabel(rc.riskCategory)}
                </StatusBadge>
              ),
            },
            {
              key: 'status',
              header: 'Case Status',
              render: (rc) => (
                <StatusBadge tone={getReviewStatusTone(rc.status)}>
                  {rc.status.replace(/_/g, ' ')}
                </StatusBadge>
              ),
            },
            {
              key: 'action',
              header: 'Inspect',
              render: (rc) => (
                <Button size="xs" variant="outline" onClick={() => setSelectedCase(rc)}>
                  <Eye className="h-3.5 w-3.5" />
                  Review
                </Button>
              ),
            },
          ]}
          getRowKey={(rc) => rc.id}
          emptyTitle="Zero Pending Review Cases"
          emptyDescription="Flagged candidate sessions requiring faculty or invigilator review will appear here."
        />
      )}

      {/* ANALYTICS */}
      {section === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Course Exam Volume"
            subtitle="Sessions & questions per course"
            isEmpty={sessionSeries.length === 0}
          >
            <ActivityAreaChart
              data={sessionSeries}
              primaryLabel="Sessions"
              secondaryLabel="Questions"
            />
          </ChartCard>
          <ChartCard
            title="Trust Score Distribution"
            subtitle="Breakdown across candidate sessions"
            isEmpty={data.sessions.length === 0}
          >
            <DistributionBarChart data={trustDistribution} valueLabel="Sessions" barColor="#2DD4BF" />
          </ChartCard>
        </div>
      )}

      <CreateCourseModal
        open={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        onSuccess={async (msg) => {
          setBanner({ tone: 'success', text: msg });
          await refresh();
        }}
      />
      <ReviewInspectionDrawer
        reviewCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onActionRecorded={refresh}
      />
    </div>
  );
}

