'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  Maximize2,
  Mic,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { SubmissionConfirmation } from '@/components/exam/submission-confirmation';
import type { ExamPreflightPayload } from '@/types/exam-session';

function formatWindowTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatWaitCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ExamPreflightView({ examId }: { examId: string }) {
  const router = useRouter();
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [payload, setPayload] = useState<ExamPreflightPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [fullscreenOk] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenEnabled) : true
  );
  const [testingDevices, setTestingDevices] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const [agreedHonor, setAgreedHonor] = useState(false);
  const [entering, setEntering] = useState(false);
  const [waitRemainingMs, setWaitRemainingMs] = useState<number>(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTestingDevices(false);
  }, []);

  const fetchPreflight = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/student/exams/${encodeURIComponent(examId)}/preflight`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Unable to verify examination eligibility.');
      }
      setPayload(json as ExamPreflightPayload);
    } catch (err: unknown) {
      setLoadError((err as Error).message || 'Unable to load pre-flight checks.');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/student/exams/${encodeURIComponent(examId)}/preflight`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || 'Unable to verify examination eligibility.');
        }
        return json as ExamPreflightPayload;
      })
      .then((data) => {
        if (!active) return;
        setLoadError(null);
        setPayload(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError((err as Error).message || 'Unable to load pre-flight checks.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      stopStream();
    };
  }, [examId, stopStream]);

  // Countdown while waiting for opening window
  useEffect(() => {
    if (!payload || payload.reason !== 'not_started_window') {
      return;
    }
    const offset = Date.parse(payload.serverNow) - Date.now();
    const startMs = Date.parse(payload.exam.startTime);

    const tick = () => {
      const remaining = Math.max(0, startMs - (Date.now() + offset));
      setWaitRemainingMs(remaining);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [payload]);

  const runDeviceCheck = async () => {
    stopStream();
    setDeviceMessage(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraOk(false);
      setMicOk(false);
      setDeviceMessage('Browser MediaDevices API is not supported in this environment.');
      return;
    }

    const reqCam = payload?.exam.settings?.require_camera !== false;
    const reqMic = payload?.exam.settings?.require_audio !== false;

    setTestingDevices(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: reqCam || true,
        audio: reqMic || true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOk(stream.getVideoTracks().length > 0);
      setMicOk(stream.getAudioTracks().length > 0);
      setDeviceMessage('Camera and microphone streams verified locally in your browser.');
    } catch {
      setCameraOk(false);
      setMicOk(false);
      setDeviceMessage(
        'Camera or microphone permission was denied. Grant access in your browser site settings or continue if optional.'
      );
      setTestingDevices(false);
    }
  };

  const handleEnterExam = async () => {
    if (!payload || !payload.eligible || entering) return;
    setEntering(true);

    try {
      const hardwareSnapshot = {
        camera: Boolean(cameraOk),
        microphone: Boolean(micOk),
        fullscreen: fullscreenOk,
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`examguard_hw_${examId}`, JSON.stringify(hardwareSnapshot));
      }

      stopStream();

      if (payload.exam.settings?.require_fullscreen && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // Fullscreen may be blocked depending on browser policy; non-fatal here, top bar offers quick restore
        }
      }

      router.push(`/exam/${encodeURIComponent(examId)}`);
    } catch {
      setEntering(false);
    }
  };

  if (loading && !payload) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 space-y-6">
        <LoadingSkeleton variant="card" count={2} />
      </main>
    );
  }

  if (loadError || !payload) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 space-y-6">
        <ErrorState
          title="Examination Access Unavailable"
          message={loadError || 'Unable to inspect examination eligibility.'}
          onRetry={fetchPreflight}
        />
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/student">
              <ArrowLeft className="h-4 w-4" />
              Return to Student Portal
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (payload.reason === 'already_submitted' && payload.receipt) {
    return <SubmissionConfirmation receipt={payload.receipt} />;
  }

  const reqCamera = payload.exam.settings?.require_camera !== false;
  const reqAudio = payload.exam.settings?.require_audio !== false;
  const reqFullscreen = payload.exam.settings?.require_fullscreen !== false;
  const isResuming = payload.existingSession?.status === 'in_progress';
  const hardwareBlocked =
    (reqCamera && cameraOk === false) || (reqAudio && micOk === false);
  const canLaunch = payload.eligible && agreedHonor && !entering && !hardwareBlocked;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal Gate Header */}
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">
              AI ExamGuard · Examination Gate
            </span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student">
              <ArrowLeft className="h-4 w-4" />
              Back to Portal
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Examination Summary Card */}
        <section className="rounded-lg border border-border bg-card p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-primary">{payload.exam.courseCode}</p>
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                {payload.exam.title}
              </h1>
              <p className="text-sm text-muted-foreground">{payload.exam.courseName}</p>
            </div>
            <StatusBadge tone={payload.eligible ? 'success' : 'warning'}>
              {isResuming
                ? 'Active Session Found'
                : payload.eligible
                  ? 'Eligible to Enter'
                  : 'Access Restricted'}
            </StatusBadge>
          </div>

          {payload.exam.description && (
            <p className="text-sm leading-relaxed text-ink-secondary">{payload.exam.description}</p>
          )}

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-md border border-border bg-border overflow-hidden">
            <div className="bg-background px-4 py-3">
              <dt className="text-xs text-muted-foreground">Duration</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                {payload.exam.durationMinutes} min
              </dd>
            </div>
            <div className="bg-background px-4 py-3">
              <dt className="text-xs text-muted-foreground">Questions</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                {payload.exam.questionCount}
              </dd>
            </div>
            <div className="bg-background px-4 py-3">
              <dt className="text-xs text-muted-foreground">Total Marks</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                {payload.exam.totalPoints}
                {payload.exam.passingMarks > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (pass {payload.exam.passingMarks})
                  </span>
                )}
              </dd>
            </div>
            <div className="bg-background px-4 py-3">
              <dt className="text-xs text-muted-foreground">Negative Marking</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">
                {payload.exam.negativeMarking > 0
                  ? `-${Math.round(payload.exam.negativeMarking * 100)}% per wrong`
                  : 'None'}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            Scheduled window: {formatWindowTime(payload.exam.startTime)} →{' '}
            {formatWindowTime(payload.exam.endTime)}
          </p>
        </section>

        {/* Eligibility Blocker (if not eligible) */}
        {!payload.eligible && (
          <section
            role="alert"
            className="rounded-lg border border-warning/40 bg-warning/10 p-5 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-heading text-sm font-semibold text-foreground">
                  {payload.reason === 'not_started_window'
                    ? 'Examination Window Not Open Yet'
                    : 'Examination Unavailable'}
                </h2>
                <p className="text-sm text-ink-secondary">{payload.reasonMessage}</p>
                {payload.reason === 'not_started_window' && waitRemainingMs > 0 && (
                  <p className="font-mono text-xs text-warning tabular-nums pt-1">
                    Opens in {formatWaitCountdown(waitRemainingMs)}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPreflight}>
              <RefreshCw className="h-3.5 w-3.5" />
              Re-check Eligibility
            </Button>
          </section>
        )}

        {/* Candidate Instructions */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Candidate Instructions
          </h2>
          {payload.exam.instructions ? (
            <div className="text-sm leading-relaxed text-ink-secondary whitespace-pre-wrap">
              {payload.exam.instructions}
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-ink-secondary list-disc pl-5">
              <li>Your countdown timer is controlled by the server and begins once you start.</li>
              <li>Every answer selection auto-saves automatically and syncs if you reconnect.</li>
              <li>
                Use the Question Navigator or Mark for Review button to revisit uncertain items.
              </li>
              <li>
                When the timer reaches 00:00, your current responses are submitted automatically.
              </li>
            </ul>
          )}
        </section>

        {/* Browser & Device Readiness */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Environment & Device Verification
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All device checks run locally in your browser.
              </p>
            </div>

            {testingDevices ? (
              <Button variant="outline" size="sm" onClick={stopStream}>
                Stop Preview
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={runDeviceCheck}>
                <RefreshCw className="h-3.5 w-3.5" />
                Run Device Check
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-background p-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <Camera className="h-4 w-4 text-primary" />
                Camera {reqCamera ? '(required)' : '(optional)'}
              </span>
              {cameraOk === true ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : cameraOk === false ? (
                <XCircle className="h-4 w-4 text-critical" />
              ) : (
                <span className="text-[11px] text-muted-foreground">Pending</span>
              )}
            </div>

            <div className="rounded-md border border-border bg-background p-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <Mic className="h-4 w-4 text-secondary" />
                Microphone {reqAudio ? '(required)' : '(optional)'}
              </span>
              {micOk === true ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : micOk === false ? (
                <XCircle className="h-4 w-4 text-critical" />
              ) : (
                <span className="text-[11px] text-muted-foreground">Pending</span>
              )}
            </div>

            <div className="rounded-md border border-border bg-background p-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <Maximize2 className="h-4 w-4 text-primary" />
                Fullscreen {reqFullscreen ? '(active)' : '(optional)'}
              </span>
              {fullscreenOk ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-warning" />
              )}
            </div>
          </div>

          {testingDevices && (
            <div className="overflow-hidden rounded-md border border-border bg-background max-w-xs">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-36 object-cover -scale-x-100"
              />
            </div>
          )}

          {deviceMessage && <p className="text-xs text-muted-foreground">{deviceMessage}</p>}
        </section>

        {/* Honor Code & Launch CTA */}
        {payload.eligible && (
          <section className="rounded-lg border border-border bg-sidebar p-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedHonor}
                onChange={(e) => setAgreedHonor(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary cursor-pointer"
              />
              <span className="text-sm text-ink-secondary leading-relaxed">
                I confirm that I am the enrolled candidate for this examination and will complete all
                questions independently in accordance with institutional academic integrity policy.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-secondary" />
                {isResuming
                  ? 'Your existing timer and saved answers will be restored.'
                  : 'Timer starts strictly when the authorized server creates your session.'}
              </span>

              <Button
                type="button"
                size="lg"
                disabled={!canLaunch}
                onClick={handleEnterExam}
              >
                {isResuming ? (
                  <>
                    <Clock className="h-4 w-4" />
                    Resume Examination
                  </>
                ) : (
                  <>
                    Begin Examination
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
