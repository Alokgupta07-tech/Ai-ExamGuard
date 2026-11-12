'use client'

import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Lock,
  Maximize2,
  Mic,
  Monitor,
  Phone,
  Save,
  Shield,
  ShieldAlert,
  Smartphone,
  Sliders,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ExamIntegrityPolicy } from '@/types/proctoring'

export interface ExamPolicyManagerProps {
  examId: string
  examTitle?: string
  courseCode?: string
}

export function ExamPolicyManager({ examId, examTitle, courseCode }: ExamPolicyManagerProps) {
  const [policy, setPolicy] = useState<ExamIntegrityPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/exams/${encodeURIComponent(examId)}/policy`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        if (data && !data.error) {
          setPolicy(data as ExamIntegrityPolicy)
        }
      })
      .catch((err) => {
        if (!active) return
        setErrorMsg('Failed to load exam integrity policy.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [examId])

  const handleSave = async () => {
    if (!policy) return
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save policy')
      }
      setPolicy((prev) => (prev ? { ...prev, ...data, version: data.version } : data))
      setSuccessMsg('Examination integrity policy saved and published successfully.')
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Unable to update policy.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading examination integrity policy…</span>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <AlertTriangle className="h-6 w-6 text-warning mx-auto" />
        <p className="font-semibold text-foreground">Policy Unavailable</p>
        <p className="text-xs text-muted-foreground">Unable to fetch policy for this examination.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/faculty/exams">Back to Examinations</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Link href="/faculty/exams" className="hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Examinations
            </Link>
            <span>/</span>
            <span>{courseCode || 'Course'}</span>
            <span>/</span>
            <span className="text-primary font-semibold">Integrity Policy</span>
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            {examTitle || 'Examination Integrity & Warning Policy'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure server-enforced violation thresholds, strike limits, and automated submission rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Publish Policy
              </>
            )}
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 flex items-center gap-2.5 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Three-Strike Parameters */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Violation Warning Thresholds
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="maxWarnings" className="text-xs">
                  Max Qualifying Warnings (Strikes)
                </Label>
                <select
                  id="maxWarnings"
                  value={policy.maxWarnings}
                  onChange={(e) =>
                    setPolicy({ ...policy, maxWarnings: parseInt(e.target.value, 10) })
                  }
                  className="h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-xs text-foreground focus-visible:outline-primary"
                >
                  <option value={1}>1 Strike (Immediate submission on first violation)</option>
                  <option value={2}>2 Strikes (One warning, then auto-submit)</option>
                  <option value={3}>3 Strikes (Default SRM AP 3-strike policy)</option>
                  <option value={5}>5 Strikes (Lenient / formative)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Upon reaching this strike count, candidate examination is automatically submitted.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cooldown" className="text-xs">
                  Strike Cooldown Window (Seconds)
                </Label>
                <input
                  id="cooldown"
                  type="number"
                  min={5}
                  max={120}
                  value={policy.warningCooldownSeconds}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      warningCooldownSeconds: Math.max(5, parseInt(e.target.value || '20', 10)),
                    })
                  }
                  className="h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-xs text-foreground font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum duration between successive strikes to prevent continuous frame duplicates.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Automatic Final Submission</p>
                <p className="text-[11px] text-muted-foreground">
                  Lock candidate exam and flush all completed answers when max warnings are reached.
                </p>
              </div>
              <input
                type="checkbox"
                checked={policy.autoSubmissionEnabled}
                onChange={(e) => setPolicy({ ...policy, autoSubmissionEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Section 2: Countable Misconduct Strike Toggles */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Qualifying Misconduct Violations
              </h2>
            </div>

            <p className="text-xs text-muted-foreground">
              Select which verified detections count as formal strikes. Environmental sounds and hardware
              faults generate technical incident logs, never misconduct strikes.
            </p>

            <div className="space-y-3 pt-1">
              {/* Phone Detection */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Mobile Phone &amp; Device Detection</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sustained presence of cellular phone or secondary screen (MediaPipe / EfficientDet).
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.phoneDetectionStrike}
                  onChange={(e) => setPolicy({ ...policy, phoneDetectionStrike: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              {/* Additional Person */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Additional Person in Room</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sustained detection of a second person assisting or present in visible camera frame.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.additionalPersonStrike}
                  onChange={(e) => setPolicy({ ...policy, additionalPersonStrike: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              {/* Fullscreen Exit */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Maximize2 className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Fullscreen Mode Exit</p>
                    <p className="text-[11px] text-muted-foreground">
                      Candidate exits browser fullscreen workspace during active test.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.fullscreenRequired}
                  onChange={(e) => setPolicy({ ...policy, fullscreenRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              {/* Tab Switching */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Tab Switch / Page Hidden</p>
                    <p className="text-[11px] text-muted-foreground">
                      Candidate minimizes exam or switches to a background tab for &gt; 1.5 seconds.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.tabSwitchStrike}
                  onChange={(e) => setPolicy({ ...policy, tabSwitchStrike: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              {/* Audio Speech VAD */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mic className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Sustained Human Speech (VAD)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Continuous voice speech activity in voice frequency band (300-3400Hz).
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.audioVadStrike}
                  onChange={(e) => setPolicy({ ...policy, audioVadStrike: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              {/* Gaze Deviation */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Prolonged Off-Screen Gaze</p>
                    <p className="text-[11px] text-muted-foreground">
                      Gaze averted from screen for &gt; 3.5s (Default: Observation only).
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.gazeDeviationStrike}
                  onChange={(e) => setPolicy({ ...policy, gazeDeviationStrike: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Live Policy Summary Preview Card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 sticky top-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                Policy Enforcement Summary
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Strike Limit</span>
                <span className="font-mono font-bold text-foreground">
                  {policy.maxWarnings} Warnings
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Action on Max</span>
                <span className="font-semibold text-destructive">
                  {policy.autoSubmissionEnabled ? 'Auto-Submit' : 'Flag For Review'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Cooldown Window</span>
                <span className="font-mono text-foreground">{policy.warningCooldownSeconds}s</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Policy Version</span>
                <span className="font-mono text-foreground">v{policy.version}</span>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">Server Integrity Guarantee</p>
              <p>
                All strikes are validated on the server. If an exam is auto-submitted, all previously saved answers
                are atomically flushed and permanently preserved.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
              {saving ? 'Publishing…' : 'Save & Enforce Policy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
