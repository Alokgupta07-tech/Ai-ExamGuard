'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { AnimatedCounter } from '@/components/shared/animated-counter';

gsap.registerPlugin(useGSAP);

type PreviewScenario = 'nominal' | 'multiface' | 'browser';

interface ScenarioData {
  label: string;
  tag: string;
  trustScore: number;
  faceStatus: 'single_verified' | 'multiple_detected' | 'absent';
  faceLabel: string;
  audioDb: string;
  audioPeak: number; // 0-100 percentage
  browserState: 'fullscreen_locked' | 'focus_lost';
  browserLabel: string;
  statusText: string;
  statusTone: 'success' | 'warning' | 'critical';
  events: {
    id: string;
    timestamp: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    module: 'vision' | 'audio' | 'browser';
    explanation: string;
    actionRequired?: string;
  }[];
}

const SCENARIOS: Record<PreviewScenario, ScenarioData> = {
  nominal: {
    label: 'Verified Session',
    tag: 'Standard Monitoring',
    trustScore: 98,
    faceStatus: 'single_verified',
    faceLabel: '1 Face Verified (Centered)',
    audioDb: '-42 dB (Ambient)',
    audioPeak: 18,
    browserState: 'fullscreen_locked',
    browserLabel: 'Fullscreen Active • Focused',
    statusText: 'Telemetry Nominal',
    statusTone: 'success',
    events: [
      {
        id: 'ev-101',
        timestamp: '14:02:11 UTC',
        type: 'FACE_PRESENCE_CONFIRMED',
        severity: 'info',
        module: 'vision',
        explanation: 'Local MediaPipe WASM confirmed single centered examinee in frame (confidence: 0.96).',
      },
      {
        id: 'ev-102',
        timestamp: '14:00:00 UTC',
        type: 'FULLSCREEN_ENTERED',
        severity: 'info',
        module: 'browser',
        explanation: 'Candidate entered enforced browser fullscreen mode with window focus.',
      },
    ],
  },
  multiface: {
    label: 'Multi-Face Anomaly',
    tag: 'Flagged Incident',
    trustScore: 74,
    faceStatus: 'multiple_detected',
    faceLabel: '2 Faces Detected in Frame',
    audioDb: '-19 dB (Voice Spike)',
    audioPeak: 72,
    browserState: 'fullscreen_locked',
    browserLabel: 'Fullscreen Active',
    statusText: 'Review Required',
    statusTone: 'critical',
    events: [
      {
        id: 'ev-103',
        timestamp: '14:18:44 UTC',
        type: 'MULTIPLE_FACES_DETECTED',
        severity: 'critical',
        module: 'vision',
        explanation: 'Edge vision model detected 2 distinct faces sustained for >3.2s. Queued for proctor review.',
        actionRequired: 'Verify proctoring snapshot with examinee',
      },
      {
        id: 'ev-104',
        timestamp: '14:18:40 UTC',
        type: 'SUSTAINED_ACOUSTIC_ENERGY',
        severity: 'warning',
        module: 'audio',
        explanation: 'Local Web Audio RMS crossed ambient threshold for 4.2s. Correlated with face count shift.',
      },
    ],
  },
  browser: {
    label: 'Window Focus Lost',
    tag: 'Integrity Warning',
    trustScore: 82,
    faceStatus: 'single_verified',
    faceLabel: '1 Face Verified',
    audioDb: '-40 dB (Ambient)',
    audioPeak: 22,
    browserState: 'focus_lost',
    browserLabel: 'Window Focus Lost (Tab Hidden)',
    statusText: 'Integrity Flag Logged',
    statusTone: 'warning',
    events: [
      {
        id: 'ev-105',
        timestamp: '14:24:09 UTC',
        type: 'VISIBILITY_CHANGE_HIDDEN',
        severity: 'warning',
        module: 'browser',
        explanation: 'Candidate tab lost focus for 5.8s before returning to fullscreen. Timestamp logged.',
        actionRequired: 'Review session event history upon submission',
      },
      {
        id: 'ev-106',
        timestamp: '14:00:02 UTC',
        type: 'ANSWER_KEY_PROTECTION_VERIFIED',
        severity: 'info',
        module: 'browser',
        explanation: 'Question payload delivered without grading rubrics or answer keys in client memory.',
      },
    ],
  },
};

const WORKSPACE_PORTALS = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck, role: 'Tenant Governance' },
  { href: '/faculty', label: 'Faculty', icon: BookOpen, role: 'Exam Authoring' },
  { href: '/invigilator', label: 'Invigilator', icon: Eye, role: 'Live SOC Center' },
  { href: '/student', label: 'Student', icon: GraduationCap, role: 'Candidate Portal' },
];

/**
 * Enterprise hero section featuring GSAP headline reveals, authentic
 * Invigilator Telemetry Console showcase, and verified capability trust badges.
 */
export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenario, setScenario] = useState<PreviewScenario>('nominal');
  const prefersReducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-eyebrow', {
        y: -12,
        opacity: 0,
        duration: 0.5,
        clearProps: 'transform,opacity',
      })
        .from('.hero-headline-line', {
          yPercent: 110,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          clearProps: 'transform,opacity',
        }, '-=0.25')
        .from('.hero-statement', {
          y: 18,
          opacity: 0,
          duration: 0.55,
          clearProps: 'transform,opacity',
        }, '-=0.4')
        .from('.hero-cta-group', {
          y: 18,
          opacity: 0,
          duration: 0.5,
          clearProps: 'transform,opacity',
        }, '-=0.35')
        .from('.hero-trust-badge', {
          opacity: 0,
          duration: 0.45,
          clearProps: 'opacity',
        }, '-=0.25')
        .from('.hero-role-strip', {
          y: 16,
          opacity: 0,
          duration: 0.5,
          clearProps: 'transform,opacity',
        }, '-=0.3')
        .from('.hero-console-frame', {
          y: 28,
          opacity: 0,
          duration: 0.75,
          clearProps: 'transform,opacity',
        }, '-=0.55');
    },
    { scope: containerRef }
  );

  const active = SCENARIOS[scenario];

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden border-b border-border bg-background pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24"
    >
      {/* Subtle Ambient Background Grid & Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-ambient-grid opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-radial-ambient"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT COLUMN: Strategic Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            {/* Eyebrow */}
            <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Intelligent Examination Security</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl xl:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.08]">
              <span className="block overflow-hidden">
                <span className="hero-headline-line block">Examinations,</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-headline-line block">Protected by</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-headline-line block text-primary">Intelligence.</span>
              </span>
            </h1>

            {/* Supporting Statement */}
            <p className="hero-statement text-base sm:text-lg text-ink-secondary max-w-xl leading-relaxed">
              Intelligent examination integrity for modern universities. Powered by local AI monitoring,
              contextual event analysis and secure digital assessment technology.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="hero-cta-group flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg" className="h-11 px-6 shadow-xs font-medium">
                <Link href="/signup" className="flex items-center gap-2">
                  <span>Launch University Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline" className="h-11 px-6 font-medium">
                <Link href="/login">Institutional Sign In</Link>
              </Button>
            </div>

            {/* Small & Elegant Trust Statement using verified product capabilities */}
            <div className="hero-trust-badge flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>
                Verified zero raw media recording • Browser-local WASM inference • Human invigilator review
              </span>
            </div>

            {/* Role Portals Hairline Strip */}
            <div className="hero-role-strip pt-4 border-t border-border">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">
                Role-Isolated Workspaces (PostgreSQL RLS Enforced)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-border rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border bg-card shadow-xs">
                {WORKSPACE_PORTALS.map((portal) => {
                  const Icon = portal.icon;
                  return (
                    <Link
                      key={portal.href}
                      href={portal.href}
                      className="group flex flex-col items-center justify-center p-3 text-center hover:bg-surface-elevated/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">{portal.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground truncate w-full">
                        {portal.role}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Realistic Enterprise Telemetry Showcase */}
          <div className="hero-console-frame lg:col-span-6">
            <div className="rounded-lg border border-border bg-card shadow-md overflow-hidden">
              {/* Terminal Frame Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated/80 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                    <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  </div>
                  <div className="flex items-center gap-2 pl-2 border-l border-border">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-xs font-semibold text-foreground">
                      SOC / Invigilator Command Telemetry
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Live Edge Feed
                  </span>
                </div>
              </div>

              {/* Explicit Demonstration Label */}
              <div className="border-b border-border bg-amber-500/10 px-4 py-1.5 text-[11px] font-mono text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>DEMONSTRATION TELEMETRY • SIMULATED EDGE DATA</span>
                <span className="text-[10px] opacity-80">Candidate: Priya Sharma • CS-201</span>
              </div>

              {/* Interactive Scenario Switcher */}
              <div className="border-b border-border bg-background px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-secondary">
                  Interactive AI Detection State:
                </span>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Detection scenarios">
                  {(['nominal', 'multiface', 'browser'] as PreviewScenario[]).map((key) => {
                    const sc = SCENARIOS[key];
                    const isSelected = scenario === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setScenario(key)}
                        className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                            : 'bg-card text-muted-foreground border border-border hover:bg-surface-elevated hover:text-foreground'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Telemetry Sensor Metrics Strip */}
              <div className="grid grid-cols-3 border-b border-border divide-x divide-border bg-card">
                {/* Trust Score */}
                <div className="p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider">Trust Index</span>
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="font-mono text-xl font-bold tabular-nums text-foreground flex items-baseline gap-1">
                    <AnimatedCounter value={active.trustScore} />
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  </p>
                  <StatusBadge tone={active.statusTone} className="mt-1 text-[10px] px-1.5 py-0">
                    {active.statusText}
                  </StatusBadge>
                </div>

                {/* Vision Sensor */}
                <div className="p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider">Vision Model</span>
                    <Camera className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p className="font-mono text-xs font-semibold tabular-nums text-foreground truncate">
                    {active.faceLabel}
                  </p>
                  <span className="font-mono text-[10px] text-muted-foreground block mt-1">
                    MediaPipe WASM (Edge)
                  </span>
                </div>

                {/* Audio Sensor */}
                <div className="p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider">Acoustic RMS</span>
                    <Volume2 className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <p className="font-mono text-xs font-semibold tabular-nums text-foreground truncate">
                    {active.audioDb}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden border border-border">
                    <div
                      className={`h-full transition-all duration-300 ${
                        active.audioPeak > 50 ? 'bg-critical' : 'bg-primary'
                      }`}
                      style={{ width: `${active.audioPeak}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Event Stream & Incident Feed */}
              <div className="p-4 space-y-3.5 bg-sidebar/50">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Correlated Event Timeline
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    UTC Synchronized
                  </span>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={scenario}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-2"
                  >
                    {active.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-md border border-border bg-card p-3 space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                ev.severity === 'critical'
                                  ? 'bg-critical'
                                  : ev.severity === 'warning'
                                    ? 'bg-warning'
                                    : 'bg-primary'
                              }`}
                            />
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {ev.type}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {ev.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-ink-secondary leading-relaxed">
                          {ev.explanation}
                        </p>

                        {ev.actionRequired && (
                          <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-warning">
                            <Flag className="h-3 w-3 shrink-0" />
                            <span>Action: {ev.actionRequired}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                {/* Verified Processing Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-success" />
                    <span>0s Raw Audio/Video Transmitted to Server</span>
                  </span>
                  <span className="font-medium text-primary flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    Human Review Required
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
