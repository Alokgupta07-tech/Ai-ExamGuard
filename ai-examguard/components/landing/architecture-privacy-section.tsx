import React from 'react';
import { Database, EyeOff, KeyRound, Network, Server, Shield } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

/**
 * Combined Security Architecture, University Integration, and Privacy-by-Design sections.
 */
export function ArchitecturePrivacySection() {
  return (
    <div className="bg-background">
      {/* Security Architecture & University Integration */}
      <section
        id="security"
        className="border-b border-border py-16 sm:py-20 px-4 sm:px-8"
      >
        <ScrollRevealGroup className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Security Architecture */}
          <div className="reveal-item card-hover-elevate rounded-lg border border-border bg-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone="cyan">Defense in depth</StatusBadge>
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2.5">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Security Architecture
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Every database query, session mutation, and grading operation is guarded by
                server-side authentication and PostgreSQL Row-Level Security (RLS).
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 rounded-md border border-border bg-sidebar p-4">
                <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Strict tenant isolation via RLS
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Universities never share table rows across tenants. Every membership and exam
                    query is bound to authenticated tenant policies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-sidebar p-4">
                <Server className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Server-validated sessions and grading
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Timer expirations, answer persistence, answer-key isolation, and scoring run
                    exclusively in verified server actions to prevent client tampering.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* University Integration */}
          <div className="reveal-item card-hover-elevate rounded-lg border border-border bg-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone="teal">Campus readiness</StatusBadge>
              <Network className="h-5 w-5 text-secondary" />
            </div>
            <div className="space-y-2.5">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                University Integration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Deploy immediately as a standalone university examination portal, built on a relational
                schema structured for campus LMS and identity ecosystems.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 rounded-md border border-border bg-sidebar p-4">
                <KeyRound className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Bulk cohort onboarding and role mapping
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Import student and faculty rosters via validated CSV pipelines with domain-aware
                    tenant memberships and audit logging.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-sidebar p-4">
                <Network className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Future LTI 1.3 and SAML/SSO foundation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Tenant slug and integration architecture prepared for Canvas, Moodle, Blackboard,
                    and institutional identity providers in upcoming releases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollRevealGroup>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="border-b border-border bg-sidebar py-16 sm:py-20 px-4 sm:px-8">
        <ScrollRevealGroup className="mx-auto max-w-6xl">
          <div className="reveal-item card-hover-elevate rounded-lg border border-success/35 bg-card p-6 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-success">
                <EyeOff className="h-4 w-4" />
                <span>Privacy-by-design commitment</span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                Zero continuous media recording by default
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Students deserve dignity and strict data minimization. Camera frames and microphone
                streams are analyzed ephemerally in browser memory, so only structured telemetry
                events (timestamps, event categories, confidence metrics) are transmitted for
                human invigilator review.
              </p>
            </div>

            <div className="grid grid-cols-2 border border-border rounded-md overflow-hidden divide-x divide-border bg-background w-full md:w-auto shrink-0">
              <div className="px-5 py-4 text-center">
                <p className="font-mono text-xl font-bold tabular-nums text-success">0 Bytes</p>
                <p className="text-xs text-muted-foreground mt-1">Raw video stored</p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="font-mono text-xl font-bold tabular-nums text-primary">100%</p>
                <p className="text-xs text-muted-foreground mt-1">Human adjudicated</p>
              </div>
            </div>
          </div>
          </div>
        </ScrollRevealGroup>
      </section>
    </div>
  );
}
