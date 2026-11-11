'use client';

import React, { useState } from 'react';
import { CheckCircle2, Flag, ShieldAlert, Send, Loader2 } from 'lucide-react';
import { ReviewDrawer } from '@/components/shared/review-drawer';
import { StatusBadge } from '@/components/shared/status-badge';
import { EventTimeline } from '@/components/shared/event-timeline';
import { AlertPanel } from '@/components/shared/alert-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { recordReviewAction } from '@/lib/actions/dashboard-actions';
import {
  formatShortDateTime,
  getReviewStatusTone,
  mapSeverityToTimeline,
} from '@/lib/utils/dashboard-formatters';
import type { ReviewActionType, ReviewStatus } from '@/types/database';
import type { ReviewCaseView } from '@/types/dashboard';

export interface ReviewInspectionDrawerProps {
  reviewCase: ReviewCaseView | null;
  onClose: () => void;
  onActionRecorded: () => Promise<void> | void;
}

/**
 * Shared human-in-the-loop review inspection drawer for Invigilators and Faculty.
 */
export function ReviewInspectionDrawer({
  reviewCase,
  onClose,
  onActionRecorded,
}: ReviewInspectionDrawerProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async (actionType: ReviewActionType, newStatus: ReviewStatus) => {
    if (!reviewCase) return;
    setIsSubmitting(true);
    setError(null);

    const res = await recordReviewAction({
      reviewCaseId: reviewCase.id,
      sessionId: reviewCase.sessionId,
      actionType,
      newStatus,
      message:
        note.trim() ||
        `Human review decision logged: ${actionType.replace(/_/g, ' ').toLowerCase()}.`,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setNote('');
    await onActionRecorded();
    onClose();
  };

  return (
    <ReviewDrawer
      open={Boolean(reviewCase)}
      onClose={onClose}
      title={reviewCase ? reviewCase.studentName : 'Review Case'}
      subtitle={
        reviewCase
          ? `${reviewCase.courseCode} • ${reviewCase.examTitle} • ${reviewCase.studentEmail}`
          : undefined
      }
      badge={
        reviewCase ? (
          <StatusBadge tone={getReviewStatusTone(reviewCase.status)}>
            {reviewCase.status.replace(/_/g, ' ')}
          </StatusBadge>
        ) : undefined
      }
      footer={
        reviewCase && (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleDecision('CASE_CLEARED', 'cleared')}
              className="border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Clear Case
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleDecision('WARNING_SENT', 'in_review')}
                className="border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10"
              >
                <Send className="h-3.5 w-3.5" />
                Log Warning
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleDecision('CASE_ESCALATED', 'escalated')}
              >
                <Flag className="h-3.5 w-3.5" />
                Escalate
              </Button>
            </div>
          </div>
        )
      }
    >
      {reviewCase && (
        <>
          <AlertPanel
            tone="info"
            title="Human-in-the-Loop Verification"
            description="Automated AI signals never auto-disqualify students. Review chronological indicators before logging a formal adjudication."
          />

          {error && <AlertPanel tone="critical" title="Action Failed" description={error} />}

          {/* Case Metadata Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-3">
              <p className="text-[11px] font-mono uppercase text-[#94A3B8]">Trust Score</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#F8FAFC]">
                {reviewCase.trustScore.toFixed(0)}%
              </p>
            </div>
            <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-3">
              <p className="text-[11px] font-mono uppercase text-[#94A3B8]">Priority</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#38BDF8]">
                P{reviewCase.priority}
              </p>
            </div>
            <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-3">
              <p className="text-[11px] font-mono uppercase text-[#94A3B8]">Signals</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#F8FAFC]">
                {reviewCase.events.length}
              </p>
            </div>
          </div>

          {reviewCase.summary && (
            <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-4 space-y-1">
              <p className="text-xs font-mono uppercase text-[#94A3B8]">Case Summary</p>
              <p className="text-sm text-[#F8FAFC]">{reviewCase.summary}</p>
            </div>
          )}

          {/* Explainable Telemetry Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#38BDF8]" />
                Explainable Event Timeline
              </h3>
              <span className="text-xs font-mono text-[#94A3B8]">
                Opened {formatShortDateTime(reviewCase.createdAt)}
              </span>
            </div>

            <EventTimeline
              events={reviewCase.events.map((ev) => ({
                id: ev.id,
                title: ev.eventType.replace(/_/g, ' '),
                description:
                  (ev.details?.reason as string | undefined) ||
                  `Detected ${ev.eventType.replace(/_/g, ' ').toLowerCase()} during session.`,
                timestamp: formatShortDateTime(ev.createdAt),
                severity: mapSeverityToTimeline(ev.severity),
                category:
                  ev.eventType.includes('FACE')
                    ? 'camera'
                    : ev.eventType.includes('AUDIO')
                    ? 'audio'
                    : 'browser',
                metadata: {
                  ...(ev.confidence !== null ? { confidence: ev.confidence.toFixed(2) } : {}),
                },
              }))}
              emptyTitle="No proctor events on this case"
              emptyDescription="No individual anomaly telemetry events were attached to this session."
            />
          </div>

          {/* Reviewer Notes */}
          <div className="space-y-2">
            <Label htmlFor="reviewer-note">Invigilator Adjudication Note</Label>
            <textarea
              id="reviewer-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Document context or rationale for clearing, warning, or escalating..."
              className="w-full rounded-lg border border-[#243249] bg-[#111B2D] p-3 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#38BDF8] focus:outline-none"
            />
          </div>
        </>
      )}
    </ReviewDrawer>
  );
}

