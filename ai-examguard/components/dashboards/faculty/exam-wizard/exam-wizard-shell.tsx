'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertPanel } from '@/components/shared/alert-panel';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { CreateCourseModal } from '@/components/dashboards/admin/admin-modals';
import {
  bootstrapExamWizardAction,
  getExamForEditorAction,
} from '@/lib/actions/exam-actions';
import { Step1Info } from '@/components/dashboards/faculty/exam-wizard/step-1-info';
import { Step2Questions } from '@/components/dashboards/faculty/exam-wizard/step-2-questions';
import { Step3Config } from '@/components/dashboards/faculty/exam-wizard/step-3-config';
import { Step4Assignments } from '@/components/dashboards/faculty/exam-wizard/step-4-assignments';
import { Step5Monitoring } from '@/components/dashboards/faculty/exam-wizard/step-5-monitoring';
import { Step6Preview } from '@/components/dashboards/faculty/exam-wizard/step-6-preview';
import { getExamStatusTone } from '@/lib/utils/dashboard-formatters';
import type { CourseOption, ExamEditorView } from '@/types/exam-engine';
import { cn } from '@/lib/utils';

const WIZARD_STEPS = [
  { id: 1, title: 'Exam information', short: 'Info' },
  { id: 2, title: 'Add questions', short: 'Questions' },
  { id: 3, title: 'Exam configuration', short: 'Config' },
  { id: 4, title: 'Student assignment', short: 'Students' },
  { id: 5, title: 'Monitoring settings', short: 'Monitoring' },
  { id: 6, title: 'Preview & publish', short: 'Publish' },
] as const;

export interface ExamWizardShellProps {
  initialExamId?: string;
}

/**
 * Six-step faculty examination authoring and editing wizard backed by server actions.
 */
export function ExamWizardShell({ initialExamId }: ExamWizardShellProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [exam, setExam] = useState<ExamEditorView | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'warning'; text: string } | null>(
    null
  );
  const [showCourseModal, setShowCourseModal] = useState(false);

  const loadWizardData = useCallback(async (targetExamId?: string) => {
    setLoading(true);
    setError(null);
    const bootRes = await bootstrapExamWizardAction();
    if (!bootRes.success) {
      setError(bootRes.error);
      setLoading(false);
      return;
    }
    setCourses(bootRes.data.courses);

    const effectiveId =
      targetExamId ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('examId') || undefined
        : undefined);

    if (effectiveId) {
      const exRes = await getExamForEditorAction(effectiveId);
      if (!exRes.success) {
        setError(exRes.error);
        setLoading(false);
        return;
      }
      setExam(exRes.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await loadWizardData(initialExamId);
    })();
    return () => {
      active = false;
    };
  }, [initialExamId, loadWizardData]);

  const handleExamUpdated = (updated: ExamEditorView, message?: string) => {
    setExam(updated);
    if (typeof window !== 'undefined' && !initialExamId) {
      window.history.replaceState(null, '', `/faculty/exams/${updated.id}/edit`);
    }
    if (message) {
      setBanner({ tone: 'success', text: message });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="stat-grid" count={4} />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to initialize examination editor"
        message={error}
        onRetry={() => loadWizardData(initialExamId)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam ? exam.title : 'Create New Examination'}
        description={
          exam
            ? `${exam.courseCode} · ${exam.courseName}`
            : 'Author exam metadata, MCQ question bank items, scoring configuration, roster assignments, and proctoring rules.'
        }
        badge={
          exam ? (
            <StatusBadge tone={getExamStatusTone(exam.status)} className="capitalize">
              {exam.status}
            </StatusBadge>
          ) : (
            <StatusBadge tone="cyan">New Draft</StatusBadge>
          )
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/faculty/exams">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to examinations
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCourseModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              New course
            </Button>
          </>
        }
      />

      {banner && (
        <AlertPanel
          tone={banner.tone}
          title={banner.tone === 'success' ? 'Saved' : 'Notice'}
          description={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      {courses.length === 0 && (
        <AlertPanel
          tone="warning"
          title="No assigned courses available"
          description="Create a course first before authoring an examination."
          action={
            <Button size="sm" onClick={() => setShowCourseModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create course
            </Button>
          }
        />
      )}

      {/* Compact Metrics Strip when Draft Exists */}
      {exam && (
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-border rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-border bg-card overflow-hidden">
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Questions</p>
            <p className="font-mono text-base font-semibold tabular-nums text-foreground">
              {exam.questions.length} MCQs
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Maximum / Pass Marks</p>
            <p className="font-mono text-base font-semibold tabular-nums text-foreground">
              {exam.totalPoints} / {exam.passingMarks} pts
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-mono text-base font-semibold tabular-nums text-foreground">
              {exam.durationMinutes} min
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Assigned Candidates</p>
            <p className="font-mono text-base font-semibold tabular-nums text-foreground">
              {exam.assignedStudentIds.length > 0
                ? `${exam.assignedStudentIds.length} targeted`
                : 'All enrolled'}
            </p>
          </div>
        </div>
      )}

      {/* 6-Step Stepper Bar */}
      <nav aria-label="Examination creation steps">
        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {WIZARD_STEPS.map((item) => {
            const unlocked = item.id === 1 || Boolean(exam);
            const active = step === item.id;
            const completed = Boolean(exam) && step > item.id;

            return (
              <li key={item.id} className="bg-card">
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) {
                      setBanner(null);
                      setStep(item.id);
                    }
                  }}
                  className={cn(
                    'w-full h-full px-3.5 py-3 text-left transition-colors flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-primary',
                    active && 'bg-primary/10 border-b-2 border-primary',
                    !active && unlocked && 'hover:bg-surface-elevated cursor-pointer',
                    !unlocked && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-mono font-semibold border',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : completed
                          ? 'border-success/50 bg-success/15 text-success'
                          : 'border-border bg-sidebar text-muted-foreground'
                    )}
                  >
                    {completed ? <Check className="h-3.5 w-3.5" /> : item.id}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-xs font-medium truncate',
                        active ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {item.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Active Step Workspace */}
      <div>
        {step === 1 && (
          <Step1Info
            courses={courses}
            exam={exam}
            onSaved={(updated, advance) => {
              handleExamUpdated(
                updated,
                exam ? 'Examination details updated.' : 'Draft examination created.'
              );
              if (advance) setStep(2);
            }}
          />
        )}

        {step === 2 && exam && (
          <Step2Questions
            exam={exam}
            onQuestionsChanged={(questions, totalPoints, msg) => {
              setExam((prev) =>
                prev
                  ? {
                      ...prev,
                      questions,
                      totalPoints,
                      passingMarks: Math.min(prev.passingMarks, totalPoints),
                    }
                  : prev
              );
              if (msg) setBanner({ tone: 'success', text: msg });
            }}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && exam && (
          <Step3Config
            exam={exam}
            onSaved={(updated, advance) => {
              handleExamUpdated(updated, 'Examination scoring & randomization settings saved.');
              if (advance) setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && exam && (
          <Step4Assignments
            exam={exam}
            onSaved={(assignedIds, advance) => {
              setExam((prev) => (prev ? { ...prev, assignedStudentIds: assignedIds } : prev));
              setBanner({
                tone: 'success',
                text:
                  assignedIds.length > 0
                    ? `Assigned ${assignedIds.length} candidate(s) to this examination.`
                    : 'Cleared explicit subset; all enrolled course students retain access.',
              });
              if (advance) setStep(5);
            }}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && exam && (
          <Step5Monitoring
            exam={exam}
            onSaved={(updated, advance) => {
              handleExamUpdated(updated, 'Monitoring & telemetry thresholds saved.');
              if (advance) setStep(6);
            }}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && exam && (
          <Step6Preview
            exam={exam}
            onExamUpdated={(updated, msg) => handleExamUpdated(updated, msg)}
            onJumpStep={(target) => setStep(target)}
            onBack={() => setStep(5)}
          />
        )}
      </div>

      <CreateCourseModal
        open={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        onSuccess={async (msg) => {
          setBanner({ tone: 'success', text: msg });
          const res = await bootstrapExamWizardAction();
          if (res.success) setCourses(res.data.courses);
        }}
      />
    </div>
  );
}
