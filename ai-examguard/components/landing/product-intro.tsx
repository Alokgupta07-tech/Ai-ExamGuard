'use client';

import React from 'react';
import { BookOpen, Cpu, Eye, GraduationCap, Lock, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

const VERIFIED_PILLARS = [
  {
    icon: Cpu,
    title: '100% Client-Side Edge Inference',
    description: 'MediaPipe Tasks Vision WASM runs strictly inside the candidate browser memory.',
  },
  {
    icon: Lock,
    title: 'Zero Raw Video/Audio Upload',
    description: 'No continuous video or audio streams leave the examinee device. Only timestamps persist.',
  },
  {
    icon: ShieldCheck,
    title: 'PostgreSQL Row-Level Security',
    description: 'Universities and candidate data are strictly isolated by cryptographic tenant boundaries.',
  },
  {
    icon: UserCheck,
    title: 'Human-in-the-Loop Adjudication',
    description: 'AI signals surface explainable context to proctors; algorithms never disqualify students.',
  },
];

const ROLES = [
  {
    role: 'University Administrator',
    scope: 'Tenant & Security Governance',
    badge: 'Institutional Governance',
    color: 'text-primary border-primary/25 bg-primary/10',
    icon: ShieldCheck,
    description:
      'Provision institutional tenants, enforce proctoring sensitivity policies, onboard student cohorts via bulk CSV, and inspect immutable audit logs.',
  },
  {
    role: 'Faculty & Course Instructors',
    scope: 'Assessment & Question Authoring',
    badge: 'Exam Lifecycle',
    color: 'text-secondary border-secondary/25 bg-secondary/10',
    icon: BookOpen,
    description:
      'Author randomized MCQ question banks with protected server answer keys, schedule timed testing windows, and review submission analytics.',
  },
  {
    role: 'Live Invigilators & Proctors',
    scope: 'Real-Time Incident Telemetry',
    badge: 'SOC Command Center',
    color: 'text-warning border-warning/25 bg-warning/10',
    icon: Eye,
    description:
      'Monitor concurrent cohorts through a SecOps-grade telemetry console, triage explainable risk alerts, and record verified adjudication notes.',
  },
  {
    role: 'Examinees & Students',
    scope: 'Distraction-Free Testing',
    badge: 'Candidate Portal',
    color: 'text-success border-success/25 bg-success/10',
    icon: GraduationCap,
    description:
      'Calibrate hardware via transparent pre-flight checks and take high-stakes exams in a calm, accessible, and privacy-respecting interface.',
  },
];

/**
 * SECTION 1 — Trust and Platform Overview
 * A minimal full-width verified capabilities strip describing verified architecture
 * and supported institutional roles.
 */
export function ProductIntroSection() {
  return (
    <section
      id="overview"
      className="border-b border-border bg-sidebar py-16 sm:py-20 px-4 sm:px-8"
    >
      <ScrollRevealGroup className="mx-auto max-w-7xl space-y-12">
        {/* Full-width Verified Capabilities Strip */}
        <div className="reveal-item rounded-lg border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                Verified Architecture Guarantee
              </p>
              <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                Academic integrity built on zero-knowledge privacy
              </h2>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              FERPA & GDPR Aligned Design
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            {VERIFIED_PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4 Role Workspaces Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="reveal-item lg:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              <Users className="h-3 w-3" />
              <span>Multi-Role Governance</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for every stakeholder in university assessment
            </h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              AI ExamGuard unifies administration, faculty authoring, invigilator telemetry, and
              student examination into one cohesive platform. Every role is strictly isolated by
              database security policies.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  className="reveal-item card-hover-elevate rounded-lg border border-border bg-card p-6 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-md border ${item.color}`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground bg-surface-elevated px-2 py-0.5 rounded">
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      {item.role}
                    </h3>
                    <p className="text-xs font-mono text-primary font-medium">
                      {item.scope}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollRevealGroup>
    </section>
  );
}
