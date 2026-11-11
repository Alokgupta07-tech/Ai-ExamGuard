'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Eye,
  GraduationCap,
  Lock,
  ShieldCheck,
  Terminal,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { EventTimeline, type TimelineEventItem } from '@/components/shared/event-timeline';

gsap.registerPlugin(useGSAP);

type PreviewScenario = 'nominal' | 'multiface' | 'browser';

const SCENARIO_CONFIG: Record<
  PreviewScenario,
  {
    label: string;
    trustScore: number;
    faceCount: string;
    audioDb: string;
    tone: 'success' | 'warning' | 'critical';
    statusText: string;
    events: TimelineEventItem[];
  }
> = {
  nominal: {
    label: 'Verified Session',
    trustScore: 98,
    faceCount: '1 face verified',
    audioDb: '-42 dB ambient',
    tone: 'success',
    statusText: 'Telemetry nominal',
    events: [
      {
        id: 'prev-1',
        title: 'Local Face Presence Verified',
        description: 'MediaPipe Tasks Vision confirmed single centered examinee in frame.',
        timestamp: '14:02:11 UTC',
        severity: 'info',
        category: 'camera',
        metadata: { engine: 'wasm-edge', latency: '18ms' },
      },
      {
        id: 'prev-2',
        title: 'Browser Fullscreen Active',
        description: 'Document visibility and fullscreen state verified with zero focus loss.',
        timestamp: '14:00:00 UTC',
        severity: 'low',
        category: 'browser',
        metadata: { retention: '0s raw media' },
      },
    ],
  },
  multiface: {
    label: 'Multi-Face Signal',
    trustScore: 76,
    faceCount: '2 faces detected',
    audioDb: '-21 dB spike',
    tone: 'critical',
    statusText: 'Flagged for human review',
    events: [
      {
        id: 'prev-3',
        title: 'Multiple Faces Detected in Frame',
        description:
          'Edge vision model detected 2 distinct faces for >3.0s. Queued as explainable evidence for invigilator review.',
        timestamp: '14:18:44 UTC',
        severity: 'critical',
        category: 'camera',
        metadata: { faces: 2, confidence: '0.94', autoPenalty: 'None' },
      },
      {
        id: 'prev-4',
        title: 'Sustained Acoustic Energy Elevated',
        description: 'Web Audio RMS crossed ambient baseline threshold for 4.2 seconds.',
        timestamp: '14:18:40 UTC',
        severity: 'medium',
        category: 'audio',
        metadata: { rmsPeak: '-21 dB', type: 'energy-only' },
      },
    ],
  },
  browser: {
    label: 'Visibility Loss',
    trustScore: 84,
    faceCount: '1 face verified',
    audioDb: '-40 dB ambient',
    tone: 'warning',
    statusText: 'Visibility alert logged',
    events: [
      {
        id: 'prev-5',
        title: 'Document Visibility Changed (Hidden)',
        description: 'Exam window lost focus for 6.4 seconds before returning to fullscreen.',
        timestamp: '14:24:09 UTC',
        severity: 'medium',
        category: 'browser',
        metadata: { duration: '6.4s', event: 'visibilitychange' },
      },
      {
        id: 'prev-6',
        title: 'Server Answer Keys Isolated',
        description: 'Question payload delivered without grading or answer-key columns.',
        timestamp: '14:00:02 UTC',
        severity: 'info',
        category: 'system',
        metadata: { rls: 'enforced' },
      },
    ],
  },
};

const WORKSPACE_PORTALS = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck, accent: 'text-primary' },
  { href: '/faculty', label: 'Faculty', icon: BookOpen, accent: 'text-secondary' },
  { href: '/invigilator', label: 'Invigilator', icon: Eye, accent: 'text-warning' },
  { href: '/student', label: 'Student', icon: GraduationCap, accent: 'text-success' },
];

/**
 * Console-disciplined hero featuring GSAP entrance choreography and a live telemetry preview component.
 */
export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenario, setScenario] = useState<PreviewScenario>('nominal');

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      gsap.from('.hero-stagger', {
        y: 18,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      gsap.from('.hero-console', {
        y: 22,
        opacity: 0,
        duration: 0.75,
        delay: 0.18,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    },
    { scope: containerRef }
  );

  const active = SCENARIO_CONFIG[scenario];

  return (
    <section
      ref={containerRef}
      className="relative border-b border-border bg-background py-14 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-6 space-y-6 pt-2">
            <p className="hero-stagger text-xs font-medium text-primary">
              Edge-first assessment telemetry · Zero raw video retention
            </p>

            <h1 className="hero-stagger font-heading text-4xl sm:text-5xl xl:text-[3.25rem] font-bold tracking-tight text-foreground leading-[1.06]">
              Examinations,{' '}
              <span className="text-primary">Protected by Intelligence.</span>
            </h1>

            <p className="hero-stagger text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              In-browser MediaPipe vision, Web Audio energy telemetry, and isolated server grading.
            </p>

            <div className="hero-stagger flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg">
                <Link href="/signup" className="flex items-center gap-2">
                  <span>Launch university workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline">
                <Link href="/login">Institutional sign in</Link>
              </Button>
            </div>

            {/* Role Portals Hairline Strip */}
            <div className="hero-stagger pt-6 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground mb-3">
                Role-isolated workspaces (PostgreSQL RLS enforced)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-border rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border bg-card">
                {WORKSPACE_PORTALS.map((portal) => {
                  const Icon = portal.icon;
                  return (
                    <Link
                      key={portal.href}
                      href={portal.href}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-foreground hover:bg-surface-elevated transition-colors"
                    >
                      <Icon className={`h-3.5 w-3.5 ${portal.accent}`} />
                      <span>{portal.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Real Interactive Telemetry Console Component */}
          <div className="hero-console lg:col-span-6">
            <div className="rounded-lg border border-border bg-sidebar overflow-hidden">
              {/* Console Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-xs text-foreground">
                    invigilator-telemetry-preview
                  </span>
                </div>

                <StatusBadge tone={active.tone} pulse={scenario === 'multiface'}>
                  {active.statusText}
                </StatusBadge>
              </div>

              {/* Scenario Selector */}
              <div className="border-b border-border bg-background px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Interactive UI scenario
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Telemetry scenarios">
                  {(['nominal', 'multiface', 'browser'] as PreviewScenario[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScenario(key)}
                      className={`rounded px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                        scenario === key
                          ? 'bg-primary/15 text-primary border border-primary/40'
                          : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                      }`}
                    >
                      {SCENARIO_CONFIG[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Telemetry Metrics Strip */}
              <div className="grid grid-cols-3 border-b border-border divide-x divide-border bg-card">
                <div className="p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Trust index</span>
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                    {active.trustScore}
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </p>
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Vision edge</span>
                    <Eye className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground truncate">
                    {active.faceCount}
                  </p>
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Audio RMS</span>
                    <Volume2 className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <p className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground truncate">
                    {active.audioDb}
                  </p>
                </div>
              </div>

              {/* Real EventTimeline Component */}
              <div className="p-4 sm:p-5 space-y-4">
                <EventTimeline events={active.events} />

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-success" />
                    <span>Zero raw webcam or microphone frames leave the browser</span>
                  </span>
                  <span className="font-medium text-primary">Human review only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
