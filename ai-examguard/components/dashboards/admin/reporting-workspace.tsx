'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FilterX,
  Loader2,
  Mic,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { AlertPanel } from '@/components/shared/alert-panel';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  formatRiskCategoryLabel,
  formatShortDateTime,
  getEventOriginMeta,
  getExamStatusTone,
  getReviewStatusTone,
  getRiskCategoryTone,
  getSessionStatusTone,
} from '@/lib/utils/dashboard-formatters';
import {
  REPORT_TYPE_METADATA,
  type EventFrequencyReportRow,
  type ExaminationLevelReportRow,
  type ExaminationSubmissionReportRow,
  type IndividualCandidateReportRow,
  type MonitoringStatusReportRow,
  type ReportFilterParams,
  type ReportSuitePayload,
  type ReportType,
  type ReviewOutcomeReportRow,
  type UniversityActivityReportRow,
} from '@/types/reporting';

const EMPTY_FILTERS: ReportFilterParams = {
  universityId: '',
  department: '',
  courseId: '',
  examId: '',
  studentId: '',
  dateFrom: '',
  dateTo: '',
  eventType: '',
  reviewStatus: '',
};

function buildFilterQueryString(filters: ReportFilterParams, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (filters.universityId) params.set('universityId', filters.universityId);
  if (filters.department) params.set('department', filters.department);
  if (filters.courseId) params.set('courseId', filters.courseId);
  if (filters.examId) params.set('examId', filters.examId);
  if (filters.studentId) params.set('studentId', filters.studentId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.reviewStatus) params.set('reviewStatus', filters.reviewStatus);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  return params.toString();
}

export function ReportingWorkspace({
  titlePrefix = 'Institutional Reporting & Analytics',
}: {
  titlePrefix?: string;
}) {
  const [activeReport, setActiveReport] = useState<ReportType>('individual_candidate');
  const [filters, setFilters] = useState<ReportFilterParams>(EMPTY_FILTERS);
  const [suite, setSuite] = useState<ReportSuitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const loadReports = useCallback(async (activeFilters: ReportFilterParams) => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildFilterQueryString(activeFilters);
      const res = await fetch(`/api/reports${qs ? `?${qs}` : ''}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Failed to load reporting suite.');
        return;
      }
      setSuite(json as ReportSuitePayload);
    } catch (err: unknown) {
      setError((err as Error).message || 'Network error while generating reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const qs = buildFilterQueryString(filters);
        const res = await fetch(`/api/reports${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(json?.error || 'Failed to load reporting suite.');
        } else {
          setSuite(json as ReportSuitePayload);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) setError((err as Error).message || 'Failed to fetch reports.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [filters]);

  const handleExportCsv = async () => {
    setExporting(true);
    setExportSuccess(null);
    setError(null);
    try {
      const qs = buildFilterQueryString(filters, { reportType: activeReport });
      const res = await fetch(`/api/reports/export?${qs}`, { cache: 'no-store' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError((errJson as { error?: string }).error || 'CSV export failed.');
        return;
      }
      const csvText = await res.text();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `examguard-${activeReport}.csv`;
      const rowCount = res.headers.get('x-export-row-count') || '0';

      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(
        `Exported ${rowCount} row(s) to ${filename}. Action recorded in administrative audit log.`
      );
    } catch (err: unknown) {
      setError((err as Error).message || 'CSV export failed.');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setExportSuccess(null);
  };

  const updateFilter = (key: keyof ReportFilterParams, value: string) => {
    setFilters((prev) => {
      const next: ReportFilterParams = { ...prev, [key]: value };
      if (key === 'department') {
        next.courseId = '';
        next.examId = '';
      } else if (key === 'courseId') {
        next.examId = '';
      }
      return next;
    });
  };

  const activeMeta = useMemo(
    () =>
      REPORT_TYPE_METADATA.find((r) => r.id === activeReport) ??
      REPORT_TYPE_METADATA[0]!,
    [activeReport]
  );

  const visibleCourses = useMemo(() => {
    if (!suite) return [];
    if (!filters.department) return suite.options.courses;
    return suite.options.courses.filter((c) => c.departmentCode === filters.department);
  }, [suite, filters.department]);

  const visibleExams = useMemo(() => {
    if (!suite) return [];
    return suite.options.exams.filter((e) => {
      if (filters.department && e.departmentCode !== filters.department) return false;
      if (filters.courseId && e.courseId !== filters.courseId) return false;
      return true;
    });
  }, [suite, filters.department, filters.courseId]);

  const individualColumns: DataTableColumn<IndividualCandidateReportRow>[] = [
    {
      key: 'student',
      header: 'Candidate',
      sortable: true,
      sortValue: (r) => r.studentName,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.studentName}</p>
          <p className="text-xs font-mono text-muted-foreground">{r.studentEmail}</p>
        </div>
      ),
    },
    {
      key: 'exam',
      header: 'Examination',
      render: (r) => (
        <div>
          <p className="text-sm text-foreground">{r.examTitle}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {r.departmentCode} • {r.courseCode}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Session',
      render: (r) => (
        <div className="space-y-1">
          <StatusBadge tone={getSessionStatusTone(r.sessionStatus)} className="capitalize">
            {r.sessionStatus.replace(/_/g, ' ')}
          </StatusBadge>
          <p className="text-[11px] font-mono text-muted-foreground">{r.progressPercent}% answered</p>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Trust & Risk',
      sortable: true,
      sortValue: (r) => r.trustScore,
      render: (r) => (
        <div className="space-y-1">
          <span className="font-mono text-sm font-semibold text-foreground">{r.trustScore}%</span>
          <div>
            <StatusBadge tone={getRiskCategoryTone(r.riskCategory)} className="text-[10px]">
              {formatRiskCategoryLabel(r.riskCategory)}
            </StatusBadge>
          </div>
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Telemetry Breakdown',
      render: (r) => (
        <div className="text-xs font-mono text-muted-foreground space-y-0.5">
          <p className="text-foreground font-semibold">{r.totalEvents} total</p>
          <p>
            AI: {r.aiDetectionEvents} • Browser: {r.browserEvents}
            {r.simulatedEvents > 0 ? ` • Sim: ${r.simulatedEvents}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'review',
      header: 'Review Status',
      render: (r) =>
        r.reviewStatus === 'no_case' ? (
          <StatusBadge tone="neutral">No Case</StatusBadge>
        ) : (
          <StatusBadge tone={getReviewStatusTone(r.reviewStatus)} className="capitalize">
            {r.reviewStatus.replace(/_/g, ' ')}
          </StatusBadge>
        ),
    },
  ];

  const examLevelColumns: DataTableColumn<ExaminationLevelReportRow>[] = [
    {
      key: 'title',
      header: 'Examination',
      sortable: true,
      sortValue: (r) => r.examTitle,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.examTitle}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {r.departmentCode} • {r.courseCode} ({r.courseName})
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusBadge tone={getExamStatusTone(r.examStatus)} className="capitalize">
          {r.examStatus}
        </StatusBadge>
      ),
    },
    {
      key: 'participation',
      header: 'Sessions / Submitted',
      sortable: true,
      sortValue: (r) => r.totalSessions,
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.totalSessions} attempts • {r.submittedCount} submitted
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Avg Score / Trust',
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.averageScore !== null ? `${r.averageScore} pts` : 'Ungraded'} • {r.averageTrustScore}% trust
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Review Indicators',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone={r.priorityReviewCount > 0 ? 'critical' : 'neutral'}>
            Priority: {r.priorityReviewCount}
          </StatusBadge>
          <StatusBadge tone={r.reviewSuggestedCount > 0 ? 'warning' : 'neutral'}>
            Suggested: {r.reviewSuggestedCount}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Events',
      sortable: true,
      sortValue: (r) => r.totalEvents,
      render: (r) => <span className="font-mono text-xs text-primary">{r.totalEvents}</span>,
    },
  ];

  const universityActivityColumns: DataTableColumn<UniversityActivityReportRow>[] = [
    {
      key: 'dept',
      header: 'University & Department',
      sortable: true,
      sortValue: (r) => r.departmentCode,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">Department: {r.departmentCode}</p>
          <p className="text-xs text-muted-foreground">{r.universityName}</p>
        </div>
      ),
    },
    {
      key: 'academics',
      header: 'Academic Scope',
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.coursesCount} courses • {r.examinationsCount} exams
        </span>
      ),
    },
    {
      key: 'sessions',
      header: 'Sessions',
      sortable: true,
      sortValue: (r) => r.totalSessions,
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.totalSessions} total ({r.activeSessions} live / {r.completedSessions} completed)
        </span>
      ),
    },
    {
      key: 'telemetry',
      header: 'Telemetry & Reviews',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.totalEvents} events • {r.reviewActionsCount} review actions
        </span>
      ),
    },
    {
      key: 'audit',
      header: 'Tenant Audit Actions',
      render: (r) => <StatusBadge tone="teal">{r.auditActionsCount} logged</StatusBadge>,
    },
  ];

  const eventFrequencyColumns: DataTableColumn<EventFrequencyReportRow>[] = [
    {
      key: 'type',
      header: 'Event Type & Module',
      sortable: true,
      sortValue: (r) => r.eventType,
      render: (r) => {
        const originMeta = getEventOriginMeta(r.eventOrigin, r.simulatedCount > 0);
        return (
          <div className="space-y-1">
            <p className="font-mono text-xs font-semibold text-foreground">{r.eventType}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{r.sourceModule}</span>
              <StatusBadge tone={originMeta.tone} className="text-[10px]">
                {originMeta.label}
              </StatusBadge>
            </div>
          </div>
        );
      },
    },
    {
      key: 'occurrences',
      header: 'Occurrences',
      sortable: true,
      sortValue: (r) => r.occurrences,
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.occurrences} ({r.uniqueSessions} sessions)
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration (Total / Avg)',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.totalDurationSeconds}s total • {r.averageDurationSeconds}s avg
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'High / Critical',
      render: (r) => (
        <StatusBadge tone={r.highOrCriticalCount > 0 ? 'warning' : 'neutral'}>
          {r.highOrCriticalCount}
        </StatusBadge>
      ),
    },
    {
      key: 'outcomes',
      header: 'Triage Breakdown',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          Pending: {r.pendingReviewCount} • Flagged: {r.flaggedCount} • Dismissed/Cleared:{' '}
          {r.dismissedOrClearedCount}
        </span>
      ),
    },
  ];

  const monitoringStatusColumns: DataTableColumn<MonitoringStatusReportRow>[] = [
    {
      key: 'candidate',
      header: 'Candidate & Exam',
      sortable: true,
      sortValue: (r) => r.studentName,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.studentName}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {r.courseCode} • {r.examTitle}
          </p>
        </div>
      ),
    },
    {
      key: 'sensors',
      header: 'Sensors',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge
            tone={
              r.cameraStatus === 'connected'
                ? 'success'
                : r.cameraStatus === 'disconnected'
                ? 'critical'
                : 'neutral'
            }
          >
            <Camera className="h-3 w-3 mr-1" />
            {r.cameraStatus}
          </StatusBadge>
          <StatusBadge
            tone={
              r.microphoneStatus === 'connected'
                ? 'success'
                : r.microphoneStatus === 'disconnected'
                ? 'warning'
                : 'neutral'
            }
          >
            <Mic className="h-3 w-3 mr-1" />
            {r.microphoneStatus}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'interruptions',
      header: 'Interruptions / Drops',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          Browser: {r.browserInterruptionCount} • Device: {r.deviceDisconnectionCount}
        </span>
      ),
    },
    {
      key: 'health',
      header: 'Coverage Health',
      render: (r) => (
        <StatusBadge
          tone={
            r.monitoringHealth === 'Healthy'
              ? 'success'
              : r.monitoringHealth === 'Degraded'
              ? 'warning'
              : 'critical'
          }
        >
          {r.monitoringHealth}
        </StatusBadge>
      ),
    },
    {
      key: 'lastEvent',
      header: 'Last Signal',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortDateTime(r.lastEventAt)}
        </span>
      ),
    },
  ];

  const reviewOutcomeColumns: DataTableColumn<ReviewOutcomeReportRow>[] = [
    {
      key: 'candidate',
      header: 'Candidate & Exam',
      sortable: true,
      sortValue: (r) => r.studentName,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.studentName}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {r.courseCode} • {r.examTitle}
          </p>
        </div>
      ),
    },
    {
      key: 'outcome',
      header: 'Review Outcome',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone={getReviewStatusTone(r.reviewStatus)} className="capitalize">
            {r.reviewStatus.replace(/_/g, ' ')}
          </StatusBadge>
          <StatusBadge tone={getRiskCategoryTone(r.riskCategory)} className="text-[10px]">
            {formatRiskCategoryLabel(r.riskCategory)}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Reviewer Activity',
      render: (r) => (
        <div className="max-w-xs">
          <p className="text-xs font-mono text-foreground">{r.actionsTakenCount} actions recorded</p>
          <p className="text-xs text-muted-foreground truncate">
            {r.latestActionMessage || 'Awaiting reviewer notes'}
          </p>
        </div>
      ),
    },
    {
      key: 'timestamps',
      header: 'Reviewed At',
      sortable: true,
      sortValue: (r) => r.reviewedAt || r.createdAt,
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.reviewedAt ? formatShortDateTime(r.reviewedAt) : 'Pending'}
        </span>
      ),
    },
  ];

  const submissionColumns: DataTableColumn<ExaminationSubmissionReportRow>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      sortable: true,
      sortValue: (r) => r.studentName,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.studentName}</p>
          <p className="text-xs font-mono text-muted-foreground">{r.studentEmail}</p>
        </div>
      ),
    },
    {
      key: 'exam',
      header: 'Course & Exam',
      render: (r) => (
        <div>
          <p className="text-sm text-foreground">{r.examTitle}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {r.departmentCode} • {r.courseCode}
          </p>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Completion',
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.answeredCount}/{r.totalQuestions} questions
          {r.durationMinutes !== null ? ` • ${r.durationMinutes}m` : ''}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      sortValue: (r) => r.rawScore ?? -1,
      render: (r) => (
        <span className="font-mono text-xs text-foreground">
          {r.rawScore !== null
            ? `${r.rawScore}/${r.totalPoints} (${r.scorePercent ?? 0}%)`
            : 'Pending Grading'}
        </span>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (r) => (
        <StatusBadge
          tone={
            r.outcome === 'Passed'
              ? 'success'
              : r.outcome === 'Terminated' || r.outcome === 'Below Passing'
              ? 'critical'
              : 'warning'
          }
        >
          {r.outcome}
        </StatusBadge>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted At',
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortDateTime(r.submittedAt)}
        </span>
      ),
    },
  ];

  const reportRowCount = suite ? suite.reports[activeReport].length : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">{titlePrefix}</h2>
            <p className="text-xs text-muted-foreground">
              Filter across institutional hierarchy, candidates, event signals, and review states.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={loading}
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadReports(filters)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || exporting || !suite}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export {activeMeta.shortLabel} CSV
            </Button>
          </div>
        </div>

        {/* 8-Dimension Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="space-y-1">
            <Label htmlFor="rep-university" className="text-xs text-muted-foreground">
              University
            </Label>
            <select
              id="rep-university"
              value={filters.universityId || suite?.activeUniversityId || ''}
              onChange={(e) => updateFilter('universityId', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              {(suite?.options.universities || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rep-department" className="text-xs text-muted-foreground">
              Department
            </Label>
            <select
              id="rep-department"
              value={filters.department || ''}
              onChange={(e) => updateFilter('department', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="">All Departments</option>
              {(suite?.options.departments || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rep-course" className="text-xs text-muted-foreground">
              Course
            </Label>
            <select
              id="rep-course"
              value={filters.courseId || ''}
              onChange={(e) => updateFilter('courseId', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="">All Courses</option>
              {visibleCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rep-exam" className="text-xs text-muted-foreground">
              Examination
            </Label>
            <select
              id="rep-exam"
              value={filters.examId || ''}
              onChange={(e) => updateFilter('examId', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="">All Examinations</option>
              {visibleExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.courseCode} • {ex.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rep-student" className="text-xs text-muted-foreground">
              Student
            </Label>
            <select
              id="rep-student"
              value={filters.studentId || ''}
              onChange={(e) => updateFilter('studentId', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="">All Students</option>
              {(suite?.options.students || []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} ({st.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rep-event-type" className="text-xs text-muted-foreground">
              Event Type
            </Label>
            <select
              id="rep-event-type"
              value={filters.eventType || ''}
              onChange={(e) => updateFilter('eventType', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="">All Event Types</option>
              {(suite?.options.eventTypes || []).map((evt) => (
                <option key={evt} value={evt}>
                  {evt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rep-review-status" className="text-xs text-muted-foreground">
              Review Status
            </Label>
            <select
              id="rep-review-status"
              value={filters.reviewStatus || ''}
              onChange={(e) => updateFilter('reviewStatus', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="">All Review Statuses</option>
              {(suite?.options.reviewStatuses || []).map((rs) => (
                <option key={rs} value={rs}>
                  {rs.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="rep-date-from" className="text-xs text-muted-foreground">
                Date From
              </Label>
              <Input
                id="rep-date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rep-date-to" className="text-xs text-muted-foreground">
                Date To
              </Label>
              <Input
                id="rep-date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <AlertPanel
          tone="critical"
          title="Reporting Error"
          description={error}
          onDismiss={() => setError(null)}
        />
      )}

      {exportSuccess && (
        <AlertPanel
          tone="success"
          title="CSV Export Complete"
          description={exportSuccess}
          onDismiss={() => setExportSuccess(null)}
        />
      )}

      {suite && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Filtered Sessions"
            value={suite.summary.totalSessions}
            subtitle={`${suite.summary.totalCandidates} distinct students`}
            icon={<Activity className="h-4 w-4" />}
            accent="cyan"
          />
          <StatCard
            label="Submitted / Graded"
            value={suite.summary.submittedSessions}
            subtitle={`Across ${suite.summary.totalExams} exams`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="success"
          />
          <StatCard
            label="Average Trust Score"
            value={suite.summary.averageTrustScore}
            suffix="%"
            subtitle="Heuristic telemetry baseline"
            icon={<BarChart3 className="h-4 w-4" />}
            accent="teal"
          />
          <StatCard
            label="Priority Review"
            value={suite.summary.priorityReviewSessions}
            subtitle={`${suite.summary.totalEvents} filtered events`}
            icon={<ShieldAlert className="h-4 w-4" />}
            accent={suite.summary.priorityReviewSessions > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      {/* 7 Report Type Switcher */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPE_METADATA.map((meta) => {
          const count = suite ? suite.reports[meta.id].length : 0;
          const isSelected = activeReport === meta.id;
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => setActiveReport(meta.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                isSelected
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>{meta.shortLabel}</span>
              <span className="font-mono text-[11px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-background px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{activeMeta.label}:</strong> {activeMeta.description}
        </span>
        <span className="font-mono text-primary shrink-0">{reportRowCount} rows</span>
      </div>

      {loading && !suite ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
          Computing filtered institutional report...
        </div>
      ) : (
        suite && (
          <>
            {activeReport === 'individual_candidate' && (
              <DataTable
                data={suite.reports.individual_candidate}
                columns={individualColumns}
                getRowKey={(r) => r.sessionId}
                searchPlaceholder="Filter candidate or exam..."
                emptyTitle="No Candidate Sessions Match Filters"
                emptyDescription="Adjust department, exam, date range, or status filters above."
              />
            )}
            {activeReport === 'examination_level' && (
              <DataTable
                data={suite.reports.examination_level}
                columns={examLevelColumns}
                getRowKey={(r) => r.examId}
                searchPlaceholder="Filter examinations..."
                emptyTitle="No Examinations Match Filters"
                emptyDescription="No assessments match the active report criteria."
              />
            )}
            {activeReport === 'university_activity' && (
              <DataTable
                data={suite.reports.university_activity}
                columns={universityActivityColumns}
                getRowKey={(r) => `${r.universityId}-${r.departmentCode}`}
                searchPlaceholder="Filter departments..."
                emptyTitle="No Activity Records Match Filters"
                emptyDescription="Create courses and run examinations to populate activity summaries."
              />
            )}
            {activeReport === 'event_frequency' && (
              <DataTable
                data={suite.reports.event_frequency}
                columns={eventFrequencyColumns}
                getRowKey={(r) => `${r.eventType}-${r.sourceModule}-${r.eventOrigin}`}
                searchPlaceholder="Filter event types..."
                emptyTitle="No Monitoring Events Match Filters"
                emptyDescription="No telemetry events recorded within the selected filter scope."
              />
            )}
            {activeReport === 'monitoring_status' && (
              <DataTable
                data={suite.reports.monitoring_status}
                columns={monitoringStatusColumns}
                getRowKey={(r) => r.sessionId}
                searchPlaceholder="Filter candidates or status..."
                emptyTitle="No Monitoring Sessions Match Filters"
                emptyDescription="Hardware telemetry status will populate during candidate sessions."
              />
            )}
            {activeReport === 'review_outcome' && (
              <DataTable
                data={suite.reports.review_outcome}
                columns={reviewOutcomeColumns}
                getRowKey={(r) => r.reviewCaseId}
                searchPlaceholder="Filter review outcomes..."
                emptyTitle="No Review Cases Match Filters"
                emptyDescription="No adjudication cases match the selected criteria."
              />
            )}
            {activeReport === 'examination_submission' && (
              <DataTable
                data={suite.reports.examination_submission}
                columns={submissionColumns}
                getRowKey={(r) => r.sessionId}
                searchPlaceholder="Filter submissions..."
                emptyTitle="No Submission Records Match Filters"
                emptyDescription="Adjust filters or await student submissions."
              />
            )}
          </>
        )
      )}
    </div>
  );
}
