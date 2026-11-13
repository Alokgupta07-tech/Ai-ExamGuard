'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StoryPanelData {
  id: string;
  stepNumber: string;
  eyebrow: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  startP: number;
  peakP: number;
  endP: number;
}

const PANELS: StoryPanelData[] = [
  {
    id: 'detection',
    stepNumber: '01 / 03',
    eyebrow: 'UNIVERSITY EXAMINATION SECURITY',
    headline: 'Examinations, protected by intelligence.',
    description:
      'An intelligent examination ecosystem built for modern universities.',
    ctaText: 'Explore the platform',
    ctaHref: '#university',
    startP: 0.0,
    peakP: 0.16,
    endP: 0.34,
  },
  {
    id: 'intelligence',
    stepNumber: '02 / 03',
    eyebrow: 'MULTIMODAL AI INTELLIGENCE',
    headline: 'Every signal matters.',
    description:
      'Vision, audio and examination activity brought together through contextual AI analysis.',
    ctaText: 'Discover AI capabilities',
    ctaHref: '#how-it-works',
    startP: 0.33,
    peakP: 0.5,
    endP: 0.67,
  },
  {
    id: 'integrity',
    stepNumber: '03 / 03',
    eyebrow: 'TRUSTED EXAMINATION INTEGRITY',
    headline: 'Technology with human oversight.',
    description:
      'Real-time monitoring, transparent alerts and examiner-led review.',
    ctaText: 'Launch workspace',
    ctaHref: '/login',
    startP: 0.66,
    peakP: 0.85,
    endP: 1.0,
  },
];

export interface ExamGuardStoryPanelsProps {
  progress: number;
}

/**
 * Calculates smooth bell-curve opacity for each panel based on scroll progress.
 */
function calculatePanelOpacity(
  p: number,
  start: number,
  peak: number,
  end: number
): { opacity: number; translateY: number } {
  if (p < start || p > end) return { opacity: 0, translateY: 15 };

  let opacity = 0;
  let translateY = 0;

  if (p <= peak) {
    // Fade in
    const t = (p - start) / Math.max(0.001, peak - start);
    opacity = Math.min(1, Math.max(0, t));
    translateY = (1 - t) * 16;
  } else {
    // Fade out (or hold for last panel)
    if (end >= 0.99 && p >= peak) {
      opacity = 1;
      translateY = 0;
    } else {
      const t = (p - peak) / Math.max(0.001, end - peak);
      opacity = Math.min(1, Math.max(0, 1 - t));
      translateY = -t * 16;
    }
  }

  return { opacity, translateY };
}

export function ExamGuardStoryPanels({ progress }: ExamGuardStoryPanelsProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
      {/* Top Breadcrumb Indicator */}
      <div className="w-full flex items-center justify-between text-xs font-mono text-muted-foreground select-none max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 backdrop-blur-md px-3.5 py-1 text-primary">
          <Sparkles className="h-3 w-3" />
          <span>CINEMATIC ARCHITECTURE</span>
        </div>

        {/* Phase Step Counter */}
        <div className="flex items-center gap-3">
          {PANELS.map((panel) => {
            const active =
              progress >= panel.startP && progress <= panel.endP;
            return (
              <span
                key={panel.id}
                className={cn(
                  'transition-all duration-300 font-mono text-xs',
                  active
                    ? 'text-primary font-bold scale-105'
                    : 'text-muted-foreground/60'
                )}
              >
                {panel.stepNumber}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Text Content Overlaid at Top Center */}
      <div className="relative w-full max-w-4xl mx-auto text-center my-auto pt-6 sm:pt-8 pointer-events-none">
        {PANELS.map((panel) => {
          const { opacity, translateY } = calculatePanelOpacity(
            progress,
            panel.startP,
            panel.peakP,
            panel.endP
          );

          if (opacity <= 0.01) return null;

          return (
            <div
              key={panel.id}
              className="transition-all duration-150 ease-out space-y-4"
              style={{
                opacity,
                transform: `translate3d(0, ${translateY.toFixed(1)}px, 0)`,
              }}
            >
              {/* Eyebrow */}
              <div className="inline-block">
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-primary uppercase">
                  {panel.eyebrow}
                </span>
              </div>

              {/* Headline */}
              <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] max-w-3xl mx-auto">
                &ldquo;{panel.headline.replace(/^"|"$/g, '')}&rdquo;
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base lg:text-lg text-ink-secondary max-w-xl mx-auto leading-relaxed">
                {panel.description}
              </p>

              {/* Small Actionable CTA */}
              <div className="pt-2 pointer-events-auto">
                <Link
                  href={panel.ctaHref}
                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/90 backdrop-blur-md px-5 py-2 text-xs sm:text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-all duration-300 shadow-xs group"
                >
                  <span>{panel.ctaText}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Scroll Progress Bar */}
      <div className="w-full max-w-xs mx-auto pb-4 select-none">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pb-1">
          <span>SCROLL TO EXPLORE</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1 w-full bg-border/60 rounded-full overflow-hidden backdrop-blur-xs">
          <div
            className="h-full bg-primary transition-all duration-100 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

