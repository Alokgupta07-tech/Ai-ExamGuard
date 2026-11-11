'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  KeyRound,
  Loader2,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertPanel } from '@/components/shared/alert-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { Modal } from '@/components/shared/modal';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  getPublishPreviewAction,
  publishExamAction,
  updateExamStatusAction,
} from '@/lib/actions/exam-actions';
import { formatShortDateTime, getExamStatusTone } from '@/lib/utils/dashboard-formatters';
import type { ExamStatus } from '@/types/database';
import type { ExamEditorView, ExamPublishPreview } from '@/types/exam-engine';
import { cn } from '@/lib/utils';

interface Step6PreviewProps {
  exam: ExamEditorView;
  onExamUpdated: (exam: ExamEditorView, msg: string) => void;
  onJumpStep: (step: number) => void;
  onBack: () => void;
}

/**
 * Wizard Step 6: Server readiness checklist, candidate vs faculty paper preview, and publish confirmation.
 */
export function Step6Preview({
  exam,
  onExamUpdated,
  onJumpStep,
  onBack,
}: Step6PreviewProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<ExamPublishPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'candidate' | 'faculty'>('candidate');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await getPublishPreviewAction(exam.id);
      if (!active) return;
      if (!res.success) {
        setError(res.error);
      } else {
        setPreview(res.data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [exam.id, exam.questions.length, exam.totalPoints, exam.passingMarks, exam.durationMinutes]);

  const handleConfirmPublish = async () => {
    setError(null);
    setPublishing(true);
    const res = await publishExamAction(exam.id);
    setPublishing(false);
    setConfirmOpen(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onExamUpdated(res.data, 'Examination published and ready for scheduled delivery.');
    router.refresh();
  };

  const handleStatusTransition = async (nextStatus: ExamStatus) => {
    setError(null);
    setPublishing(true);
    const res = await updateExamStatusAction(exam.id, nextStatus);
    setPublishing(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onExamUpdated(res.data, `Examination status updated to ${nextStatus}.`);
  };

  if (loading) {
    return <LoadingSkeleton variant="card" count={2} />;
  }

  const blockingErrors = preview?.checks.filter((c) => c.level === 'error') || [];
  const warnings = preview?.checks.filter((c) => c.level === 'warning') || [];

  return (
    <div className="space-y-6">
      {error && (
        <AlertPanel
          tone="critical"
          title="Publish validation failed"
          description={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Server Readiness Card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Step 6 — Examination preview &amp; publish readiness
              </h2>
              <p className="text-xs text-muted-foreground">
                Verify paper formatting, scoring configuration, and publish status.
              </p>
            </div>
          </div>

          <StatusBadge tone={getExamStatusTone(exam.status)} className="capitalize">
            Status: {exam.status}
          </StatusBadge>
        </div>

        {/* Summary Specification Ledger */}
        {preview && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden">
            <div className="bg-sidebar p-3.5">
              <dt className="text-xs text-muted-foreground">Schedule window</dt>
              <dd className="text-xs font-medium text-foreground mt-1">
                {formatShortDateTime(preview.startTime)} to {formatShortDateTime(preview.endTime)}
              </dd>
            </div>
            <div className="bg-sidebar p-3.5">
              <dt className="text-xs text-muted-foreground">Timing &amp; marks</dt>
              <dd className="text-xs font-medium tabular-nums text-foreground mt-1 flex flex-wrap gap-x-2">
                <span>{preview.durationMinutes} min</span>
                <span>{preview.totalPoints} max ({preview.passingMarks} pass)</span>
              </dd>
            </div>
            <div className="bg-sidebar p-3.5">
              <dt className="text-xs text-muted-foreground">Policy &amp; shuffling</dt>
              <dd className="text-xs font-medium tabular-nums text-foreground mt-1 flex flex-wrap gap-x-2">
                <span>Neg {preview.negativeMarking}x</span>
                <span>Q {preview.shuffleQuestions ? 'Shuffle' : 'Fixed'}</span>
                <span>Opt {preview.shuffleOptions ? 'Shuffle' : 'Fixed'}</span>
              </dd>
            </div>
            <div className="bg-sidebar p-3.5">
              <dt className="text-xs text-muted-foreground">Proctoring &amp; cohort</dt>
              <dd className="text-xs font-medium tabular-nums text-foreground mt-1 flex flex-wrap gap-x-2">
                <span>Cam {preview.monitoring.requireCamera ? 'On' : 'Off'}</span>
                <span>Mic {preview.monitoring.requireAudio ? 'On' : 'Off'}</span>
                <span>
                  {preview.assignedStudentCount > 0
                    ? `${preview.assignedStudentCount} assigned`
                    : 'Course roster'}
                </span>
              </dd>
            </div>
          </dl>
        )}

        {/* Blocking Checks & Warnings */}
        {blockingErrors.length > 0 && (
          <div className="space-y-2">
            {blockingErrors.map((chk, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{chk.message}</span>
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onJumpStep(chk.field === 'questions' ? 2 : 3)}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warn, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-xs text-warning"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{warn.message}</span>
              </div>
            ))}
          </div>
        )}

        {blockingErrors.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-4 py-2.5 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              All server readiness rules pass. Candidate endpoints remain strictly stripped of answer keys.
            </span>
          </div>
        )}
      </div>

      {/* Full Examination Paper Preview */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sidebar px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">
              Examination Paper Preview ({exam.questions.length} Questions)
            </span>
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Preview visibility mode">
            <Button
              type="button"
              size="xs"
              variant={previewMode === 'candidate' ? 'default' : 'outline'}
              onClick={() => setPreviewMode('candidate')}
            >
              <Eye className="h-3.5 w-3.5" />
              Candidate view (No keys)
            </Button>
            <Button
              type="button"
              size="xs"
              variant={previewMode === 'faculty' ? 'default' : 'outline'}
              onClick={() => setPreviewMode('faculty')}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Faculty view (With keys)
            </Button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {exam.instructions && (
            <div className="rounded-md border border-border bg-sidebar p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Candidate instructions</p>
              <p className="whitespace-pre-line">{exam.instructions}</p>
            </div>
          )}

          {exam.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions authored yet. Return to Step 2 to add MCQ items.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {exam.questions.map((q, idx) => (
                <div key={q.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      Question {idx + 1} {q.category ? `(${q.category})` : ''}
                    </span>
                    <span className="tabular-nums">{q.points} marks</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{q.prompt}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={cn(
                          'rounded px-3 py-2 text-xs flex items-center gap-2',
                          previewMode === 'faculty' && opt.isCorrect
                            ? 'bg-success/15 text-foreground font-medium'
                            : 'bg-sidebar text-muted-foreground'
                        )}
                      >
                        <span className="font-mono text-primary font-semibold">{opt.label}.</span>
                        <span>{opt.content}</span>
                      </div>
                    ))}
                  </div>
                  {previewMode === 'faculty' && q.explanation && (
                    <p className="text-xs text-muted-foreground pt-1">
                      <strong className="text-foreground">Key rationale:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Lifecycle Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to monitoring settings
        </Button>

        <div className="flex flex-wrap items-center gap-2.5">
          {exam.status === 'draft' && (
            <Button
              type="button"
              disabled={publishing || blockingErrors.length > 0}
              onClick={() => setConfirmOpen(true)}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Publish examination
            </Button>
          )}

          {exam.status === 'published' && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={publishing}
                onClick={() => handleStatusTransition('draft')}
              >
                Revert to draft
              </Button>
              <Button
                type="button"
                disabled={publishing}
                onClick={() => handleStatusTransition('active')}
              >
                Open active window now
              </Button>
            </>
          )}

          {exam.status === 'active' && (
            <Button
              type="button"
              variant="outline"
              disabled={publishing}
              onClick={() => handleStatusTransition('completed')}
            >
              Mark completed
            </Button>
          )}
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Examination Publication"
        description="Once published, assigned examinees can view the examination schedule and instructions inside their student portal."
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={publishing} onClick={handleConfirmPublish}>
              {publishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm &amp; publish
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Examination:</strong> {exam.title} ({exam.courseCode})
          </p>
          <p>
            <strong className="text-foreground">Questions:</strong> {exam.questions.length} MCQs ·{' '}
            {exam.totalPoints} max marks (pass: {exam.passingMarks})
          </p>
          <p>
            <strong className="text-foreground">Answer-key safety:</strong> Protected inside{' '}
            <code>question_answer_keys</code> and excluded from candidate APIs.
          </p>
        </div>
      </Modal>
    </div>
  );
}
