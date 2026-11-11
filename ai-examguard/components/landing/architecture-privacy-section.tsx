import React from 'react';
import { Database, EyeOff, KeyRound, Network, Server, Shield } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';

/**
 * Combined Security Architecture, University Integration, and Privacy-by-Design sections.
 */
export function ArchitecturePrivacySection() {
  return (
    <div className="bg-[#080D18]">
      {/* Security Architecture & University Integration */}
      <section
        id="security"
        className="border-b border-[#243249]/80 py-20 px-4 sm:px-8"
      >
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Security Architecture */}
          <div className="rounded-2xl border border-[#243249] bg-[#111B2D] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone="cyan">Defense in Depth</StatusBadge>
              <Shield className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="space-y-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                Security Architecture
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Every database query, session mutation, and grading operation is guarded by
                server-side authentication and PostgreSQL Row-Level Security (RLS).
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-[#243249] bg-[#0B1220] p-4">
                <Database className="h-5 w-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">
                    Strict Tenant Isolation via RLS
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Universities never share table rows across tenants. Every membership and exam
                    query is bound to authenticated `tenant_id` policies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#243249] bg-[#0B1220] p-4">
                <Server className="h-5 w-5 text-[#2DD4BF] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">
                    Server-Validated Session & Grading
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Timer expirations, answer persistence, and trust-score adjustments happen
                    exclusively in verified server actions—preventing client tampering.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* University Integration */}
          <div className="rounded-2xl border border-[#243249] bg-[#111B2D] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone="teal">Campus Readiness</StatusBadge>
              <Network className="h-5 w-5 text-[#2DD4BF]" />
            </div>
            <div className="space-y-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                University Integration
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Deploy immediately as a standalone university exam portal, with an API-first schema
                designed for campus LMS and identity ecosystems.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-[#243249] bg-[#0B1220] p-4">
                <KeyRound className="h-5 w-5 text-[#8B5CF6] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">
                    Bulk Cohort Onboarding & Role Mapping
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Import student and faculty rosters via validated CSV pipelines with domain-aware
                    tenant memberships and audit logging.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#243249] bg-[#0B1220] p-4">
                <Network className="h-5 w-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">
                    Future LTI 1.3 & SAML/SSO Connector Foundation
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Tenant slug & integration architecture prepared for Canvas, Moodle, Blackboard,
                    and institutional SSO providers in upcoming releases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="border-b border-[#243249]/80 bg-[#0B1220]/50 py-20 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#22C55E]/30 bg-[#111B2D] p-8 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#22C55E]">
                <EyeOff className="h-4 w-4" />
                <span>Privacy-by-Design Commitment</span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                Zero Continuous Media Recording by Default
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Students deserve dignity and data minimization. Camera frames and microphone streams
                are analyzed ephemerally in browser memory—only structured telemetry events (such as
                timestamps, event categories, and confidence metrics) are transmitted for human
                invigilator review.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="rounded-xl border border-[#243249] bg-[#080D18] px-4 py-3 text-center">
                <p className="font-mono text-xl font-bold text-[#22C55E]">0 Bytes</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Raw Video Stored</p>
              </div>
              <div className="rounded-xl border border-[#243249] bg-[#080D18] px-4 py-3 text-center">
                <p className="font-mono text-xl font-bold text-[#38BDF8]">100%</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Human Adjudicated</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

