'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  Download,
  Eye,
  Layers,
  Mic,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { getInvigilatorDashboardAction } from '@/lib/actions/dashboard-actions';
import {
  downloadCsvFile,
  formatShortDateTime,
  getExamStatusTone,
  getReviewStatusTone,
  getSessionStatusTone,
  mapSeverityToTimeline,
} from '@/lib/utils/dashboard-formatters';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ChartCard } from '@/components/shared/chart-card';
import { DistributionBarChart } from '@/components/shared/telemetry-charts';
import { EventTimeline } from '@/components/shared/event-timeline';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { ReviewInspectionDrawer } from '@/components/dashboards/shared/review-inspection-drawer';
import type { EventSeverity } from '@/types/database';
import type { ExamView, ProctorEventView, ReviewCaseView, SessionView } from '@/types/dashboard';

export type InvigilatorSection =
  | 'overview'
  | 'examinations'
  | 'candidates'
  | 'alerts'
  | 'timeline'
  | 'review-cases'
  | 'reports';

export function InvigilatorWorkspace({ section }: { section: InvigilatorSection }) {
  const { data, isLoading, error, refresh } = useDashboardData(getInvigilatorDashboardAction);
  const [selectedCase, setSelectedCase] = useState<ReviewCaseView | null>(null);
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');

  const alertBreakdown = useMemo(() => {
    if (!data) return [];
    const severities: EventSeverity[] = ['low', 'medium', 'high', 'critical'];
    return severities.map((sev) => ({
      name: sev.toUpperCase(),
      value: data.proctorEvents.filter((e) => e.severity === sev).length,
    }));
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="stat-grid" count={4} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Unable to Load Invigilator Center"
        message={error || 'Failed to retrieve monitoring telemetry.'}
        onRetry={refresh}
      />
    );
  }

  const cameraPct =
    data.metrics.cameraTotalCount > 0
      ? Math.round((data.metrics.cameraConnectedCount / data.metrics.cameraTotalCount) * 100)
      : 0;
  const micPct =
    data.metrics.micTotalCount > 0
      ? Math.round((data.metrics.micConnectedCount / data.metrics.micTotalCount) * 100)
      : 0;

  const filteredEvents =
    severityFilter === 'all'
      ? data.proctorEvents
      : data.proctorEvents.filter((e) => e.severity === severityFilter);

  const examColumns: DataTableColumn<ExamView>[] = [
    {
      key: 'title',
      header: 'Examination',
      render: (e) => (
        <div>
          <p className="font-medium text-[#F8FAFC]">{e.title}</p>
          <p className="text-xs font-mono text-[#94A3B8]">
            {e.courseCode} • {e.durationMinutes} min
          </p>
        </div>
      ),
    },
    {
      key: 'sessions',
      header: 'Sessions',
      render: (e) => <span className="font-mono text-xs">{e.sessionCount} active/logged</span>,
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
  ];

  const candidateColumns: DataTableColumn<SessionView>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      sortable: true,
      sortValue: (s) => s.studentName,
      render: (s) => (
        <div>
          <p className="font-medium text-[#F8FAFC]">{s.studentName}</p>
          <p className="text-xs text-[#94A3B8]">{s.examTitle}</p>
        </div>
      ),
    },
    {
      key: 'hardware',
      header: 'Sensors',
      render: (s) => (
        <div className="flex items-center gap-2 text-xs font-mono">
          <StatusBadge tone={s.hardwareStatus?.camera ? 'success' : 'critical'}>
            Cam {s.hardwareStatus?.camera ? 'OK' : 'Off'}
          </StatusBadge>
          <StatusBadge tone={s.hardwareStatus?.microphone ? 'success' : 'warning'}>
            Mic {s.hardwareStatus?.microphone ? 'OK' : 'Off'}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'trust',
      header: 'Trust Score',
      sortable: true,
      sortValue: (s) => s.trustScore,
      render: (s) => (
        <span
          className={`font-mono text-sm font-bold ${
            s.trustScore >= 80
              ? 'text-[#22C55E]'
              : s.trustScore >= 60
              ? 'text-[#F59E0B]'
              : 'text-[#EF4444]'
          }`}
        >
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
  ];

  const alertColumns: DataTableColumn<ProctorEventView>[] = [
    {
      key: 'event',
      header: 'Signal',
      render: (ev) => (
        <div>
          <p className="font-medium text-[#F8FAFC]">{ev.eventType.replace(/_/g, ' ')}</p>
          <p className="text-xs text-[#94A3B8]">
            {ev.studentName} • {ev.examTitle}
          </p>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (ev) => (
        <StatusBadge
          tone={
            ev.severity === 'critical' || ev.severity === 'high'
              ? 'critical'
              : ev.severity === 'medium'
              ? 'warning'
              : 'teal'
          }
          pulse={ev.severity === 'critical'}
          className="uppercase text-[10px]"
        >
          {ev.severity}
        </StatusBadge>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (ev) => (
        <span className="font-mono text-xs text-[#94A3B8]">
          {ev.confidence !== null ? `${Math.round(ev.confidence * 100)}%` : 'Rule Trigger'}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Detected',
      render: (ev) => (
        <span className="font-mono text-xs text-[#94A3B8]">
          {formatShortDateTime(ev.createdAt)}
        </span>
      ),
    },
  ];

  const HEADER_META: Record<InvigilatorSection, { title: string; desc: string }> = {
    overview: {
      title: 'Live Invigilator Command Center',
      desc: `Real-time telemetry overview, hardware health, and review triage for ${data.tenantName}.`,
    },
    examinations: {
      title: 'Monitored Examinations',
      desc: 'Active and scheduled assessment rooms assigned to proctoring oversight.',
    },
    candidates: {
      title: 'Candidate Telemetry Roster',
      desc: 'Inspect per-candidate sensor status, trust score, and session health.',
    },
    alerts: {
      title: 'Integrity Alerts Centre',
      desc: 'Filterable queue of explainable camera, acoustic, and browser anomaly signals.',
    },
    timeline: {
      title: 'Chronological Event Timeline',
      desc: 'Audit stream of proctoring indicators across active examination cohorts.',
    },
    'review-cases': {
      title: 'Adjudication & Review Cases',
      desc: 'Human-in-the-loop review queue. Inspect timelines and record formal outcomes.',
    },
    reports: {
      title: 'Invigilation Telemetry Reports',
      desc: 'Severity breakdown charts and exportable incident summaries.',
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={HEADER_META[section].title}
        description={HEADER_META[section].desc}
        badge={
          <StatusBadge tone="purple" pulse>
            Invigilation Active
          </StatusBadge>
        }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Candidates"
              value={data.metrics.activeCandidates}
              subtitle={`${data.sessions.length} total sessions`}
              accent="cyan"
              icon={<Eye className="h-5 w-5" />}
            />
            <StatCard
              label="Active Examinations"
              value={data.metrics.activeExaminations}
              subtitle="Open rooms"
              accent="teal"
              icon={<Layers className="h-5 w-5" />}
            />
            <StatCard
              label="Review Required"
              value={data.metrics.reviewRequired}
              subtitle="Pending adjudication"
              accent={data.metrics.reviewRequired > 0 ? 'warning' : 'success'}
              icon={<UserCheck className="h-5 w-5" />}
            />
            <StatCard
              label="High-Priority Alerts"
              value={data.metrics.highPriorityAlerts}
              subtitle="High / critical events"
              accent={data.metrics.highPriorityAlerts > 0 ? 'critical' : 'cyan'}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          {/* Camera & Microphone Connectivity Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[#38BDF8]" />
                  <h3 className="font-heading text-sm font-semibold text-[#F8FAFC]">
                    Camera Connectivity
                  </h3>
                </div>
                <span className="font-mono text-sm font-bold text-[#38BDF8]">
                  {data.metrics.cameraTotalCount > 0 ? `${cameraPct}%` : 'No Sessions'}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#17243A] overflow-hidden">
                <div
                  className="h-full bg-[#38BDF8] transition-all"
                  style={{ width: `${cameraPct}%` }}
                />
              </div>
              <p className="text-xs text-[#94A3B8]">
                {data.metrics.cameraConnectedCount} of {data.metrics.cameraTotalCount} candidate
                sessions reporting active webcam telemetry.
              </p>
            </div>

            <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#2DD4BF]" />
                  <h3 className="font-heading text-sm font-semibold text-[#F8FAFC]">
                    Microphone Connectivity
                  </h3>
                </div>
                <span className="font-mono text-sm font-bold text-[#2DD4BF]">
                  {data.metrics.micTotalCount > 0 ? `${micPct}%` : 'No Sessions'}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#17243A] overflow-hidden">
                <div
                  className="h-full bg-[#2DD4BF] transition-all"
                  style={{ width: `${micPct}%` }}
                />
              </div>
              <p className="text-xs text-[#94A3B8]">
                {data.metrics.micConnectedCount} of {data.metrics.micTotalCount} candidate
                sessions reporting active acoustic baseline monitoring.
              </p>
            </div>
          </div>

          {/* Recent Events + Review Triage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-3">
              <h2 className="font-heading text-lg font-semibold text-[#F8FAFC] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#38BDF8]" />
                Recent Telemetry Events
              </h2>
              <EventTimeline
                events={data.proctorEvents.slice(0, 6).map((ev) => ({
                  id: ev.id,
                  title: `${ev.studentName} • ${ev.eventType.replace(/_/g, ' ')}`,
                  description: ev.examTitle,
                  timestamp: formatShortDateTime(ev.createdAt),
                  severity: mapSeverityToTimeline(ev.severity),
                  category: ev.eventType.includes('FACE')
                    ? 'camera'
                    : ev.eventType.includes('AUDIO')
                    ? 'audio'
                    : 'browser',
                }))}
                emptyTitle="No Anomalies Detected"
                emptyDescription="All active candidate telemetry feeds are currently nominal."
              />
            </div>

            <div className="lg:col-span-5 space-y-3">
              <h2 className="font-heading text-lg font-semibold text-[#F8FAFC] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
                Priority Review Cases
              </h2>
              {data.reviewCases.length === 0 ? (
                <EmptyState
                  title="Review Queue Clear"
                  description="No candidate sessions currently require invigilator adjudication."
                  icon={<UserCheck className="h-5 w-5" />}
                />
              ) : (
                <div className="space-y-3">
                  {data.reviewCases.slice(0, 5).map((rc) => (
                    <div
                      key={rc.id}
                      className="rounded-xl border border-[#243249] bg-[#111B2D] p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[#F8FAFC] truncate">
                            {rc.studentName}
                          </span>
                          <StatusBadge tone={getReviewStatusTone(rc.status)}>
                            {rc.status}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-[#94A3B8] truncate">
                          {rc.examTitle} • Trust {rc.trustScore.toFixed(0)}%
                        </p>
                      </div>
                      <Button size="xs" variant="outline" onClick={() => setSelectedCase(rc)}>
                        Inspect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {section === 'examinations' && (
        <DataTable
          data={data.exams}
          columns={examColumns}
          getRowKey={(e) => e.id}
          emptyTitle="No Active Examinations"
          emptyDescription="Published and active university examinations will appear here."
        />
      )}

      {section === 'candidates' && (
        <DataTable
          data={data.sessions}
          columns={candidateColumns}
          getRowKey={(s) => s.id}
          emptyTitle="No Active Candidates"
          emptyDescription="Live candidate camera, mic, and trust scores appear once sessions start."
        />
      )}

      {section === 'alerts' && (
        <DataTable
          data={filteredEvents}
          columns={alertColumns}
          getRowKey={(ev) => ev.id}
          toolbarActions={
            <div className="flex gap-1.5">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded-lg border px-2.5 py-1 text-xs uppercase font-mono cursor-pointer ${
                    severityFilter === sev
                      ? 'border-[#38BDF8]/50 bg-[#38BDF8]/15 text-[#38BDF8]'
                      : 'border-[#243249] bg-[#111B2D] text-[#94A3B8]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          }
          emptyTitle="Zero Integrity Alerts"
          emptyDescription="No anomaly telemetry matches the current severity filter."
        />
      )}

      {section === 'timeline' && (
        <EventTimeline
          events={data.proctorEvents.map((ev) => ({
            id: ev.id,
            title: `${ev.studentName} • ${ev.eventType.replace(/_/g, ' ')}`,
            description: `${ev.examTitle} — ${
              (ev.details?.reason as string | undefined) || 'Explainable edge signal captured.'
            }`,
            timestamp: formatShortDateTime(ev.createdAt),
            severity: mapSeverityToTimeline(ev.severity),
            category: ev.eventType.includes('FACE')
              ? 'camera'
              : ev.eventType.includes('AUDIO')
              ? 'audio'
              : 'browser',
          }))}
          emptyTitle="Timeline Empty"
          emptyDescription="Proctoring events across sessions will appear chronologically here."
        />
      )}

      {section === 'review-cases' && (
        <DataTable
          data={data.reviewCases}
          columns={[
            {
              key: 'student',
              header: 'Candidate',
              render: (rc) => (
                <div>
                  <p className="font-medium text-[#F8FAFC]">{rc.studentName}</p>
                  <p className="text-xs text-[#94A3B8]">{rc.examTitle}</p>
                </div>
              ),
            },
            {
              key: 'priority',
              header: 'Priority',
              render: (rc) => <span className="font-mono text-xs text-[#38BDF8]">P{rc.priority}</span>,
            },
            {
              key: 'trust',
              header: 'Trust Score',
              render: (rc) => (
                <span className="font-mono text-xs font-bold text-[#F59E0B]">
                  {rc.trustScore.toFixed(0)}%
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
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
                  Adjudicate
                </Button>
              ),
            },
          ]}
          getRowKey={(rc) => rc.id}
          emptyTitle="No Review Cases"
          emptyDescription="Sessions flagged for human verification will appear in this queue."
        />
      )}

      {section === 'reports' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsvFile(
                  'invigilator-events-report.csv',
                  ['Event ID', 'Candidate', 'Exam', 'Signal', 'Severity', 'Timestamp'],
                  data.proctorEvents.map((ev) => [
                    ev.id,
                    ev.studentName,
                    ev.examTitle,
                    ev.eventType,
                    ev.severity,
                    ev.createdAt,
                  ])
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Export Incident Log CSV
            </Button>
          </div>

          <ChartCard
            title="Proctor Signal Severity Distribution"
            subtitle="Count of explainable events grouped by severity tier"
            isEmpty={data.proctorEvents.length === 0}
          >
            <DistributionBarChart data={alertBreakdown} valueLabel="Events" barColor="#8B5CF6" />
          </ChartCard>
        </div>
      )}

      <ReviewInspectionDrawer
        reviewCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onActionRecorded={refresh}
      />
    </div>
  );
}

