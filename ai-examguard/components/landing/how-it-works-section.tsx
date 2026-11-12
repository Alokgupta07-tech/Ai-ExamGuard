'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ClipboardCheck,
  Cpu,
  FileCheck,
  FileEdit,
  Layers,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';
import { cn } from '@/lib/utils';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Examination Creation',
    phase: 'Faculty Portal',
    icon: FileEdit,
    description:
      'Faculty author randomized MCQ banks with server-isolated answer keys, configure timing windows, passing marks, and proctoring sensitivity thresholds.',
    detail: 'Cryptographic question payload delivery; zero answer keys sent to client memory.',
  },
  {
    step: '02',
    title: 'Student Verification',
    phase: 'Pre-Flight Checks',
    icon: ClipboardCheck,
    description:
      'Candidates verify camera framing, calibrate microphone ambient RMS baseline, and grant fullscreen permissions with explicit privacy disclosures.',
    detail: 'Transparent local device test; ensures equipment is operational before timed start.',
  },
  {
    step: '03',
    title: 'Local AI Monitoring',
    phase: 'Client-Side WASM',
    icon: Cpu,
    description:
      'During the assessment, MediaPipe Tasks Vision and Web Audio API run strictly in the browser memory. Zero video or audio streams leave the computer.',
    detail: 'Lightweight WebAssembly execution; only timestamped anomaly metadata crosses the network.',
  },
  {
    step: '04',
    title: 'Event Analysis',
    phase: 'Temporal Correlation',
    icon: Layers,
    description:
      'Ephemeral spikes are dampened while concurrent signals (e.g. noise spike coinciding with face absence) are correlated into an objective Trust Index.',
    detail: 'Multi-signal temporal clustering filters false alarms like minor head shifts or coughs.',
  },
  {
    step: '05',
    title: 'Examiner Review',
    phase: 'Invigilator SOC',
    icon: UserCheck,
    description:
      'Human proctors inspect flagged incidents in real time, review explainable timeline context, and record formal adjudication determinations.',
    detail: 'Adjudication actions: Clear Case, Issue Warning, or Escalate for Committee Review.',
  },
  {
    step: '06',
    title: 'Final Report',
    phase: 'Institutional Audit',
    icon: FileCheck,
    description:
      'Generates immutable audit logs, tamper-resistant submission receipts, comprehensive candidate metrics, and CSV exports for campus records.',
    detail: 'Full institutional ledger preserved for academic appeals and grade confirmation.',
  },
];

/**
 * SECTION 3 — How It Works
 * Refined 6-step sequential assessment lifecycle diagram connecting all stages from
 * examination creation to final reporting.
 */
export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id="workflow"
      className="border-b border-border bg-sidebar py-16 sm:py-24 px-4 sm:px-8"
    >
      <ScrollRevealGroup className="mx-auto max-w-7xl space-y-14">
        {/* Header */}
        <div className="reveal-item max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            <span>End-to-End Examination Lifecycle</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How AI ExamGuard secures every assessment
          </h2>
          <p className="text-base text-ink-secondary leading-relaxed">
            From exam authoring to post-exam institutional audit, each transition enforces server
            validation, transparent student consent, and human-in-the-loop oversight.
          </p>
        </div>

        {/* 6-Step Visual Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WORKFLOW_STEPS.map((item, idx) => {
            const Icon = item.icon;
            const isHovered = activeStep === idx;
            return (
              <div
                key={item.step}
                onMouseEnter={() => setActiveStep(idx)}
                className={cn(
                  'reveal-item card-hover-elevate relative flex flex-col justify-between gap-5 rounded-lg border p-6 transition-all duration-200 cursor-pointer shadow-xs',
                  isHovered
                    ? 'border-primary/50 bg-card shadow-sm'
                    : 'border-border bg-card/70 hover:border-border-strong'
                )}
              >
                {/* Step Top Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                      {item.step}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.phase}
                    </span>
                  </div>
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Detail Pill */}
                <div className="rounded-md border border-border bg-surface-elevated/60 p-2.5 text-[11px] text-muted-foreground font-mono">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow Progression Stepper Summary */}
        <div className="reveal-item rounded-lg border border-border bg-card p-6 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {WORKFLOW_STEPS.map((s, idx) => (
              <React.Fragment key={s.step}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold">
                    {s.step}
                  </span>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {s.title}
                  </span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-border-strong shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </ScrollRevealGroup>
    </section>
  );
}
