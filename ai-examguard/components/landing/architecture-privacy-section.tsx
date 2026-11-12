import React from 'react';
import {
  Cpu,
  Database,
  EyeOff,
  FileCheck2,
  HardDriveDownload,
  KeyRound,
  Lock,
  Network,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

/**
 * SECTION 5 — Responsible AI & Privacy Architecture
 * Comprehensive breakdown of local edge inference, data minimization,
 * human-in-the-loop oversight, and institutional security guarantees.
 */
export function ArchitecturePrivacySection() {
  return (
    <div className="bg-background">
      {/* Privacy-by-Design & Responsible AI */}
      <section
        id="privacy"
        className="border-b border-border py-16 sm:py-24 px-4 sm:px-8 bg-card/40"
      >
        <div className="mx-auto max-w-7xl space-y-12">
          {/* Header */}
          <ScrollRevealGroup className="max-w-3xl space-y-3">
            <div className="reveal-item inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <EyeOff className="h-3.5 w-3.5" />
              <span>RESPONSIBLE AI & ETHICAL OVERSIGHT</span>
            </div>
            <h2 className="reveal-item font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Privacy-by-Design with Client-Side Edge Inference
            </h2>
            <p className="reveal-item text-base text-muted-foreground leading-relaxed">
              We reject invasive surveillance. AI ExamGuard executes all computer vision and audio
              analysis directly inside the candidate’s local browser sandbox via WebAssembly.
              Zero video or audio streams ever leave the student’s workstation.
            </p>
          </ScrollRevealGroup>

          {/* 4 Core Ethical Pillars */}
          <ScrollRevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="reveal-item card-hover-elevate rounded-xl border border-border bg-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Local-First WASM Inference
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Face detection, gaze tracking, and acoustic RMS metering run via compiled WebAssembly
                  models directly in browser memory. Video frames are discarded immediately after inference.
                </p>
              </div>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-[11px] font-mono text-primary font-medium">
                <HardDriveDownload className="h-3.5 w-3.5" />
                <span>0 KB Media Stored Server-Side</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="reveal-item card-hover-elevate rounded-xl border border-border bg-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-secondary/25 bg-secondary/10 text-secondary">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Explainable Telemetry Events
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Instead of opaque risk scores, the engine generates explicit, verifiable structured
                  events with timestamp, detection duration, threshold confidence, and sensor classification.
                </p>
              </div>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-[11px] font-mono text-secondary font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>100% Audit-Trail Logged</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="reveal-item card-hover-elevate rounded-xl border border-border bg-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-success/25 bg-success/10 text-success">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Human-in-the-Loop Authority
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No automated penalties or automatic exam terminations. AI acts strictly as an investigative
                  copilot; certified human invigilators review events and make every final determination.
                </p>
              </div>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-[11px] font-mono text-success font-medium">
                <Scale className="h-3.5 w-3.5" />
                <span>Human Decision Guaranteed</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="reveal-item card-hover-elevate rounded-xl border border-border bg-card p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Zero Biometric Profiling
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No facial recognition, emotion analysis, or persistent biometric embeddings. The vision
                  pipeline only evaluates geometric presence and head orientation relative to the viewport.
                </p>
              </div>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-[11px] font-mono text-warning font-medium">
                <Shield className="h-3.5 w-3.5" />
                <span>FERPA & GDPR Compliant</span>
              </div>
            </div>
          </ScrollRevealGroup>

          {/* Privacy Guarantee Metric Banner */}
          <ScrollRevealGroup>
            <div className="reveal-item rounded-xl border border-primary/20 bg-primary/[0.03] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Institutional Privacy Guarantee
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  By executing edge vision models in the browser via WebAssembly, student camera feeds
                  never touch external cloud APIs. When an exam ends, local memory buffers are cleared
                  instantly.
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-background p-3 shrink-0 text-center w-full md:w-auto">
                <div className="px-4 py-2">
                  <div className="font-mono text-xl font-bold text-success">0 MB</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Cloud Video Stored</div>
                </div>
                <div className="px-4 py-2">
                  <div className="font-mono text-xl font-bold text-primary">100%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">WASM Sandboxed</div>
                </div>
                <div className="px-4 py-2">
                  <div className="font-mono text-xl font-bold text-secondary">0</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Biometric Vectors</div>
                </div>
              </div>
            </div>
          </ScrollRevealGroup>
        </div>
      </section>

      {/* Security Architecture & University LMS Integration */}
      <section
        id="security"
        className="border-b border-border py-16 sm:py-24 px-4 sm:px-8"
      >
        <div className="mx-auto max-w-7xl space-y-12">
          {/* Section Header */}
          <ScrollRevealGroup className="max-w-3xl space-y-3">
            <div className="reveal-item inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              <Shield className="h-3.5 w-3.5" />
              <span>DEFENSE-IN-DEPTH INFRASTRUCTURE</span>
            </div>
            <h2 className="reveal-item font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Institutional Security Architecture
            </h2>
            <p className="reveal-item text-base text-muted-foreground leading-relaxed">
              Every database query, session mutation, answer submission, and review operation is protected
              by multi-tenant isolation, cryptographic audit trails, and server-validated authorization.
            </p>
          </ScrollRevealGroup>

          {/* Architecture Cards Grid */}
          <ScrollRevealGroup className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Database & RLS Security */}
            <div className="reveal-item card-hover-elevate rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    PostgreSQL Row-Level Security (RLS)
                  </h3>
                </div>
                <StatusBadge tone="teal">Enforced</StatusBadge>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Multi-tenant isolation is built into the database kernel. PostgreSQL RLS policies
                prevent cross-tenant data leakage by automatically scoping all queries to the
                authenticated user’s university organization and assigned role.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-lg border border-border bg-sidebar p-3.5">
                  <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Server-Side Answer Key Protection
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Correct option IDs and grading rubrics are stripped from all student client payloads.
                      Scoring runs exclusively on isolated server actions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border bg-sidebar p-3.5">
                  <Server className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Session Integrity & Anti-Replay Tokens
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Exam sessions maintain cryptographically signed tokens. Answers are saved with
                      server-verified timestamps and idempotent sequence numbers to reject replay attacks.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise Campus Integration */}
            <div className="reveal-item card-hover-elevate rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-secondary/20 bg-secondary/10 text-secondary">
                    <Network className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    University & LMS Integration
                  </h3>
                </div>
                <StatusBadge tone="info">Ready</StatusBadge>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Seamlessly embed into existing university IT ecosystems. AI ExamGuard supports bulk
                roster provisioning, CSV cohort onboarding, and provides the architectural foundation
                for future LTI 1.3 and SAML 2.0 institutional SSO integrations.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-lg border border-border bg-sidebar p-3.5">
                  <KeyRound className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Granular 4-Tier Role-Based Access Control (RBAC)
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Distinct privilege boundaries for University Administrators, Faculty Creators,
                      Certified Invigilators, and Enrolled Students with zero privilege escalation paths.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border bg-sidebar p-3.5">
                  <Network className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Real-Time SOC Streaming with Fallback Polling
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Supabase Realtime WebSockets stream telemetry directly to invigilator consoles
                      with sub-100ms latency, backed by automatic heartbeat polling upon network jitter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollRevealGroup>
        </div>
      </section>
    </div>
  );
}
