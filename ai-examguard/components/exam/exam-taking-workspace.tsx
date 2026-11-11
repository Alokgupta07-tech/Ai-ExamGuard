'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Loader2, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/modal';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { ExamTopBar, type SaveSyncStatus } from '@/components/exam/exam-top-bar';
import { QuestionNavigator } from '@/components/exam/question-navigator';
import { QuestionStage } from '@/components/exam/question-stage';
import { ExamBottomBar } from '@/components/exam/exam-bottom-bar';
import { SubmissionConfirmation } from '@/components/exam/submission-confirmation';
import type { StudentExamPaper } from '@/types/exam-engine';
import type {
  ActiveExamSessionState,
  ExamSubmissionReceipt,
  StudentExamSessionBootstrap,
} from '@/types/exam-session';

interface OutboxRecord {
  answers: Record<string, string | null>;
}

function getOutboxKey(examId: string, sessionId: string): string {
  return `examguard_outbox:${examId}:${sessionId}`;
}

function readOutbox(examId: string, sessionId: string): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getOutboxKey(examId, sessionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OutboxRecord;
    return parsed?.answers && typeof parsed.answers === 'object' ? parsed.answers : {};
  } catch {
    return {};
  }
}

function writeOutbox(
  examId: string,
  sessionId: string,
  entries: Map<string, string | null>
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getOutboxKey(examId, sessionId);
    if (entries.size === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const obj: Record<string, string | null> = {};
    entries.forEach((v, k) => {
      obj[k] = v;
    });
    window.localStorage.setItem(key, JSON.stringify({ answers: obj }));
  } catch {
    // Ignore storage quota restrictions silently
  }
}

export function ExamTakingWorkspace({ examId }: { examId: string }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [paper, setPaper] = useState<StudentExamPaper | null>(null);
  const [session, setSession] = useState<ActiveExamSessionState | null>(null);
  const [receipt, setReceipt] = useState<ExamSubmissionReceipt | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string | null>>({});
  const [flaggedSet, setFlaggedSet] = useState<Set<string>>(new Set());

  // Timing state
  const clockOffsetRef = useRef<number>(0);
  const expiresAtMsRef = useRef<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Sync & connection state
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [saveStatus, setSaveStatus] = useState<SaveSyncStatus>('saved');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Submission & UI dialogs
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Browser monitoring status
  const [fullscreenActive, setFullscreenActive] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );
  const [visibilitySwitches, setVisibilitySwitches] = useState(0);

  // Refs for race-free auto-save & single-fire timeout submission
  const pendingQueueRef = useRef<Map<string, string | null>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushingRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const autoSubmittedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const persistOutbox = useCallback(() => {
    const sid = sessionIdRef.current;
    if (sid) {
      writeOutbox(examId, sid, pendingQueueRef.current);
    }
    setPendingCount(pendingQueueRef.current.size);
  }, [examId]);

  const executeSubmit = useCallback(
    async (isAuto: boolean) => {
      if (isSubmitting || receipt) return;
      if (isAuto && autoSubmittedRef.current) return;
      if (isAuto) {
        autoSubmittedRef.current = true;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      clearTimers();

      const pendingAnswers = Array.from(pendingQueueRef.current.entries()).map(
        ([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })
      );

      try {
        const res = await fetch(`/api/student/exams/${encodeURIComponent(examId)}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoSubmitted: isAuto,
            flaggedQuestionIds: Array.from(flaggedSet),
            pendingAnswers,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || 'Failed to submit examination.');
        }

        // Clear persisted local outbox upon verified receipt
        pendingQueueRef.current.clear();
        if (sessionIdRef.current) {
          writeOutbox(examId, sessionIdRef.current, pendingQueueRef.current);
        }
        setPendingCount(0);
        setConfirmSubmitOpen(false);
        setReceipt(json as ExamSubmissionReceipt);

        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => undefined);
        }
      } catch (err: unknown) {
        setSubmitError(
          (err as Error).message ||
            'Unable to reach server to submit. Please check your connection and retry.'
        );
        if (isAuto) {
          autoSubmittedRef.current = false;
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearTimers, examId, flaggedSet, isSubmitting, receipt]
  );

  const flushQueueRef = useRef<() => Promise<void>>(async () => {});

  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current || receipt) return;
    if (pendingQueueRef.current.size === 0) {
      setSaveStatus('saved');
      setPendingCount(0);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setSaveStatus('queued');
      return;
    }

    isFlushingRef.current = true;
    setSaveStatus('saving');

    // Snapshot entries so newer clicks arriving mid-flight are preserved cleanly
    const snapshot = Array.from(pendingQueueRef.current.entries()).map(
      ([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })
    );

    try {
      const payload = snapshot.length === 1 ? snapshot[0] : { answers: snapshot };
      const res = await fetch(`/api/student/exams/${encodeURIComponent(examId)}/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409 && (json?.code === 'SESSION_EXPIRED' || json?.code === 'SESSION_ALREADY_SUBMITTED')) {
          isFlushingRef.current = false;
          await executeSubmit(true);
          return;
        }
        throw new Error(json?.error || 'Sync failed.');
      }

      // Remove ONLY keys whose value still matches what was transmitted
      for (const sent of snapshot) {
        const latestVal = pendingQueueRef.current.get(sent.questionId);
        if (pendingQueueRef.current.has(sent.questionId) && latestVal === sent.selectedOptionId) {
          pendingQueueRef.current.delete(sent.questionId);
        }
      }

      retryAttemptRef.current = 0;
      setIsOnline(true);
      setLastSavedAt(json?.serverNow || new Date().toISOString());
      persistOutbox();

      if (pendingQueueRef.current.size > 0) {
        isFlushingRef.current = false;
        flushTimerRef.current = setTimeout(() => {
          void flushQueueRef.current();
        }, 100);
        return;
      }

      setSaveStatus('saved');
    } catch {
      retryAttemptRef.current += 1;
      const onlineNow = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(onlineNow);
      setSaveStatus(onlineNow ? 'error' : 'queued');

      const delayMs = Math.min(15_000, 2500 * Math.pow(1.6, retryAttemptRef.current - 1));
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        void flushQueueRef.current();
      }, delayMs);
    } finally {
      isFlushingRef.current = false;
    }
  }, [examId, executeSubmit, persistOutbox, receipt]);

  useEffect(() => {
    flushQueueRef.current = flushQueue;
  }, [flushQueue]);

  const scheduleFlush = useCallback(
    (immediate = false) => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = setTimeout(
        () => {
          void flushQueue();
        },
        immediate ? 15 : 140
      );
    },
    [flushQueue]
  );

  const applyBootstrapData = useCallback(
    (data: StudentExamSessionBootstrap) => {
      if (data.alreadySubmitted && data.receipt) {
        setReceipt(data.receipt);
        return;
      }

      if (!data.paper || !data.session) {
        throw new Error('Examination payload incomplete.');
      }

      sessionIdRef.current = data.session.id;
      clockOffsetRef.current = Date.parse(data.serverNow) - Date.now();
      expiresAtMsRef.current = Date.parse(data.session.expiresAt);
      setRemainingSeconds(
        Math.max(0, Math.ceil((expiresAtMsRef.current - (Date.now() + clockOffsetRef.current)) / 1000))
      );

      // Restore server answers + merge any crashed/offline local outbox entries
      const restored: Record<string, string | null> = {};
      for (const ans of data.answers) {
        restored[ans.questionId] = ans.selectedOptionId;
      }

      const localOutbox = readOutbox(examId, data.session.id);
      const validQIds = new Set(data.paper.questions.map((q) => q.id));
      let hasUnsyncedRecovery = false;
      for (const [qId, optId] of Object.entries(localOutbox)) {
        if (validQIds.has(qId)) {
          restored[qId] = optId;
          pendingQueueRef.current.set(qId, optId);
          hasUnsyncedRecovery = true;
        }
      }

      setPaper(data.paper);
      setSession(data.session);
      setAnswersMap(restored);
      setFlaggedSet(new Set(data.session.flaggedQuestionIds || []));

      if (data.session.currentQuestionId) {
        const idx = data.paper.questions.findIndex((q) => q.id === data.session?.currentQuestionId);
        if (idx >= 0) setCurrentIndex(idx);
      }

      if (hasUnsyncedRecovery) {
        setPendingCount(pendingQueueRef.current.size);
        setSaveStatus('queued');
        scheduleFlush(true);
      }
    },
    [examId, scheduleFlush]
  );

  const requestSessionBootstrap = useCallback(async () => {
    let hardwareStatus: Record<string, boolean> | undefined;
    if (typeof window !== 'undefined') {
      const savedHw = sessionStorage.getItem(`examguard_hw_${examId}`);
      if (savedHw) {
        try {
          hardwareStatus = JSON.parse(savedHw) as Record<string, boolean>;
        } catch {
          hardwareStatus = undefined;
        }
      }
    }

    const res = await fetch(`/api/student/exams/${encodeURIComponent(examId)}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hardwareStatus ? { hardwareStatus } : {}),
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || 'Unable to authorize examination session.');
    }
    return json as StudentExamSessionBootstrap;
  }, [examId]);

  const initSession = useCallback(async () => {
    setBootstrapping(true);
    setBootstrapError(null);
    try {
      const data = await requestSessionBootstrap();
      applyBootstrapData(data);
    } catch (err: unknown) {
      setBootstrapError((err as Error).message || 'Unable to initialize examination session.');
    } finally {
      setBootstrapping(false);
    }
  }, [applyBootstrapData, requestSessionBootstrap]);

  useEffect(() => {
    let active = true;
    requestSessionBootstrap()
      .then((data) => {
        if (!active) return;
        applyBootstrapData(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setBootstrapError((err as Error).message || 'Unable to initialize examination session.');
      })
      .finally(() => {
        if (active) setBootstrapping(false);
      });

    return () => {
      active = false;
      clearTimers();
    };
  }, [applyBootstrapData, clearTimers, requestSessionBootstrap]);

  // Authoritative server-synced countdown timer
  useEffect(() => {
    if (!session || receipt) return;

    const tick = () => {
      const serverNowApprox = Date.now() + clockOffsetRef.current;
      const diffMs = Math.max(0, expiresAtMsRef.current - serverNowApprox);
      const nextSec = Math.ceil(diffMs / 1000);
      setRemainingSeconds(nextSec);

      if (diffMs <= 0 && !autoSubmittedRef.current) {
        void executeSubmit(true);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [session, receipt, executeSubmit]);

  // Network online/offline listeners + auto-recovery flush
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (pendingQueueRef.current.size > 0) {
        void flushQueue();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (pendingQueueRef.current.size > 0) {
        setSaveStatus('queued');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  // Track real fullscreen & tab visibility while active
  useEffect(() => {
    if (!session || receipt) return;

    const handleFullscreen = () => {
      setFullscreenActive(Boolean(document.fullscreenElement));
    };
    const handleVisibility = () => {
      if (document.hidden) {
        setVisibilitySwitches((prev) => prev + 1);
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingQueueRef.current.size > 0 || !receipt) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session, receipt]);

  const syncProgressMeta = useCallback(
    async (nextFlags?: Set<string>, nextQuestionId?: string | null) => {
      if (!session || receipt) return;
      try {
        await fetch(`/api/student/exams/${encodeURIComponent(examId)}/session`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(nextFlags ? { flaggedQuestionIds: Array.from(nextFlags) } : {}),
            ...(nextQuestionId !== undefined ? { currentQuestionId: nextQuestionId } : {}),
          }),
        });
      } catch {
        // Progress metadata update is best-effort; answers use strict queued outbox
      }
    },
    [examId, receipt, session]
  );

  const handleSelectOption = useCallback(
    (optionId: string | null) => {
      if (!paper || receipt) return;
      const question = paper.questions[currentIndex];
      if (!question) return;

      setAnswersMap((prev) => ({
        ...prev,
        [question.id]: optionId,
      }));
      pendingQueueRef.current.set(question.id, optionId);
      persistOutbox();
      setSaveStatus(isOnline ? 'saving' : 'queued');
      scheduleFlush(false);
    },
    [currentIndex, isOnline, paper, persistOutbox, receipt, scheduleFlush]
  );

  const handleToggleFlag = useCallback(() => {
    if (!paper || receipt) return;
    const question = paper.questions[currentIndex];
    if (!question) return;

    const next = new Set(flaggedSet);
    if (next.has(question.id)) {
      next.delete(question.id);
    } else {
      next.add(question.id);
    }
    setFlaggedSet(next);
    void syncProgressMeta(next, question.id);
  }, [currentIndex, flaggedSet, paper, receipt, syncProgressMeta]);

  const navigateToIndex = useCallback(
    (idx: number) => {
      if (!paper || idx < 0 || idx >= paper.questions.length) return;
      setCurrentIndex(idx);
      const q = paper.questions[idx];
      if (q) {
        void syncProgressMeta(undefined, q.id);
      }
      if (pendingQueueRef.current.size > 0) {
        scheduleFlush(true);
      }
    },
    [paper, scheduleFlush, syncProgressMeta]
  );

  const requestFullscreen = useCallback(() => {
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const answeredCount = useMemo(() => {
    if (!paper) return 0;
    return paper.questions.filter((q) => Boolean(answersMap[q.id])).length;
  }, [answersMap, paper]);

  if (bootstrapping) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12 space-y-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Authorizing session and loading examination questions…</span>
        </div>
        <LoadingSkeleton variant="card" count={2} />
      </main>
    );
  }

  if (receipt) {
    return <SubmissionConfirmation receipt={receipt} />;
  }

  if (bootstrapError || !paper || !session) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 space-y-6">
        <ErrorState
          title="Unable to Enter Examination"
          message={bootstrapError || 'Your session could not be initialized.'}
          onRetry={initSession}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href={`/exam/${encodeURIComponent(examId)}/preflight`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Pre-Flight Check
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/student">Student Portal</Link>
          </Button>
        </div>
      </main>
    );
  }

  const currentQuestion = paper.questions[currentIndex];
  const unansweredCount = Math.max(0, paper.questions.length - answeredCount);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* TOP: Title, Countdown, Save Status, Connection Status, Monitoring Status */}
      <ExamTopBar
        title={paper.title}
        courseCode={paper.courseCode}
        remainingSeconds={remainingSeconds}
        saveStatus={saveStatus}
        pendingCount={pendingCount}
        lastSavedAt={lastSavedAt}
        isOnline={isOnline}
        monitoring={{
          cameraReady: Boolean(session.hardwareStatus.camera),
          micReady: Boolean(session.hardwareStatus.microphone),
          fullscreenActive,
          requireCamera: paper.settings?.require_camera !== false,
          requireAudio: paper.settings?.require_audio !== false,
          requireFullscreen: paper.settings?.require_fullscreen !== false,
          visibilitySwitches,
        }}
        onRetrySync={() => {
          void flushQueue();
        }}
        onEnterFullscreen={requestFullscreen}
        onToggleMobileNav={() => setMobileNavOpen(true)}
      />

      {/* Non-intrusive connectivity interruption notice */}
      {!isOnline && (
        <div
          role="alert"
          className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning flex items-center justify-center gap-2"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>
            Connection interrupted. Your answers are queued safely on this device and will sync
            automatically when you reconnect.
          </span>
        </div>
      )}

      {/* MAIN BODY: LEFT Question Navigator + CENTRE Question Stage */}
      <div className="flex-1 flex mx-auto w-full max-w-[1440px]">
        <QuestionNavigator
          questions={paper.questions}
          currentIndex={currentIndex}
          answersMap={answersMap}
          flaggedSet={flaggedSet}
          onSelectQuestion={navigateToIndex}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
          {currentQuestion ? (
            <QuestionStage
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={paper.questions.length}
              selectedOptionId={answersMap[currentQuestion.id] ?? null}
              isFlagged={flaggedSet.has(currentQuestion.id)}
              negativeMarking={paper.negativeMarking}
              onSelectOption={handleSelectOption}
              onToggleFlag={handleToggleFlag}
              onPrevious={() => navigateToIndex(currentIndex - 1)}
              onNext={() => navigateToIndex(currentIndex + 1)}
              hasPrevious={currentIndex > 0}
              hasNext={currentIndex < paper.questions.length - 1}
            />
          ) : (
            <ErrorState
              title="No Questions Loaded"
              message="No questions were returned for this examination."
            />
          )}
        </main>
      </div>

      {/* BOTTOM: Submission Controls */}
      <ExamBottomBar
        answeredCount={answeredCount}
        totalQuestions={paper.questions.length}
        flaggedCount={flaggedSet.size}
        pendingSyncCount={pendingCount}
        isSubmitting={isSubmitting}
        onRequestSubmit={() => {
          setSubmitError(null);
          setConfirmSubmitOpen(true);
        }}
      />

      {/* Submission Review & Confirmation Modal */}
      <Modal
        open={confirmSubmitOpen}
        onClose={() => {
          if (!isSubmitting) setConfirmSubmitOpen(false);
        }}
        title="Confirm Final Submission"
        description="Once submitted, your answers are locked and you cannot re-enter this examination."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setConfirmSubmitOpen(false)}
            >
              Return to Exam
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => {
                void executeSubmit(false);
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing…
                </>
              ) : (
                'Submit Final Answers'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-px rounded-md border border-border bg-border overflow-hidden text-center">
            <div className="bg-background px-3 py-3">
              <dt className="text-xs text-muted-foreground">Answered</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-success tabular-nums">
                {answeredCount}
              </dd>
            </div>
            <div className="bg-background px-3 py-3">
              <dt className="text-xs text-muted-foreground">Unanswered</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
                {unansweredCount}
              </dd>
            </div>
            <div className="bg-background px-3 py-3">
              <dt className="text-xs text-muted-foreground">Marked</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-warning tabular-nums">
                {flaggedSet.size}
              </dd>
            </div>
          </dl>

          {unansweredCount > 0 && (
            <div className="rounded-md border border-warning/35 bg-warning/10 p-3 flex items-start gap-2.5 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                You still have {unansweredCount} unanswered question
                {unansweredCount === 1 ? '' : 's'}. You can return and complete them before
                submitting.
              </span>
            </div>
          )}

          {pendingCount > 0 && (
            <div className="rounded-md border border-primary/35 bg-primary/10 p-3 flex items-start gap-2.5 text-xs text-primary">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {pendingCount} locally saved answer{pendingCount === 1 ? '' : 's'} will be flushed
                with this submission.
              </span>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-md border border-critical/45 bg-critical/10 p-3 text-xs text-critical"
            >
              {submitError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
