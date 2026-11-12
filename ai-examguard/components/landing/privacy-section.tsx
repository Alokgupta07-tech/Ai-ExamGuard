'use client';

import React from 'react';
import { Cpu, ShieldCheck, UserCheck } from 'lucide-react';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

const TRUST_POINTS = [
  {
    icon: Cpu,
    title: 'Local Processing',
    description:
      'Computer vision and audio telemetry execute locally in the browser via WebAssembly where supported, avoiding continuous video streaming to servers.',
  },
  {
    icon: ShieldCheck,
    title: 'Responsible Monitoring',
    description:
      'Provides transparent, timestamped event telemetry rather than opaque automated penalties, keeping candidates informed and protected.',
  },
  {
    icon: UserCheck,
    title: 'Human-Led Review',
    description:
      'AI serves strictly as an assistive sensor. Final decisions remain entirely with certified human invigilators and faculty examiners.',
  },
];

/**
 * SECTION 5 — Privacy and Trust
 * One short section explaining local processing, responsible monitoring, and human-led review.
 */
export function PrivacySection() {
  return (
    <section id="privacy" className="py-16 sm:py-20 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
        {/* Section Header */}
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Privacy & Trust
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Academic integrity built on student dignity.
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Ethical, transparent proctoring engineered around local edge analysis and human oversight.
          </p>
        </div>

        {/* 3 Points Grid */}
        <ScrollRevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRUST_POINTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="reveal-item rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </ScrollRevealGroup>
      </div>
    </section>
  );
}

