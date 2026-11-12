'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Flag,
  FlaskConical,
  LayoutGrid,
  List,
  Megaphone,
  Mic,
  Radio,
  Search,
  Send,
  ShieldAlert,
  Wifi,
  XCircle,
} from 'lucide-react';
import { LiveKitRosterGrid } from './livekit-roster-grid';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatRiskCategoryLabel,
  formatShortDateTime,
  getEventOriginMeta,
  getEventReviewStatusTone,
  getRiskCategoryTone,
  getSessionStatusTone,
} from '@/lib/utils/dashboard-formatters';
import type { SessionStatus } from '@/types/database';
import type {
  InvigilatorDashboardPayload,
  ProctorEventView,
  SessionView,
} from '@/types/dashboard';
import type { EventOrigin, RiskCategory } from '@/types/proctoring';

const TABLE_PAGE_SIZE = 20;
const VIDEO_GRID_MAX_TILES = 12;

export interface CommandCentreProps {
  data: InvigilatorDashboardPayload;
  onInspectCandidate: (session: SessionView, focusedEventId?: string | null) => void;
  onRefresh: () => Promise<void> | void;
}

type BottomTab = 'timeline' | 'activity' | 'connection';
type QueueFilter = 'pending' | 'all';
type OriginFilter = 'all' | EventOrigin;
type SensorFilter = 'all' | 'disconnected';

const CONNECTION_EVENT_TYPES = new Set([
  'CAMERA_DISCONNECTED',
  'CAMERA_PERMISSION_DENIED',
  'MICROPHONE_DISCONNECTED',
  'MICROPHONE_PERMISSION_DENIED',
  'SESSION_CONNECTION_INTERRUPTED',
  'TAB_HIDDEN',
  'FULLSCREEN_EXIT',
  'TAB_SWITCH',
  'WINDOW_BLUR',
]);

/**
 * 4-region Invigilator Command Centre layout:
 * Left sidebar filters | Centre candidate roster & capped telemetry grid |
 * Right live alert queue | Bottom chronological timeline / session / connection logs.
 */
export function InvigilatorCommandCentre({
  data,
  onInspectCandidate,
  onRefresh,
}: CommandCentreProps) {
  const prefersReducedMotion = useReducedMotion();
  // Left sidebar filters
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<RiskCategory | 'all'>('all');
  const [sensorFilter, setSensorFilter] = useState<SensorFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Centre panel view & pagination (optimised for large exams)
  const [centreView, setCentreView] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);

  // Right live alert queue filters & quick backend mutation tracking
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Demo simulation harness (clearly tagged as Simulated Demo on backend)
  const [isSimulating, setIsSimulating] = useState(false);

  // Bottom panel tab
  const [bottomTab, setBottomTab] = useState<BottomTab>('timeline');

  // Top 5 Navigation Tabs (Reference Image 3 layout)
  type MainNavTab = 'live_proctoring' | 'summary' | 'critical_alerts' | 'pending_reviews' | 'event_history';
  const [activeNavTab, setActiveNavTab] = useState<MainNavTab>('live_proctoring');

  // LiveKit WebRTC state for live student surveillance
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitWsUrl, setLiveKitWsUrl] = useState<string | null>(null);
  const [_liveKitLoading, setLiveKitLoading] = useState(false);

  // Communication & Announcement state
  const [announcementText, setAnnouncementText] = useState('');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [announcementToast, setAnnouncementToast] = useState<string | null>(null);

  const effectiveExamId = selectedExamId !== 'all' ? selectedExamId : data.exams[0]?.id;

  React.useEffect(() => {
    if (!effectiveExamId) return;
    let cancelled = false;
    setLiveKitLoading(true);

    fetch('/api/monitoring/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: effectiveExamId,
        roleOverride: 'invigilator',
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.token) {
          setLiveKitToken(json.token);
          setLiveKitWsUrl(json.wsUrl);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLiveKitLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveExamId]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || !effectiveExamId) return;
    setIsSendingAnnouncement(true);
    setAnnouncementToast(null);
    try {
      const res = await fetch('/api/monitoring/support-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: effectiveExamId,
          messageType: 'broadcast_announcement',
          content: announcementText.trim(),
        }),
      });
      if (res.ok) {
        setAnnouncementText('');
        setAnnouncementToast('Announcement broadcast successfully to all active examinees.');
        setTimeout(() => setAnnouncementToast(null), 4000);
      }
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const sessionMap = useMemo(
    () => new Map(data.sessions.map((s) => [s.id, s])),
    [data.sessions]
  );

  // Filter candidates in Centre Panel
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.sessions.filter((s) => {
      if (selectedExamId !== 'all' && s.examId !== selectedExamId) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (riskFilter !== 'all' && s.riskCategory !== riskFilter) return false;
      if (
        sensorFilter === 'disconnected' &&
        s.hardwareStatus?.camera !== false &&
        s.hardwareStatus?.microphone !== false
      ) {
        return false;
      }
      if (q) {
        const hay = `${s.studentName} ${s.studentEmail} ${s.examTitle} ${s.courseCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.sessions, selectedExamId, statusFilter, riskFilter, sensorFilter, searchQuery]);

  // Prioritize active & higher-risk candidates for capped grid / top ordering
  const orderedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [filteredSessions]);

  const pageSize = centreView === 'grid' ? VIDEO_GRID_MAX_TILES : TABLE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(orderedSessions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedSessions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return orderedSessions.slice(start, start + pageSize);
  }, [orderedSessions, safePage, pageSize]);

  // Events scoped by exam & search
  const scopedEvents = useMemo(() => {
    const allowedSessions = new Set(filteredSessions.map((s) => s.id));
    const applySessionFilter =
      selectedExamId !== 'all' ||
      statusFilter !== 'all' ||
      riskFilter !== 'all' ||
      sensorFilter !== 'all' ||
      searchQuery.trim().length > 0;

    return data.proctorEvents.filter((ev) => {
      if (applySessionFilter && !allowedSessions.has(ev.sessionId)) return false;
      return true;
    });
  }, [
    data.proctorEvents,
    filteredSessions,
    selectedExamId,
    statusFilter,
    riskFilter,
    sensorFilter,
    searchQuery,
  ]);

  // Right Panel Live Alert Queue
  const queuedAlerts = useMemo(() => {
    return scopedEvents
      .filter((ev) => {
        if (queueFilter === 'pending' && ev.reviewStatus !== 'pending_review') return false;
        if (originFilter !== 'all' && ev.eventOrigin !== originFilter) return false;
        return true;
      })
      .slice(0, 30);
  }, [scopedEvents, queueFilter, originFilter]);

  // Bottom Panel Connection History
  const connectionEvents = useMemo(() => {
    return scopedEvents.filter(
      (ev) =>
        CONNECTION_EVENT_TYPES.has(ev.eventType) ||
        CONNECTION_EVENT_TYPES.has(String(ev.details?.phase8EventType || '')) ||
        CONNECTION_EVENT_TYPES.has(String(ev.details?.phase9EventType || ''))
    );
  }, [scopedEvents]);

  const examCounts = useMemo(() => {
    const counts = new Map<string, { active: number; total: number }>();
    for (const s of data.sessions) {
      const cur = counts.get(s.examId) ?? { active: 0, total: 0 };
      cur.total += 1;
      if (s.status === 'in_progress') cur.active += 1;
      counts.set(s.examId, cur);
    }
    return counts;
  }, [data.sessions]);

  const handleQuickEventDecision = async (
    ev: ProctorEventView,
    reviewStatus: 'dismissed' | 'flagged',
    escalate: boolean
  ) => {
    setBusyEventId(ev.id);
    setQueueError(null);
    try {
      const res = await fetch(`/api/monitoring/events/${ev.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus,
          escalate,
          reviewNote: escalate
            ? 'Escalated directly from Invigilator Command Centre live alert queue.'
            : 'Dismissed directly from Invigilator Command Centre live alert queue.',
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setQueueError(json.error ?? 'Failed to record alert review decision.');
        return;
      }
      await onRefresh();
    } catch {
      setQueueError('Network error while recording alert review action.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleTriggerSimulatedDemo = async () => {
    const targetSession = orderedSessions[0] ?? data.sessions[0];
    if (!targetSession) {
      setQueueError('No candidate session exists yet to attach a simulated demonstration alert.');
      return;
    }
    setIsSimulating(true);
    setQueueError(null);
    try {
      const res = await fetch('/api/monitoring/events/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: targetSession.id,
          eventType: 'MULTIPLE_FACES_DETECTED',
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setQueueError(json.error ?? 'Unable to trigger simulated demo alert.');
        return;
      }
      await onRefresh();
    } catch {
      setQueueError('Network error while sending simulated demo alert.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenAlert = (ev: ProctorEventView) => {
    const session = sessionMap.get(ev.sessionId);
    if (session) {
      onInspectCandidate(session, ev.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP HEADER: 5 Navigation Tabs & Live Surveillance Bar (Reference Image 3) */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'live_proctoring', label: 'Live Proctoring', icon: Radio },
              { id: 'summary', label: 'Examination Summary', icon: List },
              { id: 'critical_alerts', label: 'Critical Alerts', icon: ShieldAlert },
              { id: 'pending_reviews', label: 'Pending Reviews', icon: Flag },
              { id: 'event_history', label: 'Event History', icon: Activity },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isActive = activeNavTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveNavTab(t.id);
                  if (t.id === 'live_proctoring') setCentreView('grid');
                  if (t.id === 'summary') setCentreView('table');
                  if (t.id === 'critical_alerts') {
                    setRiskFilter('PRIORITY_REVIEW');
                    setQueueFilter('pending');
                  }
                  if (t.id === 'pending_reviews') setRiskFilter('REVIEW_SUGGESTED');
                  if (t.id === 'event_history') setBottomTab('timeline');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated/80'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {announcementToast && (
            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 animate-fade-in">
              {announcementToast}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-surface-elevated text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            LiveKit WebRTC Active
          </span>
        </div>
      </div>

      {/* Main 3-Column Real-Time Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT SIDEBAR: Active Exams, Search, Status & Candidate Filters */}
        <aside
          aria-label="Examination and candidate filters"
          className="xl:col-span-3 rounded-xl border border-border bg-card p-4 space-y-5"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" />
                Candidate Search
              </span>
              {(searchQuery ||
                selectedExamId !== 'all' ||
                statusFilter !== 'all' ||
                riskFilter !== 'all' ||
                sensorFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedExamId('all');
                    setStatusFilter('all');
                    setRiskFilter('all');
                    setSensorFilter('all');
                    setPage(1);
                  }}
                  className="text-[11px] font-mono text-primary hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Name, email, or exam..."
              aria-label="Search candidates or examinations"
            />
          </div>

          {/* Active Examinations */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Active Examinations ({data.exams.length})
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedExamId('all');
                  setPage(1);
                }}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  selectedExamId === 'all'
                    ? 'border-primary/40 bg-primary/10 text-foreground font-medium'
                    : 'border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>All Monitored Exams</span>
                <span className="font-mono text-[11px]">{data.sessions.length}</span>
              </button>

              {data.exams.map((ex) => {
                const counts = examCounts.get(ex.id) ?? { active: 0, total: ex.sessionCount };
                const active = selectedExamId === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setSelectedExamId(ex.id);
                      setPage(1);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate text-foreground">
                        {ex.title}
                      </span>
                      <span className="font-mono text-[11px] shrink-0 text-primary">
                        {counts.active}/{counts.total}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {ex.courseCode} • {ex.status}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Candidate Status Filter */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Candidate Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'not_started', label: 'Waiting' },
                  { id: 'submitted', label: 'Submitted' },
                  { id: 'under_review', label: 'Under Review' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(item.id);
                    setPage(1);
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    statusFilter === item.id
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Risk & Hardware Filters */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Candidate Filters
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Risk' },
                  { id: 'PRIORITY_REVIEW', label: 'Priority' },
                  { id: 'REVIEW_SUGGESTED', label: 'Review' },
                  { id: 'NORMAL', label: 'Normal' },
                ] as const
              ).map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => {
                    setRiskFilter(rf.id);
                    setPage(1);
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    riskFilter === rf.id
                      ? 'border-warning/50 bg-warning/15 text-warning'
                      : 'border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSensorFilter((prev) => (prev === 'all' ? 'disconnected' : 'all'));
                setPage(1);
              }}
              className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-left text-xs font-mono transition-colors cursor-pointer ${
                sensorFilter === 'disconnected'
                  ? 'border-destructive/50 bg-destructive/15 text-destructive'
                  : 'border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {sensorFilter === 'disconnected'
                ? 'Showing Sensor Disconnects Only'
                : 'Filter: Cam / Mic Disconnected'}
            </button>
          </div>
        </aside>

        {/* CENTRE PANEL: Candidate Monitoring Table + Optional Capped Telemetry Grid */}
        <section
          aria-label="Candidate monitoring roster"
          className="xl:col-span-5 rounded-xl border border-border bg-card p-4 space-y-4 min-w-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Candidate Monitoring
              </h2>
              <p className="text-xs text-muted-foreground">
                Showing {pagedSessions.length} of {orderedSessions.length} matched candidates
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCentreView('table');
                  setPage(1);
                }}
                aria-label="Candidate table view"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                  centreView === 'table'
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border bg-surface-elevated/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => {
                  setCentreView('grid');
                  setPage(1);
                }}
                aria-label="Optional telemetry grid view"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                  centreView === 'grid'
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border bg-surface-elevated/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Video / Sensor Grid
              </button>
            </div>
          </div>

          {centreView === 'grid' && (
            <div className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
              <span>
                Capped telemetry grid ({VIDEO_GRID_MAX_TILES} prioritized candidates/page). Edge AI
                runs on-device; continuous video streams are never broadcast for hundreds of
                candidates simultaneously.
              </span>
            </div>
          )}

          {pagedSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-elevated/30 p-8 text-center space-y-1.5">
              <Eye className="h-5 w-5 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No Matching Candidates</p>
              <p className="text-xs text-muted-foreground">
                Adjust examination, status, sensor, or risk filters in the left panel.
              </p>
            </div>
          ) : centreView === 'table' ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/70 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5">Candidate</th>
                    <th className="px-3 py-2.5">Sensors</th>
                    <th className="px-3 py-2.5">Progress</th>
                    <th className="px-3 py-2.5">Risk</th>
                    <th className="px-3 py-2.5">Strikes</th>
                    <th className="px-3 py-2.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70 text-xs">
                  {pagedSessions.map((s) => {
                    const qTotal = s.totalQuestionCount ?? 0;
                    const qAnswered = s.answeredCount ?? 0;
                    const pct =
                      qTotal > 0 ? Math.min(100, Math.round((qAnswered / qTotal) * 100)) : 0;
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-surface-elevated/50 transition-colors cursor-pointer"
                        onClick={() => onInspectCandidate(s)}
                      >
                        <td className="px-3 py-2.5 max-w-[170px]">
                          <p className="font-medium text-foreground truncate">{s.studentName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {s.courseCode} • {s.examTitle}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                                s.hardwareStatus?.camera ? 'text-success' : 'text-destructive'
                              }`}
                            >
                              <Camera className="h-3 w-3" />
                              {s.hardwareStatus?.camera ? 'Cam Live' : 'Cam Off'}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                                s.hardwareStatus?.microphone ? 'text-success' : 'text-warning'
                              }`}
                            >
                              <Mic className="h-3 w-3" />
                              {s.hardwareStatus?.microphone ? 'Mic Live' : 'Mic Off'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 min-w-[110px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                              <span>
                                {qTotal > 0 ? `${qAnswered}/${qTotal}` : s.status.replace(/_/g, ' ')}
                              </span>
                              <span>{qTotal > 0 ? `${pct}%` : ''}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <StatusBadge tone={getSessionStatusTone(s.status)}>
                              {s.status.replace(/_/g, ' ')}
                            </StatusBadge>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            <StatusBadge tone={getRiskCategoryTone(s.riskCategory)}>
                              {formatRiskCategoryLabel(s.riskCategory)}
                            </StatusBadge>
                            <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                              Trust {s.trustScore.toFixed(0)}%
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              {s.autoSubmitted ? (
                                <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                                  <ShieldAlert className="h-3 w-3" />
                                  3/3 Terminated
                                </span>
                              ) : (s.warningCount ?? 0) > 0 ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold ${
                                    (s.warningCount ?? 0) >= 2
                                      ? 'text-destructive'
                                      : 'text-warning'
                                  }`}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {s.warningCount ?? 0} / {s.maxWarnings ?? 3} Strikes
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0 / 3 Clean</span>
                              )}
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3].map((st) => (
                                <div
                                  key={st}
                                  className={`h-1.5 w-3.5 rounded-full ${
                                    (s.warningCount ?? 0) >= st
                                      ? (s.warningCount ?? 0) >= 3
                                        ? 'bg-destructive'
                                        : (s.warningCount ?? 0) === 2
                                          ? 'bg-warning'
                                          : 'bg-amber-400'
                                      : 'bg-muted/40'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectCandidate(s);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : liveKitToken && liveKitWsUrl && effectiveExamId ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LiveKit SFU Connected — Receiving real-time candidate video feeds
                </span>
                <span className="text-[11px] opacity-80">Room: exam_{effectiveExamId.slice(0, 8)}</span>
              </div>
              <LiveKitRosterGrid
                examId={effectiveExamId}
                token={liveKitToken}
                wsUrl={liveKitWsUrl}
                sessions={pagedSessions}
                onInspectCandidate={onInspectCandidate}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pagedSessions.map((s) => {
                const qTotal = s.totalQuestionCount ?? 0;
                const qAnswered = s.answeredCount ?? 0;
                const pct =
                  qTotal > 0 ? Math.min(100, Math.round((qAnswered / qTotal) * 100)) : 0;
                return (
                  <div
                    key={s.id}
                    onClick={() => onInspectCandidate(s)}
                    className="rounded-xl border border-border bg-surface-elevated/60 p-3 space-y-2.5 hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {s.studentName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.courseCode} • {s.examTitle}
                        </p>
                      </div>
                      <StatusBadge tone={getRiskCategoryTone(s.riskCategory)}>
                        {formatRiskCategoryLabel(s.riskCategory)}
                      </StatusBadge>
                    </div>

                    {/* Privacy-preserving simulated/status monitor viewport */}
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <Camera
                          className={`h-4 w-4 ${
                            s.hardwareStatus?.camera ? 'text-success' : 'text-destructive'
                          }`}
                        />
                        <span>{s.hardwareStatus?.camera ? 'Edge Cam OK' : 'Cam Offline'}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <Mic
                          className={`h-4 w-4 ${
                            s.hardwareStatus?.microphone ? 'text-success' : 'text-warning'
                          }`}
                        />
                        <span>{s.hardwareStatus?.microphone ? 'Mic OK' : 'Mic Off'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground">
                        Progress: {qTotal > 0 ? `${qAnswered}/${qTotal} (${pct}%)` : 'Pending'}
                      </span>
                      {s.autoSubmitted ? (
                        <span className="text-destructive font-semibold flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> Terminated (3/3)
                        </span>
                      ) : (s.warningCount ?? 0) > 0 ? (
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            (s.warningCount ?? 0) >= 2 ? 'text-destructive' : 'text-warning'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" /> {s.warningCount}/3 Strikes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Trust {s.trustScore.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Large Examination Pagination Controls */}
          {orderedSessions.length > pageSize && (
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="font-mono">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Live Alert Queue + Event Review Actions */}
        <section
          aria-label="Live alert queue"
          className="xl:col-span-4 rounded-xl border border-border bg-card p-4 space-y-3 min-w-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-warning" />
                Live Alert Queue
              </h2>
              <p className="text-xs text-muted-foreground">
                AI detections & simulated demo signals stay clearly separated
              </p>
            </div>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={isSimulating || data.sessions.length === 0}
              onClick={handleTriggerSimulatedDemo}
              title="Creates a clearly marked simulated demonstration alert via backend API"
            >
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              {isSimulating ? 'Simulating...' : 'Simulate Demo Alert'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Alerts' },
                  { id: 'pending', label: 'Pending' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQueueFilter(tab.id)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-mono cursor-pointer ${
                    queueFilter === tab.id
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border bg-surface-elevated/40 text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Origins' },
                  { id: 'ai_detection', label: 'AI Detections' },
                  { id: 'simulated_demo', label: 'Simulated' },
                ] as const
              ).map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setOriginFilter(org.id)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-mono cursor-pointer ${
                    originFilter === org.id
                      ? 'border-warning/50 bg-warning/15 text-warning'
                      : 'border-border bg-surface-elevated/40 text-muted-foreground'
                  }`}
                >
                  {org.label}
                </button>
              ))}
            </div>
          </div>

          {queueError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {queueError}
            </div>
          )}

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {queuedAlerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-elevated/30 p-6 text-center space-y-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">Alert Queue Clear</p>
                <p className="text-[11px] text-muted-foreground">
                  No alerts match your active queue filters.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {queuedAlerts.map((ev) => {
                  const origin = getEventOriginMeta(ev.eventOrigin, ev.isSimulated);
                  const borderAccent =
                    ev.severity === 'critical' || ev.severity === 'high'
                      ? 'border-l-destructive'
                      : ev.severity === 'medium'
                        ? 'border-l-warning'
                        : 'border-l-primary';
                  const isBusy = busyEventId === ev.id;
                  return (
                    <motion.div
                      key={ev.id}
                      layout={!prefersReducedMotion}
                      initial={prefersReducedMotion ? false : { opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, x: -12 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className={`rounded-xl border border-border border-l-4 ${borderAccent} bg-surface-elevated/70 p-3 space-y-2`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge
                            tone={
                              ev.severity === 'critical' || ev.severity === 'high'
                                ? 'critical'
                                : ev.severity === 'medium'
                                  ? 'warning'
                                  : 'teal'
                            }
                            pulse={ev.severity === 'critical' && ev.reviewStatus === 'pending_review'}
                          >
                            {ev.severity}
                          </StatusBadge>
                          <StatusBadge tone={origin.tone}>{origin.label}</StatusBadge>
                          <StatusBadge tone={getEventReviewStatusTone(ev.reviewStatus)}>
                            {ev.reviewStatus.replace(/_/g, ' ')}
                          </StatusBadge>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatShortDateTime(ev.occurredAt || ev.createdAt)}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {ev.eventType.replace(/_/g, ' ')} • {ev.studentName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {ev.explanation}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenAlert(ev)}
                        >
                          <Eye className="h-3 w-3" />
                          Open Event
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            disabled={isBusy}
                            onClick={() => handleQuickEventDecision(ev, 'dismissed', false)}
                          >
                            <XCircle className="h-3 w-3" />
                            Dismiss
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="destructive"
                            disabled={isBusy}
                            onClick={() => handleQuickEventDecision(ev, 'flagged', true)}
                          >
                            <Flag className="h-3 w-3" />
                            Escalate
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Invigilator Communication & Announcement Panel */}
          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-primary" />
                Exam Announcement & Support
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Broadcast</span>
            </div>
            <form onSubmit={handleSendAnnouncement} className="space-y-2">
              <Input
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Broadcast official notice to all candidates..."
                className="text-xs h-8 bg-surface-elevated/60"
                disabled={isSendingAnnouncement}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">
                  Audit-logged to examination security record.
                </p>
                <Button
                  type="submit"
                  size="xs"
                  disabled={isSendingAnnouncement || !announcementText.trim()}
                  className="gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  Broadcast
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* BOTTOM PANEL: Examination Event Timeline | Session Activity | Connection History */}
      <section
        aria-label="Monitoring activity and connection history"
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                {
                  id: 'timeline',
                  label: `Examination Event Timeline (${scopedEvents.length})`,
                  icon: Activity,
                },
                {
                  id: 'activity',
                  label: `Session Activity (${data.reviewActions.length + orderedSessions.length})`,
                  icon: Clock,
                },
                {
                  id: 'connection',
                  label: `Connection History (${connectionEvents.length})`,
                  icon: Wifi,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = bottomTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBottomTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            Scoped by active left-sidebar filters
          </span>
        </div>

        {bottomTab === 'timeline' && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {scopedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No examination timeline events recorded under the current filters.
              </p>
            ) : (
              scopedEvents.slice(0, 40).map((ev) => {
                const origin = getEventOriginMeta(ev.eventOrigin, ev.isSimulated);
                return (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-2.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {ev.studentName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {ev.eventType.replace(/_/g, ' ')}
                        </span>
                        <StatusBadge tone={origin.tone}>{origin.label}</StatusBadge>
                        <StatusBadge tone={getEventReviewStatusTone(ev.reviewStatus)}>
                          {ev.reviewStatus.replace(/_/g, ' ')}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ev.explanation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatShortDateTime(ev.occurredAt || ev.createdAt)}
                      </span>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => handleOpenAlert(ev)}
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {bottomTab === 'activity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {orderedSessions.slice(0, 12).map((s) => (
              <div
                key={`act-${s.id}`}
                onClick={() => onInspectCandidate(s)}
                className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {s.studentName} — {s.examTitle}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Started {formatShortDateTime(s.startedAt || s.createdAt)}
                    {s.submittedAt ? ` • Submitted ${formatShortDateTime(s.submittedAt)}` : ''}
                  </p>
                </div>
                <StatusBadge tone={getSessionStatusTone(s.status)}>
                  {s.status.replace(/_/g, ' ')}
                </StatusBadge>
              </div>
            ))}
            {data.reviewActions.slice(0, 12).map((act) => (
              <div
                key={act.id}
                className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {act.reviewerName} • {act.actionType.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatShortDateTime(act.createdAt)}
                  </span>
                </div>
                {act.message && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{act.message}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {bottomTab === 'connection' && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {connectionEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                All candidate camera, microphone, and network streams are stable (no connection
                drops recorded).
              </p>
            ) : (
              connectionEvents.slice(0, 30).map((ev) => (
                <div
                  key={`conn-${ev.id}`}
                  className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Wifi className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span className="font-medium text-foreground">{ev.studentName}</span>
                    <StatusBadge tone="warning">{ev.eventType.replace(/_/g, ' ')}</StatusBadge>
                    <span className="text-muted-foreground truncate max-w-md">
                      {ev.explanation}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    {formatShortDateTime(ev.occurredAt || ev.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

