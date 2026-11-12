'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  Flag,
  History,
  Loader2,
  Mic,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ReviewDrawer } from '@/components/shared/review-drawer';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertPanel } from '@/components/shared/alert-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { recordReviewAction } from '@/lib/actions/dashboard-actions';
import {
  formatRiskCategoryLabel,
  formatShortDateTime,
  getEventOriginMeta,
  getEventReviewStatusTone,
  getReviewStatusTone,
  getRiskCategoryTone,
  getSessionStatusTone,
} from '@/lib/utils/dashboard-formatters';
import type {
  ProctorEventView,
  ReviewActionHistoryEntry,
  ReviewCaseView,
  SessionView,
} from '@/types/dashboard';
import type { EventReviewStatus } from '@/types/proctoring';

interface SessionDetailResponse {
  session: SessionView;
  events: ProctorEventView[];
  reviewCase: ReviewCaseView | null;
  reviewActions: ReviewActionHistoryEntry[];
}

export interface CandidateDetailDrawerProps {
  session: SessionView | null;
  initialEventId?: string | null;
  initialEvents?: ProctorEventView[];
  initialReviewCase?: ReviewCaseView | null;
  initialReviewActions?: ReviewActionHistoryEntry[];
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

type DrawerTab = 'events' | 'evidence' | 'history';

/**
 * Real-time Candidate Detail & Event Review Drawer for the Invigilator Command Centre.
 * Backed by Supabase session/event endpoints for notes, dismissal, escalation, and review history.
 */
export function CandidateDetailDrawer({
  session,
  initialEventId = null,
  initialEvents = [],
  initialReviewCase = null,
  initialReviewActions = [],
  onClose,
  onUpdated,
}: CandidateDetailDrawerProps) {
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('events');
  const [selectionOverride, setSelectionOverride] = useState<{
    sessionId: string;
    eventId: string;
  } | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: 'success' | 'critical';
    message: string;
  } | null>(null);

  const sessionId = session?.id ?? null;

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const loadSessionDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const res = await fetch(`/api/monitoring/sessions/${sessionId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as SessionDetailResponse;
        if (!cancelled) {
          setDetail(json);
        }
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    };

    void loadSessionDetail();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const resolvedDetail = detail && detail.session.id === sessionId ? detail : null;
  const activeSession = resolvedDetail?.session ?? session;
  const events = resolvedDetail?.events ?? initialEvents;
  const reviewCase = resolvedDetail ? resolvedDetail.reviewCase : initialReviewCase;
  const reviewActions = resolvedDetail?.reviewActions ?? initialReviewActions;

  const activeEventId =
    selectionOverride && selectionOverride.sessionId === sessionId
      ? selectionOverride.eventId
      : initialEventId;

  const focusedEvent =
    events.find((e) => e.id === activeEventId) ?? events[0] ?? null;

  const refreshDetail = async () => {
    if (!sessionId) return;
    const res = await fetch(`/api/monitoring/sessions/${sessionId}`, { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as SessionDetailResponse;
      setDetail(json);
    }
    await onUpdated();
  };

  const handleEventReview = async (
    event: ProctorEventView,
    reviewStatus: EventReviewStatus,
    escalate = false
  ) => {
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const trimmedNote = note.trim();
      const res = await fetch(`/api/monitoring/events/${event.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus,
          reviewNote: trimmedNote.length > 0 ? trimmedNote : null,
          escalate,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionFeedback({
          tone: 'critical',
          message: json.error ?? 'Failed to record event review decision.',
        });
        return;
      }

      setNote('');
      setActionFeedback({
        tone: 'success',
        message: escalate
          ? `Escalated ${event.eventType.replace(/_/g, ' ')} and updated review case.`
          : `Event marked ${reviewStatus.replace(/_/g, ' ')} cleanly.`,
      });
      await refreshDetail();
    } catch {
      setActionFeedback({
        tone: 'critical',
        message: 'Network error while persisting event review action.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaseClear = async () => {
    if (!reviewCase || !activeSession) return;
    setIsSubmitting(true);
    setActionFeedback(null);
    const res = await recordReviewAction({
      reviewCaseId: reviewCase.id,
      sessionId: activeSession.id,
      actionType: 'CASE_CLEARED',
      newStatus: 'cleared',
      message: note.trim() || 'Cleared session after invigilator timeline review.',
    });
    setIsSubmitting(false);
    if (!res.success) {
      setActionFeedback({ tone: 'critical', message: res.error });
      return;
    }
    setNote('');
    setActionFeedback({ tone: 'success', message: 'Review case marked as cleared.' });
    await refreshDetail();
  };

  const progressTotal = activeSession?.totalQuestionCount ?? 0;
  const progressAnswered = activeSession?.answeredCount ?? 0;
  const progressPct =
    progressTotal > 0 ? Math.min(100, Math.round((progressAnswered / progressTotal) * 100)) : 0;

  return (
    <ReviewDrawer
      open={Boolean(activeSession)}
      onClose={onClose}
      widthClassName="max-w-2xl"
      title={activeSession ? activeSession.studentName : 'Candidate Detail'}
      subtitle={
        activeSession
          ? `${activeSession.studentEmail} • ${activeSession.courseCode} • ${activeSession.examTitle}`
          : undefined
      }
      badge={
        activeSession ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={getSessionStatusTone(activeSession.status)}>
              {activeSession.status.replace(/_/g, ' ')}
            </StatusBadge>
            <StatusBadge tone={getRiskCategoryTone(activeSession.riskCategory)}>
              {formatRiskCategoryLabel(activeSession.riskCategory)}
            </StatusBadge>
            {reviewCase && (
              <StatusBadge tone={getReviewStatusTone(reviewCase.status)}>
                Case: {reviewCase.status.replace(/_/g, ' ')}
              </StatusBadge>
            )}
          </div>
        ) : undefined
      }
      footer={
        activeSession && (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="text-xs text-muted-foreground font-mono">
              Session ID: {activeSession.id.slice(0, 8)}...
              {isLoadingDetail ? ' • Syncing live detail...' : ''}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reviewCase && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleCaseClear}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Clear Case
                </Button>
              )}
              {focusedEvent && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleEventReview(focusedEvent, 'dismissed', false)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Mark Dismissed
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => handleEventReview(focusedEvent, 'flagged', true)}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Flag className="h-3.5 w-3.5" />
                    )}
                    Escalate
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      }
    >
      {activeSession && (
        <div className="space-y-5">
          {actionFeedback && (
            <AlertPanel
              tone={actionFeedback.tone === 'success' ? 'success' : 'critical'}
              title={actionFeedback.tone === 'success' ? 'Review Logged' : 'Action Failed'}
              description={actionFeedback.message}
              onDismiss={() => setActionFeedback(null)}
            />
          )}

          {/* Integrity Strike Alert Banner if warnings recorded */}
          {((activeSession.warningCount ?? 0) > 0 || activeSession.autoSubmitted) && (
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                activeSession.autoSubmitted
                  ? 'border-destructive/40 bg-destructive/10'
                  : (activeSession.warningCount ?? 0) >= 2
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-warning/30 bg-warning/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    className={`h-5 w-5 ${
                      activeSession.autoSubmitted || (activeSession.warningCount ?? 0) >= 2
                        ? 'text-destructive'
                        : 'text-warning'
                    }`}
                  />
                  <span className="font-semibold text-sm text-foreground">
                    {activeSession.autoSubmitted
                      ? 'Session Auto-Submitted on Strike 3'
                      : `Candidate Has ${activeSession.warningCount ?? 0} of ${activeSession.maxWarnings ?? 3} Integrity Warnings`}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((st) => (
                    <div
                      key={st}
                      className={`h-2 w-5 rounded-full ${
                        (activeSession.warningCount ?? 0) >= st
                          ? (activeSession.warningCount ?? 0) >= 3
                            ? 'bg-destructive'
                            : (activeSession.warningCount ?? 0) === 2
                              ? 'bg-warning'
                              : 'bg-amber-400'
                          : 'bg-muted/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {activeSession.autoSubmissionReason && (
                <p className="text-xs text-muted-foreground font-mono">
                  Termination Reason: {activeSession.autoSubmissionReason}
                </p>
              )}
            </div>
          )}

          {/* Student, Session & Hardware Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-1">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">Camera</p>
              <div className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" />
                <StatusBadge tone={activeSession.hardwareStatus?.camera ? 'success' : 'critical'}>
                  {activeSession.hardwareStatus?.camera ? 'Connected' : 'Disconnected'}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-1">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">Microphone</p>
              <div className="flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-primary" />
                <StatusBadge
                  tone={activeSession.hardwareStatus?.microphone ? 'success' : 'warning'}
                >
                  {activeSession.hardwareStatus?.microphone ? 'Connected' : 'Muted / Lost'}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-1">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">
                Exam Progress
              </p>
              <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
                {progressTotal > 0 ? `${progressAnswered}/${progressTotal} (${progressPct}%)` : '—'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-1">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">
                Trust / Risk
              </p>
              <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
                {activeSession.trustScore.toFixed(0)}% / {activeSession.riskScore.toFixed(0)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-1">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">
                Warnings / Strikes
              </p>
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  (activeSession.warningCount ?? 0) >= 3
                    ? 'text-destructive'
                    : (activeSession.warningCount ?? 0) >= 1
                      ? 'text-warning'
                      : 'text-foreground'
                }`}
              >
                {activeSession.warningCount ?? 0} / {activeSession.maxWarnings ?? 3}
              </p>
            </div>
          </div>

          {/* Focused Event Inspector + Direct Review Controls */}
          {focusedEvent ? (
            <div className="rounded-xl border border-primary/30 bg-surface-elevated/80 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-mono uppercase text-primary flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      Selected Event Inspection
                    </span>
                    <StatusBadge
                      tone={getEventOriginMeta(focusedEvent.eventOrigin, focusedEvent.isSimulated).tone}
                    >
                      {getEventOriginMeta(focusedEvent.eventOrigin, focusedEvent.isSimulated).label}
                    </StatusBadge>
                    <StatusBadge tone={getEventReviewStatusTone(focusedEvent.reviewStatus)}>
                      {focusedEvent.reviewStatus.replace(/_/g, ' ')}
                    </StatusBadge>
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {focusedEvent.eventType.replace(/_/g, ' ')}
                  </h3>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatShortDateTime(focusedEvent.occurredAt || focusedEvent.createdAt)}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-foreground/90">
                {focusedEvent.explanation}
              </p>

              <div className="flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
                <span className="rounded bg-background/60 px-2 py-0.5 border border-border">
                  Module: {focusedEvent.sourceModule}
                </span>
                {focusedEvent.modelVersion && (
                  <span className="rounded bg-background/60 px-2 py-0.5 border border-border">
                    Model: {focusedEvent.modelVersion}
                  </span>
                )}
                {focusedEvent.durationMs !== null && (
                  <span className="rounded bg-background/60 px-2 py-0.5 border border-border">
                    Duration: {(focusedEvent.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
                {focusedEvent.confidence !== null && (
                  <span className="rounded bg-background/60 px-2 py-0.5 border border-border">
                    Client Signal Conf: {(focusedEvent.confidence * 100).toFixed(0)}% (untrusted)
                  </span>
                )}
              </div>

              {focusedEvent.reviewNote && (
                <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-foreground">
                  <span className="font-mono uppercase text-muted-foreground mr-1.5">
                    Latest Reviewer Note:
                  </span>
                  {focusedEvent.reviewNote}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <Label htmlFor="drawer-event-note" className="text-xs">
                  Add Reviewer Note (persisted with your action)
                </Label>
                <textarea
                  id="drawer-event-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Document observation, technical explanation, or escalation reason..."
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleEventReview(focusedEvent, 'acknowledged', false)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Save Note & Acknowledge
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleEventReview(focusedEvent, 'dismissed', false)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Mark Dismissed
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => handleEventReview(focusedEvent, 'flagged', true)}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Escalate to Review Case
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <AlertPanel
              tone="info"
              title="Clean Session Baseline"
              description="No anomaly or simulated alerts have been logged for this candidate session."
            />
          )}

          {/* Drawer Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            {(
              [
                { id: 'events', label: `Event History (${events.length})`, icon: Activity },
                { id: 'evidence', label: 'Evidence & Correlations', icon: ShieldAlert },
                { id: 'history', label: `Review History (${reviewActions.length})`, icon: History },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'events' && (
            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No proctor events recorded for this candidate yet.
                </p>
              ) : (
                events.map((ev) => {
                  const isSelected = focusedEvent?.id === ev.id;
                  const origin = getEventOriginMeta(ev.eventOrigin, ev.isSimulated);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() =>
                        sessionId && setSelectionOverride({ sessionId, eventId: ev.id })
                      }
                      className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border bg-surface-elevated/50 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {ev.eventType.replace(/_/g, ' ')}
                          </span>
                          <StatusBadge tone={origin.tone}>{origin.label}</StatusBadge>
                          <StatusBadge tone={getEventReviewStatusTone(ev.reviewStatus)}>
                            {ev.reviewStatus.replace(/_/g, ' ')}
                          </StatusBadge>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatShortDateTime(ev.occurredAt || ev.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {ev.explanation}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {activeSession.riskAssessment && (
                <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
                  <p className="text-xs font-mono uppercase text-muted-foreground">
                    Contextual Assessment Summary
                  </p>
                  <p className="text-sm text-foreground">
                    {activeSession.riskAssessment.summaryExplanation}
                  </p>

                  {activeSession.riskAssessment.correlations.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-mono uppercase text-warning">
                        Temporal Correlations Detected
                      </p>
                      <ul className="space-y-1.5">
                        {activeSession.riskAssessment.correlations.map((corr) => (
                          <li
                            key={corr.ruleId}
                            className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground"
                          >
                            <span className="font-semibold">{corr.title}:</span> {corr.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeSession.riskAssessment.contextualIndicators.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-mono uppercase text-muted-foreground">
                        Contextual Risk Indicators
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSession.riskAssessment.contextualIndicators.map((ind) => (
                          <StatusBadge
                            key={ind.code}
                            tone={
                              ind.impact === 'elevated'
                                ? 'warning'
                                : ind.impact === 'mitigating'
                                  ? 'success'
                                  : 'neutral'
                            }
                            title={ind.detail}
                          >
                            {ind.label}
                          </StatusBadge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-2">
                <p className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Associated Edge Telemetry Evidence
                </p>
                <p className="text-xs text-muted-foreground">
                  Privacy-preserving design: continuous webcam video and raw audio recordings are never
                  uploaded. Structured sensor telemetry metadata for the selected event is shown below.
                </p>
                {focusedEvent ? (
                  <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-background/70 p-3 font-mono text-[11px] text-foreground/90">
                    {JSON.stringify(
                      {
                        eventId: focusedEvent.id,
                        clientEventId: focusedEvent.clientEventId,
                        eventOrigin: focusedEvent.eventOrigin,
                        isSimulated: focusedEvent.isSimulated,
                        sourceModule: focusedEvent.sourceModule,
                        modelVersion: focusedEvent.modelVersion,
                        durationMs: focusedEvent.durationMs,
                        evidenceFields: Object.fromEntries(
                          Object.entries(focusedEvent.details ?? {}).filter(
                            ([k]) =>
                              ![
                                'canonicalEvent',
                                'untrustedClientInput',
                                'serverRiskEvaluation',
                              ].includes(k)
                          )
                        ),
                      },
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">Select an event to inspect metadata.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {reviewActions.length === 0 &&
              (!focusedEvent ||
                !Array.isArray(focusedEvent.details?.reviewHistory) ||
                focusedEvent.details.reviewHistory.length === 0) ? (
                <div className="rounded-xl border border-border bg-surface-elevated p-5 text-center space-y-1">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No reviewer notes, dismissals, or escalations have been logged for this candidate yet.
                  </p>
                </div>
              ) : (
                <>
                  {focusedEvent &&
                    Array.isArray(focusedEvent.details?.reviewHistory) &&
                    (focusedEvent.details.reviewHistory as Array<Record<string, unknown>>).length >
                      0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-mono uppercase text-muted-foreground">
                          Event Review Trail ({focusedEvent.eventType.replace(/_/g, ' ')})
                        </p>
                        {(focusedEvent.details.reviewHistory as Array<Record<string, unknown>>).map(
                          (item, idx) => (
                            <div
                              key={`${focusedEvent.id}-hist-${idx}`}
                              className="rounded-lg border border-border bg-surface-elevated p-3 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">
                                  {String(item.reviewerName || 'Invigilator')} •{' '}
                                  {String(item.reviewStatus || '').replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {formatShortDateTime(String(item.reviewedAt || ''))}
                                </span>
                              </div>
                              {Boolean(item.reviewNote) && (
                                <p className="text-muted-foreground">{String(item.reviewNote)}</p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {reviewActions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-mono uppercase text-muted-foreground">
                        Session & Review Case Audit Log
                      </p>
                      {reviewActions.map((act) => (
                        <div
                          key={act.id}
                          className="rounded-lg border border-border bg-surface-elevated p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{act.reviewerName}</span>
                              <StatusBadge
                                tone={
                                  act.actionType === 'CASE_ESCALATED'
                                    ? 'critical'
                                    : act.actionType === 'CASE_CLEARED'
                                      ? 'success'
                                      : 'info'
                                }
                              >
                                {act.actionType.replace(/_/g, ' ')}
                              </StatusBadge>
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {formatShortDateTime(act.createdAt)}
                            </span>
                          </div>
                          {act.message && <p className="text-muted-foreground">{act.message}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </ReviewDrawer>
  );
}
