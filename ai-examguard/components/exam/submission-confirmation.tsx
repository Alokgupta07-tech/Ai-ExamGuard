'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, FileCheck2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { ExamSubmissionReceipt } from '@/types/exam-session';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function SubmissionConfirmation({ receipt }: { receipt: ExamSubmissionReceipt }) {
  const unanswered = Math.max(0, receipt.totalQuestions - receipt.answeredCount);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <section
        aria-labelledby="submission-receipt-heading"
        className="w-full max-w-2xl rounded-lg border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border bg-sidebar px-6 py-5 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-success/35 bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground">{receipt.courseCode}</p>
              <h1
                id="submission-receipt-heading"
                className="font-heading text-xl font-semibold text-foreground"
              >
                Examination Submitted
              </h1>
            </div>
          </div>

          <StatusBadge tone="success" icon={<FileCheck2 className="h-3.5 w-3.5" />}>
            {receipt.autoSubmitted ? 'Submitted on time expiry' : 'Confirmed & recorded'}
          </StatusBadge>
        </div>

        <div className="px-6 py-6 sm:px-8 space-y-6">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Assessment</p>
            <p className="font-heading text-lg font-medium text-foreground">{receipt.examTitle}</p>
            <p className="text-sm text-muted-foreground">{receipt.courseName}</p>
          </div>

          {receipt.alreadySubmitted && (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
              Your attempt was already finalized earlier. No duplicate submission was recorded.
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-md border border-border bg-border overflow-hidden">
            <div className="bg-background px-4 py-3.5">
              <dt className="text-xs text-muted-foreground">Confirmation receipt</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-primary tabular-nums">
                {receipt.receiptCode}
              </dd>
            </div>
            <div className="bg-background px-4 py-3.5">
              <dt className="text-xs text-muted-foreground">Submitted at</dt>
              <dd className="mt-1 font-mono text-sm text-foreground tabular-nums">
                {formatTimestamp(receipt.submittedAt)}
              </dd>
            </div>
            <div className="bg-background px-4 py-3.5">
              <dt className="text-xs text-muted-foreground">Questions answered</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                {receipt.answeredCount} / {receipt.totalQuestions}
                {unanswered > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({unanswered} unanswered)
                  </span>
                )}
              </dd>
            </div>
            <div className="bg-background px-4 py-3.5">
              <dt className="text-xs text-muted-foreground">Session started</dt>
              <dd className="mt-1 font-mono text-sm text-foreground tabular-nums">
                {formatTimestamp(receipt.startedAt)}
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-3 rounded-md border border-border bg-sidebar px-4 py-3.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Answer keys remain sealed</p>
              <p className="text-xs leading-relaxed">
                Your responses have been stored securely in Supabase. Official marks and integrity
                review status appear in your Student Portal once released by your faculty.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/student/history">
                <Clock className="h-4 w-4" />
                View Exam History
              </Link>
            </Button>
            <Button asChild>
              <Link href="/student">
                Return to Student Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

