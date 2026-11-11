'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Eye,
  Layers,
  Mic,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useMonitoringRealtime } from '@/hooks/use-monitoring-realtime';
import { getInvigilatorDashboardAction } from '@/lib/actions/dashboard-actions';
import {
  formatRiskCategoryLabel,
  formatShortDateTime,
  getEventOriginMeta,
  getEventReviewStatusTone,
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
import { DistributionBarChart } from '@/components/shared/telemetry-charts';
import { EventTimeline } from '@/components/shared/event-timeline';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { ReviewInspectionDrawer } from '@/components/dashboards/shared/review-inspection-drawer';
import { ReportingWorkspace } from '@/components/dashboards/admin/reporting-workspace';
import { CandidateDetailDrawer } from '@/components/dashboards/invigilator/candidate-detail-drawer';
import { InvigilatorCommandCentre } from '@/components/dashboards/invigilator/command-centre';
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
  const { connectionStatus: realtimeStatus } = useMonitoringRealtime({
    tenantId: data?.tenantId ?? null,
    enabled: Boolean(data?.tenantId),
    onUpdate: refresh,
  });
  const [selectedCase, setSelectedCase] = useState<ReviewCaseView | null>(null);
  const [inspectedCandidate, setInspectedCandidate] = useState<{
    session: SessionView;
    eventId?: string | null;
  } | null>(null);
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');

  const handleInspectCandidate = (session: SessionView, eventId?: string | null) => {
    setInspectedCandidate({ session, eventId: eventId ?? null });
  };

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
          <p className="font-medium text-foreground">{e.title}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {e.courseCode} • {e.durationMinutes} min
          </p>
        </div>
      ),
    },
    {
      key: 'sessions',
      header: 'Sessions',
      render: (e) => <span className="font-mono text-xs text-muted-foreground">{e.sessionCount} active/logged</span>,
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
          <p className="font-medium text-foreground">{s.studentName}</p>
          <p className="text-xs text-muted-foreground">{s.examTitle}</p>
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
          className={`font-mono text-sm font-bold ${s.trustScore >= 80
            ? 'text-success'
            : s.trustScore >= 60
              ? 'text-warning'
              : 'text-destructive'
            }`}
        >
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
            {s.riskScore.toFixed(0)}/100
          </span>
        </div>
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
    {
      key: 'inspect',
      header: 'Details',
      render: (s) => (
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleInspectCandidate(s);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          Inspect
        </Button>
      ),
    },
  ];

  const alertColumns: DataTableColumn<ProctorEventView>[] = [
    {
      key: 'event',
      header: 'Signal & Explanation',
      render: (ev) => {
        const origin = getEventOriginMeta(ev.eventOrigin, ev.isSimulated);
        return (
          <div className="max-w-md space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium text-foreground">
                {ev.eventType.replace(/_/g, ' ')}{' '}
                <span className="font-mono text-[11px] text-muted-foreground">({ev.sourceModule})</span>
              </p>
              <StatusBadge tone={origin.tone}>{origin.label}</StatusBadge>
              <StatusBadge tone={getEventReviewStatusTone(ev.reviewStatus)}>
                {ev.reviewStatus.replace(/_/g, ' ')}
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">
              {ev.studentName} • {ev.examTitle}
            </p>
            <p className="text-xs text-foreground/80 line-clamp-2">{ev.explanation}</p>
          </div>
        );
      },
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
        <span className="font-mono text-xs text-muted-foreground">
          {ev.confidence !== null ? `${Math.round(ev.confidence * 100)}%` : 'Rule Trigger'}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Detected',
      render: (ev) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortDateTime(ev.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Review',
      render: (ev) => {
        const session = data.sessions.find((s) => s.id === ev.sessionId);
        return (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!session}
            onClick={() => session && handleInspectCandidate(session, ev.id)}
          >
            <Eye className="h-3.5 w-3.5" />
            Open Event
          </Button>
        );
      },
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
          <div className="flex items-center gap-2">
            <StatusBadge tone="purple" pulse>
              Invigilation Active
            </StatusBadge>
            <StatusBadge
              tone={
                realtimeStatus === 'live'
                  ? 'success'
                  : realtimeStatus === 'reconnecting'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {realtimeStatus === 'live'
                ? 'Realtime Live'
                : realtimeStatus === 'reconnecting'
                  ? 'Reconnecting'
                  : 'Syncing Stream'}
            </StatusBadge>
          </div>
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
            <div className="rounded-lg border border-border bg-card p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Camera Connectivity
                  </h3>
                </div>
                <span className="font-mono text-sm font-bold text-primary">
                  {data.metrics.cameraTotalCount > 0 ? `${cameraPct}%` : 'No Sessions'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${cameraPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.metrics.cameraConnectedCount} of {data.metrics.cameraTotalCount} candidate
                sessions reporting active webcam telemetry.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-secondary" />
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Microphone Connectivity
                  </h3>
                </div>
                <span className="font-mono text-sm font-bold text-secondary">
                  {data.metrics.micTotalCount > 0 ? `${micPct}%` : 'No Sessions'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{ width: `${micPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.metrics.micConnectedCount} of {data.metrics.micTotalCount} candidate
                sessions reporting active acoustic baseline monitoring.
              </p>
            </div>
          </div>

          {/* 4-Panel Live Invigilator Command Centre */}
          <InvigilatorCommandCentre
            data={data}
            onInspectCandidate={handleInspectCandidate}
            onRefresh={refresh}
          />
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
          onRowClick={(s) => handleInspectCandidate(s)}
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
                  className={`rounded-md border px-2.5 py-1 text-xs uppercase font-mono cursor-pointer transition-colors ${severityFilter === sev
                    ? 'border-primary/40 bg-primary/10 text-primary font-semibold shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
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
            description: `${ev.examTitle} — ${ev.explanation}`,
            timestamp: formatShortDateTime(ev.occurredAt || ev.createdAt),
            severity: mapSeverityToTimeline(ev.severity),
            category:
              ev.sourceModule === 'mediapipe_face'
                ? 'camera'
                : ev.sourceModule === 'web_audio'
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
                  <p className="font-medium text-foreground">{rc.studentName}</p>
                  <p className="text-xs text-muted-foreground">{rc.examTitle}</p>
                </div>
              ),
            },
            {
              key: 'priority',
              header: 'Priority',
              render: (rc) => <span className="font-mono text-xs font-semibold text-primary">P{rc.priority}</span>,
            },
            {
              key: 'trust',
              header: 'Trust Score',
              render: (rc) => (
                <span className="font-mono text-xs font-bold text-warning">
                  {rc.trustScore.toFixed(0)}%
                </span>
              ),
            },
            {
              key: 'risk',
              header: 'Risk Category',
              render: (rc) => (
                <StatusBadge tone={getRiskCategoryTone(rc.riskCategory)}>
                  {formatRiskCategoryLabel(rc.riskCategory)}
                </StatusBadge>
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
          <ReportingWorkspace titlePrefix="Invigilation Reports & Incident Analytics" />

          <ChartCard
            title="Proctor Signal Severity Distribution"
            subtitle="Count of explainable events grouped by severity tier"
            isEmpty={data.proctorEvents.length === 0}
          >
            <DistributionBarChart data={alertBreakdown} valueLabel="Events" barColor="#176B5B" />
          </ChartCard>
        </div>
      )}

      <ReviewInspectionDrawer
        reviewCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onActionRecorded={refresh}
      />

      <CandidateDetailDrawer
        session={inspectedCandidate?.session ?? null}
        initialEventId={inspectedCandidate?.eventId ?? null}
        initialEvents={
          inspectedCandidate
            ? data.proctorEvents.filter((e) => e.sessionId === inspectedCandidate.session.id)
            : []
        }
        initialReviewCase={
          inspectedCandidate
            ? data.reviewCases.find((rc) => rc.sessionId === inspectedCandidate.session.id) ?? null
            : null
        }
        initialReviewActions={
          inspectedCandidate
            ? data.reviewActions.filter((a) => a.sessionId === inspectedCandidate.session.id)
            : []
        }
        onClose={() => setInspectedCandidate(null)}
        onUpdated={refresh}
      />
    </div>
  );
}

