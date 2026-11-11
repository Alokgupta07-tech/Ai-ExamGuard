'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  Eye,
  GraduationCap,
  Lock,
  ShieldCheck,
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
    faceCount: '1 Face Verified',
    audioDb: '-42 dB (Ambient)',
    tone: 'success',
    statusText: 'Telemetry Nominal',
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
        description: 'Document visibility & fullscreen state verified with zero focus loss.',
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
    faceCount: '2 Faces Detected',
    audioDb: '-21 dB (Spike)',
    tone: 'critical',
    statusText: 'Flagged for Human Review',
    events: [
      {
        id: 'prev-3',
        title: 'Multiple Faces Detected in Frame',
        description:
          'Edge vision model detected 2 distinct faces for >3.0s. Escalated as explainable indicator for invigilator inspection.',
        timestamp: '14:18:44 UTC',
        severity: 'critical',
        category: 'camera',
        metadata: { faces: 2, confidence: '0.94', autoPenalty: 'None (Human Review)' },
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
    label: 'Tab Visibility Loss',
    trustScore: 84,
    faceCount: '1 Face Verified',
    audioDb: '-40 dB (Ambient)',
    tone: 'warning',
    statusText: 'Visibility Alert Logged',
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
        description: 'Question payload delivered stripped of is_correct grading attributes.',
        timestamp: '14:00:02 UTC',
        severity: 'info',
        category: 'system',
        metadata: { rls: 'enforced' },
      },
    ],
  },
};

/**
 * Hero section featuring GSAP entrance choreography and a genuine interactive telemetry console preview.
 */
export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenario, setScenario] = useState<PreviewScenario>('nominal');

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      gsap.from('.hero-stagger', {
        y: 22,
        opacity: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      gsap.from('.hero-console', {
        y: 28,
        opacity: 0,
        duration: 0.9,
        delay: 0.25,
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
      className="relative overflow-hidden border-b border-[#243249]/80 bg-[#080D18] pt-14 pb-20 sm:pt-20 sm:pb-28"
    >
      {/* Subtle cybersecurity grid & ambient glows */}
      <div className="pointer-events-none absolute inset-0 bg-cyber-grid opacity-45" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[420px] w-[780px] rounded-full bg-[#38BDF8]/12 blur-[140px]" />
        <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-[#8B5CF6]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-[#2DD4BF]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Brand Value Proposition */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="hero-stagger inline-flex items-center gap-2 rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-4 py-1.5 text-xs font-mono text-[#38BDF8]">
              <Cpu className="h-3.5 w-3.5" />
              <span>Edge-First Examination Integrity Architecture</span>
            </div>

            <h1 className="hero-stagger font-heading text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.08]">
              Examinations,{' '}
              <span className="bg-gradient-to-r from-[#38BDF8] via-[#2DD4BF] to-[#8B5CF6] bg-clip-text text-transparent">
                Protected by Intelligence.
              </span>
            </h1>

            <p className="hero-stagger text-base sm:text-lg text-[#94A3B8] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              A university-grade online examination platform combining in-browser MediaPipe face
              detection, Web Audio energy monitoring, and explainable risk telemetry—with zero
              raw video retention and human-in-the-loop review.
            </p>

            <div className="hero-stagger flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-[#38BDF8] text-[#080D18] font-semibold shadow-xl shadow-[#38BDF8]/20 hover:bg-[#38BDF8]/90 px-7"
              >
                <Link href="/signup" className="flex items-center gap-2">
                  <span>Launch University Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#243249] bg-[#111B2D]/80 text-[#F8FAFC] hover:bg-[#17243A] px-7"
              >
                <Link href="/login">Institutional Sign In</Link>
              </Button>
            </div>

            {/* Role Portals Quick Jump */}
            <div className="hero-stagger pt-6 border-t border-[#243249]/70">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8] mb-3">
                Role-Isolated Workspaces
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Link
                  href="/admin"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#243249] bg-[#111B2D]/80 px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#38BDF8]/50 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#38BDF8]" />
                  <span>Admin</span>
                </Link>
                <Link
                  href="/faculty"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#243249] bg-[#111B2D]/80 px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#2DD4BF]/50 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  <span>Faculty</span>
                </Link>
                <Link
                  href="/invigilator"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#243249] bg-[#111B2D]/80 px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#8B5CF6]/50 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 text-[#8B5CF6]" />
                  <span>Invigilator</span>
                </Link>
                <Link
                  href="/student"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#243249] bg-[#111B2D]/80 px-3 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#22C55E]/50 transition-colors"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-[#22C55E]" />
                  <span>Student</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Real-Component Invigilator Telemetry Preview */}
          <div className="hero-console lg:col-span-6">
            <div className="rounded-2xl border border-[#243249] bg-[#0B1220]/95 shadow-2xl shadow-black/60 overflow-hidden">
              {/* Mock Window Titlebar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#243249] bg-[#111B2D] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/70" />
                  </div>
                  <span className="ml-2 text-xs font-mono text-[#94A3B8]">
                    invigilator-telemetry-preview.tsx
                  </span>
                </div>

                <StatusBadge tone={active.tone} pulse>
                  {active.statusText}
                </StatusBadge>
              </div>

              {/* Scenario Switcher */}
              <div className="border-b border-[#243249] bg-[#080D18]/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                  Interactive UI Preview:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['nominal', 'multiface', 'browser'] as PreviewScenario[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScenario(key)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                        scenario === key
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                          : 'bg-[#17243A]/60 text-[#94A3B8] border border-[#243249] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {SCENARIO_CONFIG[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Component Readouts */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-3">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                      <span>Trust Index</span>
                      <Activity className="h-3.5 w-3.5 text-[#38BDF8]" />
                    </div>
                    <p className="font-mono text-xl font-bold text-[#F8FAFC]">
                      {active.trustScore}
                      <span className="text-xs text-[#94A3B8]">/100</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-3">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                      <span>Vision Edge</span>
                      <Eye className="h-3.5 w-3.5 text-[#2DD4BF]" />
                    </div>
                    <p className="font-mono text-xs sm:text-sm font-semibold text-[#F8FAFC] truncate">
                      {active.faceCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-3">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                      <span>Audio RMS</span>
                      <Volume2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
                    </div>
                    <p className="font-mono text-xs sm:text-sm font-semibold text-[#F8FAFC] truncate">
                      {active.audioDb}
                    </p>
                  </div>
                </div>

                {/* Real EventTimeline Component */}
                <EventTimeline events={active.events} />

                <div className="flex items-center justify-between rounded-lg border border-[#243249] bg-[#17243A]/40 px-3 py-2 text-[11px] text-[#94A3B8]">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#22C55E]" />
                    <span>Zero raw webcam/mic frames leave the browser</span>
                  </span>
                  <span className="font-mono text-[#38BDF8]">Human Review Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

