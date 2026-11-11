import React from 'react';
import {
  Activity,
  CheckCircle2,
  Eye,
  FileCheck2,
  Lock,
  Monitor,
  ShieldAlert,
  Volume2,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

const FEATURES = [
  {
    code: '01',
    icon: Eye,
    color: 'text-primary',
    title: 'In-Browser Face Presence & Multi-Face Detection',
    description:
      'Runs MediaPipe Tasks Vision WebAssembly locally on the candidate device to detect absent or multiple faces without streaming raw camera video.',
  },
  {
    code: '02',
    icon: Volume2,
    color: 'text-secondary',
    title: 'Acoustic Energy Profiling (Web Audio API)',
    description:
      'Measures microphone decibel RMS spikes locally to detect sustained noise or speech activity without audio recording or speech transcription.',
  },
  {
    code: '03',
    icon: Monitor,
    color: 'text-purple',
    title: 'Browser Visibility & Fullscreen Telemetry',
    description:
      'Records standard document visibility changes and fullscreen exits during active sessions with exact UTC timestamps for proctor review.',
  },
  {
    code: '04',
    icon: Lock,
    color: 'text-success',
    title: 'Zero Answer-Key Leakage',
    description:
      'Correct options and grading rubrics remain strictly inside protected server tables. Student endpoints strip answer keys from every payload.',
  },
  {
    code: '05',
    icon: Activity,
    color: 'text-warning',
    title: 'Explainable Risk Indicators',
    description:
      'Every anomaly emits structured metadata (signal type, confidence, duration, timestamp) instead of opaque black-box verdicts.',
  },
  {
    code: '06',
    icon: FileCheck2,
    color: 'text-primary',
    title: 'Live Invigilator Review Workflow',
    description:
      'Supabase Realtime delivers prioritized risk alerts to human invigilators who inspect timelines, add notes, and log formal determinations.',
  },
];

const CAPABILITY_BOUNDARIES = [
  {
    capability: 'Single-face presence and absent-candidate detection',
    scope: 'In-Browser MVP (MediaPipe WASM)',
    supported: true,
    detail: 'Executed locally in canvas memory; only event timestamps persist.',
  },
  {
    capability: 'Multiple-face detection in camera frame',
    scope: 'In-Browser MVP (MediaPipe WASM)',
    supported: true,
    detail: 'Flags >1 face sustained past the grace window as a human-review signal.',
  },
  {
    capability: 'Ambient acoustic spike and energy thresholding',
    scope: 'In-Browser MVP (Web Audio API)',
    supported: true,
    detail: 'Measures RMS decibel levels locally without saving or transcribing audio.',
  },
  {
    capability: 'Tab visibility and fullscreen state monitoring',
    scope: 'Standard Browser APIs',
    supported: true,
    detail: 'Uses visibilitychange and fullscreenchange browser events.',
  },
  {
    capability: 'OS-level process killing or desktop window lockdown',
    scope: 'Future Native App Scope',
    supported: false,
    detail: 'Web browsers cannot control external OS apps. Documented explicitly.',
  },
];

/**
 * Core platform feature specification ledger and transparent browser capability boundaries.
 */
export function FeaturesSection() {
  return (
    <section
      id="capabilities"
      className="border-b border-border bg-background py-16 sm:py-20 px-4 sm:px-8"
    >
      <ScrollRevealGroup className="mx-auto max-w-7xl space-y-14">
        <div className="space-y-8">
          <div className="reveal-item max-w-2xl space-y-3">
            <p className="text-xs font-medium text-secondary">
              Platform capabilities
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Precision telemetry without surrendering privacy
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Engineered around transparent edge processing and server-validated assessment controls.
            </p>
          </div>

          {/* 3-column hairline ledger */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="reveal-item card-hover-elevate bg-card p-6 space-y-3 hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${feat.color}`} />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {feat.code}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Monitoring Capabilities & Honest Technical Boundaries */}
        <div className="reveal-item rounded-lg border border-border bg-sidebar overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Transparent AI boundaries
                </span>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Real browser capabilities vs. native OS boundaries
              </h3>
              <p className="text-sm text-muted-foreground">
                AI ExamGuard never makes exaggerated claims or automatically convicts examinees.
                Every automated signal is an explainable indicator queued for human adjudication.
              </p>
            </div>
            <StatusBadge tone="warning">Human-in-the-loop required</StatusBadge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background text-xs font-medium text-muted-foreground">
                  <th className="py-3 px-6">Monitoring signal</th>
                  <th className="py-3 px-4">Execution layer</th>
                  <th className="py-3 px-4">Browser availability</th>
                  <th className="py-3 px-6">Operational guarantee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {CAPABILITY_BOUNDARIES.map((row) => (
                  <tr key={row.capability} className="hover:bg-card transition-colors">
                    <td className="py-3.5 px-6 font-medium text-foreground">{row.capability}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">{row.scope}</td>
                    <td className="py-3.5 px-4">
                      {row.supported ? (
                        <StatusBadge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                          Verified
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" icon={<XCircle className="h-3 w-3" />}>
                          Out of web scope
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
