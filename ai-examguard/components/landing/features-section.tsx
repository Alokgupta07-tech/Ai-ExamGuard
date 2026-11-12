'use client';

import React from 'react';
import { Eye, Layers, Maximize2, Volume2 } from 'lucide-react';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

const CAPABILITIES = [
  {
    title: 'Intelligent Face Monitoring',
    description:
      'Detects candidate presence, orientation, and multiple faces locally in browser memory via WebAssembly.',
    icon: Eye,
    accent: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
  {
    title: 'Audio Activity Analysis',
    description:
      'Measures real-time acoustic RMS decibel levels to flag sustained noise spikes without recording audio.',
    icon: Volume2,
    accent: 'text-secondary',
    bg: 'bg-secondary/10 border-secondary/20',
  },
  {
    title: 'Examination Environment Monitoring',
    description:
      'Tracks browser fullscreen status, tab switches, and window focus changes with millisecond precision.',
    icon: Maximize2,
    accent: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
  {
    title: 'Event Intelligence and Review',
    description:
      'Filters false positives and correlates telemetry for human invigilator adjudication and audit logging.',
    icon: Layers,
    accent: 'text-success',
    bg: 'bg-success/10 border-success/20',
  },
];

/**
 * SECTION 3 — Core Capabilities
 * Four concise feature cards with refined icons and single-sentence descriptions.
 */
export function FeaturesSection() {
  return (
    <section id="capabilities" className="py-16 sm:py-20 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
        {/* Section Header */}
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Core Capabilities
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Essential proctoring telemetry, engineered for accuracy.
          </h2>
        </div>

        {/* 4 Feature Items */}
        <ScrollRevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="reveal-item rounded-xl border border-border bg-card p-5 space-y-3 transition-colors hover:border-border-strong shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${item.bg} ${item.accent}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </ScrollRevealGroup>
      </div>
    </section>
  );
}
