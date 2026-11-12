'use client';

import React from 'react';
import {
  CheckCircle2,
  Eye,
  Layers,
  Maximize2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Volume2,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

const CAPABILITY_BOUNDARIES = [
  {
    capability: 'Single-face presence & absent-candidate detection',
    scope: 'Client WASM (MediaPipe Tasks Vision)',
    supported: true,
    detail: 'Executed strictly in local canvas memory; only timestamped anomaly events persist.',
  },
  {
    capability: 'Multiple-face detection in camera frame',
    scope: 'Client WASM (MediaPipe Tasks Vision)',
    supported: true,
    detail: 'Flags >1 face sustained past the 3.0s grace window as an explainable incident.',
  },
  {
    capability: 'Ambient acoustic spike and energy thresholding',
    scope: 'Browser Web Audio API (AnalyserNode)',
    supported: true,
    detail: 'Measures RMS decibel levels locally without recording, saving, or transcribing audio.',
  },
  {
    capability: 'Tab visibility and fullscreen exit tracking',
    scope: 'Standard HTML5 Browser Events',
    supported: true,
    detail: 'Logs document visibilitychange and fullscreenchange with millisecond precision.',
  },
  {
    capability: 'OS-level process lockdown or desktop window killing',
    scope: 'Native Desktop Agent Scope',
    supported: false,
    detail: 'Web browsers cannot inspect or terminate external OS applications without native software.',
  },
];

/**
 * SECTION 2 — Core Capabilities
 * Sophisticated asymmetric bento-composition presenting the 6 core capabilities
 * with rich micro-interfaces instead of repeating identical cards.
 */
export function FeaturesSection() {
  return (
    <section
      id="capabilities"
      className="border-b border-border bg-background py-16 sm:py-24 px-4 sm:px-8"
    >
      <ScrollRevealGroup className="mx-auto max-w-7xl space-y-16">
        {/* Section Header */}
        <div className="reveal-item max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            <span>Core Detection Architecture</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Six dimensions of assessment integrity
          </h2>
          <p className="text-base text-ink-secondary leading-relaxed">
            Engineered around transparent edge processing and server-validated assessment controls.
            Every signal is contextual, explainable, and designed for human review.
          </p>
        </div>

        {/* Sophisticated Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
          {/* 1. Intelligent Face Monitoring (Span 7) */}
          <div className="reveal-item card-hover-elevate lg:col-span-7 rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                    <Eye className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                    01 • Computer Vision Edge
                  </span>
                </div>
                <StatusBadge tone="teal">Local WASM</StatusBadge>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground">
                Intelligent Face Presence & Pose Tracking
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                MediaPipe Tasks Vision runs WebAssembly models locally inside the browser. It monitors
                continuous single-face presence, tracks head yaw and pitch, and detects when a candidate
                leaves the frame without streaming video frames to the cloud.
              </p>
            </div>

            {/* Micro-preview: Simulated Face Mesh & Bounding Coordinates */}
            <div className="rounded-md border border-border bg-surface-elevated/60 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-foreground font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  FaceLandmarker Model Active
                </span>
                <span className="text-muted-foreground">Latency: 16ms</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground">Presence</p>
                  <p className="font-semibold text-primary">1 Verified</p>
                </div>
                <div className="p-2 rounded border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground">Yaw / Pitch</p>
                  <p className="font-semibold text-foreground">0.03 / -0.01</p>
                </div>
                <div className="p-2 rounded border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground">Confidence</p>
                  <p className="font-semibold text-success">98.4%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Human Presence Detection (Span 5) */}
          <div className="reveal-item card-hover-elevate lg:col-span-5 rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary/10 text-secondary">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-secondary font-semibold">
                    02 • Presence Guard
                  </span>
                </div>
                <StatusBadge tone="info">Multi-Face Flag</StatusBadge>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground">
                Human Presence & Co-Presence Detection
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Differentiates solitary examinees from unauthorized room occupants. When multiple faces
                persist past a configurable grace window, an explainable evidence alert is delivered to
                the invigilator.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface-elevated/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Detection Threshold</span>
                <span className="font-semibold text-foreground">&gt;1 Face for &gt;3.0s</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Incident Severity</span>
                <span className="text-critical font-bold">CRITICAL QUEUE</span>
              </div>
            </div>
          </div>

          {/* 3. Audio Activity Analysis (Span 5) */}
          <div className="reveal-item card-hover-elevate lg:col-span-5 rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-warning/10 text-warning">
                    <Volume2 className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-warning font-semibold">
                    03 • Web Audio RMS
                  </span>
                </div>
                <StatusBadge tone="warning">Zero Transcription</StatusBadge>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground">
                Acoustic Energy & Spike Profiling
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Measures real-time microphone decibel RMS levels through browser Web Audio nodes. Detects
                continuous conversation and abrupt audio bursts without recording or eavesdropping on
                candidate speech.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface-elevated/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Ambient Baseline</span>
                <span className="font-semibold text-foreground">-42 dB RMS</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '28%' }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Raw audio is never recorded, saved, or uploaded. Energy levels only.
              </p>
            </div>
          </div>

          {/* 4. Examination Environment Monitoring (Span 7) */}
          <div className="reveal-item card-hover-elevate lg:col-span-7 rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                    <Maximize2 className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                    04 • Browser Guard
                  </span>
                </div>
                <StatusBadge tone="teal">Fullscreen Lock</StatusBadge>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground">
                Examination Environment & Visibility Monitoring
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Enforces HTML5 fullscreen mode and monitors page visibility. If a student switches tabs,
                minimizes the browser window, or opens split-screen tools, the duration is recorded with
                precise millisecond timestamps.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded border border-border bg-surface-elevated/60">
                <p className="text-muted-foreground text-[10px]">Visibility Tracking</p>
                <p className="font-semibold text-foreground mt-0.5">document.visibilitychange</p>
              </div>
              <div className="p-3 rounded border border-border bg-surface-elevated/60">
                <p className="text-muted-foreground text-[10px]">Fullscreen Enforcement</p>
                <p className="font-semibold text-foreground mt-0.5">element.requestFullscreen()</p>
              </div>
            </div>
          </div>

          {/* 5. Event Correlation & Temporal Clustering (Span 6) */}
          <div className="reveal-item card-hover-elevate lg:col-span-6 rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary/10 text-secondary">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-secondary font-semibold">
                    05 • Temporal Correlation
                  </span>
                </div>
                <StatusBadge tone="info">Noise Filtering</StatusBadge>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground">
                Multi-Signal Correlation & Noise Dampening
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Prevents false positives from fleeting coughs or head turns. The risk engine correlates
                concurrent signals (e.g., audio spike simultaneous with head rotation) to calculate an
                overall session Trust Index.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface-elevated/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Ephemeral Noise Window</span>
                <span className="font-semibold text-foreground">&lt;1.5s Dampened</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Correlated Shift</span>
                <span className="font-semibold text-primary">Audio + Vision Clustering</span>
              </div>
            </div>
          </div>

          {/* 6. Human Review & Adjudication (Span 6) */}
          <div className="reveal-item card-hover-elevate lg:col-span-6 rounded-lg border border-border bg-card p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-success/10 text-success">
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-success font-semibold">
                    06 • Human in the Loop
                  </span>
                </div>
                <StatusBadge tone="success">Zero Auto-Fail</StatusBadge>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground">
                Formal Human Review & Audit Logging
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Algorithms suggest signals; university proctors decide outcomes. Invigilators inspect
                chronological timelines, review context, attach formal adjudications, and log immutable
                audit records.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-surface-elevated/60 p-3 text-xs font-medium">
              <span className="text-muted-foreground">Proctor Decision Actions:</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">Clear</span>
                <span className="px-2 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">Warn</span>
                <span className="px-2 py-0.5 rounded bg-critical/15 text-critical border border-critical/30">Escalate</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Capabilities vs. Transparent Technical Boundaries Table */}
        <div className="reveal-item rounded-lg border border-border bg-card overflow-hidden shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface-elevated/50 px-6 py-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                  Transparent Technical Boundaries
                </span>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                In-Browser Web Capabilities vs. Native OS Scope
              </h3>
              <p className="text-sm text-ink-secondary">
                AI ExamGuard never makes exaggerated claims or promises impossible lockdown.
                Every automated signal is an explainable indicator queued for human adjudication.
              </p>
            </div>
            <StatusBadge tone="warning">Human Adjudication Required</StatusBadge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-6">Monitoring Signal</th>
                  <th className="py-3 px-4">Execution Layer</th>
                  <th className="py-3 px-4">Browser Availability</th>
                  <th className="py-3 px-6">Operational Guarantee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {CAPABILITY_BOUNDARIES.map((row) => (
                  <tr key={row.capability} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-foreground">{row.capability}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">{row.scope}</td>
                    <td className="py-3.5 px-4">
                      {row.supported ? (
                        <StatusBadge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                          Verified In-Browser
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" icon={<XCircle className="h-3 w-3" />}>
                          Out of Web Scope
                        </StatusBadge>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-muted-foreground">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollRevealGroup>
    </section>
  );
}
