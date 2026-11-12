'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  ShieldCheck,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';

gsap.registerPlugin(useGSAP);

/**
 * SECTION 2 — Immersive University Hero
 * Features SRM University–AP campus architectural backdrop, balanced typography,
 * and a prominent, realistic AI ExamGuard examination telemetry console.
 */
export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion) return;

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      tl.from(leftColRef.current?.children || [], {
        opacity: 0,
        y: 18,
        duration: 0.7,
        stagger: 0.12,
      }).from(
        rightColRef.current,
        {
          opacity: 0,
          y: 24,
          scale: 0.98,
          duration: 0.8,
        },
        '-=0.45'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      id="platform"
      ref={containerRef}
      className="relative overflow-hidden bg-background pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-border"
    >
      {/* Subtle Atmospheric Campus Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-15 overflow-hidden">
        <Image
          src="/images/university/srmap-academic-block.jpg"
          alt="SRM University–AP Campus Architecture"
          fill
          priority
          className="object-cover object-center filter grayscale contrast-125"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading, Context, and CTAs */}
          <div ref={leftColRef} className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Building2 className="h-3.5 w-3.5" />
              <span>UNIVERSITY EXAMINATION SECURITY</span>
            </div>

            <div className="space-y-3.5">
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-foreground leading-[1.12]">
                Examinations, <br />
                Protected by <span className="text-primary">Intelligence.</span>
              </h1>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed max-w-md">
                Intelligent examination monitoring and assessment security for modern universities.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="default" className="h-10 px-5 text-xs font-semibold shadow-sm">
                <Link href="/signup" className="flex items-center gap-1.5">
                  <span>Launch Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="default"
                className="h-10 px-4 text-xs font-semibold border-border bg-card/80 backdrop-blur-xs hover:bg-black/5"
              >
                <Link href="/login">Institutional Sign In</Link>
              </Button>
            </div>

            {/* University Demonstration Indicator */}
            <div className="pt-2 flex items-center gap-2 text-xs text-ink-secondary">
              <span className="flex h-2 w-2 rounded-full bg-success" />
              <span>Demonstration Workspace: <strong className="text-foreground font-medium">SRM University–AP</strong></span>
            </div>
          </div>

          {/* Right Column: Prominent, realistic AI ExamGuard product interface preview */}
          <div ref={rightColRef} className="lg:col-span-7">
            <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden transition-all duration-300 hover:border-primary/40">
              {/* Product Preview Top Bar */}
              <div className="h-11 px-4 border-b border-border bg-surface-elevated/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
                  <span className="font-mono text-[11px] font-semibold text-foreground truncate">
                    SRM University–AP • School of Engineering and Sciences
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge tone="teal" className="h-5 px-2 text-[10px] font-mono">
                    Active • 60 FPS Edge Inference
                  </StatusBadge>
                </div>
              </div>

              {/* Course & Exam Subtitle Bar */}
              <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-[11px]">
                    ECE 302: Digital Electronics
                  </span>
                  <span className="text-border">|</span>
                  <span className="text-[11px] text-ink-secondary">
                    End Semester Examination
                  </span>
                </div>
                <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Hall 4B • Station 28
                </span>
              </div>

              {/* Status Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border bg-card text-xs">
                {/* 1. Monitoring Status */}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-ink-secondary text-[11px]">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <span>Monitoring Status</span>
                  </div>
                  <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>Operational</span>
                  </div>
                </div>

                {/* 2. Face Presence Status */}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-ink-secondary text-[11px]">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>Face Presence</span>
                  </div>
                  <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>1 Face Verified</span>
                  </div>
                </div>

                {/* 3. Audio Activity */}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-ink-secondary text-[11px]">
                    <Volume2 className="h-3.5 w-3.5 text-secondary" />
                    <span>Audio Activity</span>
                  </div>
                  <div className="font-mono text-foreground text-xs font-semibold flex items-center gap-2">
                    <span>-42 dB</span>
                    <span className="flex items-end gap-0.5 h-3">
                      <span className="w-1 h-1.5 rounded-full bg-success" />
                      <span className="w-1 h-2 rounded-full bg-success" />
                      <span className="w-1 h-1 rounded-full bg-success" />
                      <span className="w-1 h-0.5 rounded-full bg-border" />
                    </span>
                  </div>
                </div>

                {/* 4. Session Elapsed */}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-ink-secondary text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-ink-secondary" />
                    <span>Examination Time</span>
                  </div>
                  <div className="font-mono text-foreground text-xs font-semibold">
                    48:12 / 90:00
                  </div>
                </div>
              </div>

              {/* Recent Monitoring Events Feed */}
              <div className="p-4 space-y-3 bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Recent Telemetry Events
                  </span>
                  <div className="flex items-center gap-1.5 text-ink-secondary text-[11px]">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Invigilator Review:</span>
                    <span className="font-semibold text-success">Verified</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Event 1 */}
                  <div className="rounded-lg border border-border bg-background/80 p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-ink-secondary shrink-0">14:02:11</span>
                      <StatusBadge tone="success" className="h-4 px-1.5 text-[9px] shrink-0 font-mono">
                        NOMINAL
                      </StatusBadge>
                      <span className="truncate text-foreground text-xs font-medium">
                        Face presence confirmed: candidate centered
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-ink-secondary shrink-0 hidden sm:inline">
                      0.98 conf
                    </span>
                  </div>

                  {/* Event 2 */}
                  <div className="rounded-lg border border-border bg-background/80 p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-ink-secondary shrink-0">14:01:45</span>
                      <StatusBadge tone="info" className="h-4 px-1.5 text-[9px] shrink-0 font-mono">
                        AUDIO
                      </StatusBadge>
                      <span className="truncate text-foreground text-xs font-medium">
                        Ambient acoustic level within lecture hall baseline
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-ink-secondary shrink-0 hidden sm:inline">
                      -44 dB RMS
                    </span>
                  </div>

                  {/* Event 3 */}
                  <div className="rounded-lg border border-border bg-background/80 p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-ink-secondary shrink-0">14:00:00</span>
                      <StatusBadge tone="teal" className="h-4 px-1.5 text-[9px] shrink-0 font-mono">
                        SESSION
                      </StatusBadge>
                      <span className="truncate text-foreground text-xs font-medium">
                        Fullscreen locked & security handshake established
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-success shrink-0 hidden sm:inline">
                      Protected
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview Footer / Simulated Label */}
              <div className="px-4 py-2 border-t border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-ink-secondary font-mono">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary" />
                  <span>DEMONSTRATION TELEMETRY • SIMULATED EDGE DATA</span>
                </div>
                <div className="flex items-center gap-1 text-foreground font-sans font-medium">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span>Human Examiner Assigned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
