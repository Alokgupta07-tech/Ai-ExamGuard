'use client';

import React from 'react';
import { ChevronRight, ClipboardCheck, Cpu, FileCheck, FileEdit, ShieldCheck, UserCheck } from 'lucide-react';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'University Setup',
    description: 'Configure institutional policies, sensor thresholds, and role permissions.',
    icon: ShieldCheck,
  },
  {
    step: '02',
    title: 'Examination Creation',
    description: 'Faculty author question banks with server-isolated keys and scheduling.',
    icon: FileEdit,
  },
  {
    step: '03',
    title: 'Student Verification',
    description: 'Candidates complete transparent sensor preflight and device checks.',
    icon: ClipboardCheck,
  },
  {
    step: '04',
    title: 'AI Monitoring',
    description: 'Local WebAssembly models track presence, gaze, and acoustic baselines.',
    icon: Cpu,
  },
  {
    step: '05',
    title: 'Examiner Review',
    description: 'Human invigilators adjudicate telemetry incidents and sign off reports.',
    icon: UserCheck,
  },
];

/**
 * SECTION 4 — How It Works: From Examination to Integrity Review
 * 5 clean steps with numbers, professional titles, single-sentence descriptions, and visual flow.
 */
export function HowItWorksSection() {
  return (
    <section id="workflow" className="py-16 sm:py-20 border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
        {/* Section Header */}
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Assessment Workflow
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            From Examination to Integrity Review
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            A seamless, five-step institutional workflow engineered for transparency and faculty oversight.
          </p>
        </div>

        {/* Horizontal Process Diagram */}
        <ScrollRevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative">
          {PROCESS_STEPS.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === PROCESS_STEPS.length - 1;

            return (
              <div key={item.step} className="reveal-item flex flex-col justify-between relative group">
                <div className="rounded-xl border border-border bg-background p-4 space-y-3 h-full flex flex-col justify-between transition-colors hover:border-primary/40 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">
                      {item.step}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-ink-secondary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-heading text-xs sm:text-sm font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-ink-secondary leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Subtle desktop connector arrow */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-border group-hover:text-primary transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </ScrollRevealGroup>
      </div>
    </section>
  );
}
