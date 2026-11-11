import React from 'react';
import { BookOpen, Eye, GraduationCap, ShieldCheck } from 'lucide-react';

const ROLES = [
  {
    role: 'University Administrator',
    badge: 'Tenant & Governance',
    color: 'text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/10',
    icon: ShieldCheck,
    description:
      'Provision institutional tenants, manage role assignments, onboard student cohorts via CSV, and inspect immutable audit logs.',
  },
  {
    role: 'Faculty & Instructors',
    badge: 'Exam Authoring',
    color: 'text-[#2DD4BF] border-[#2DD4BF]/30 bg-[#2DD4BF]/10',
    icon: BookOpen,
    description:
      'Build courses, author randomized question banks, configure proctoring sensitivity rules, and review graded exam outcomes.',
  },
  {
    role: 'Live Invigilators',
    badge: 'Rapid Review',
    color: 'text-[#8B5CF6] border-[#8B5CF6]/30 bg-[#8B5CF6]/10',
    icon: Eye,
    description:
      'Monitor active examination cohorts in real time, triage explainable risk alerts, and log human adjudication decisions.',
  },
  {
    role: 'Students',
    badge: 'Distraction-Free',
    color: 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10',
    icon: GraduationCap,
    description:
      'Complete transparent pre-flight hardware checks and take timed assessments in a clean, calm, accessible interface.',
  },
];

/**
 * Product introduction section explaining the multi-role institutional platform.
 */
export function ProductIntroSection() {
  return (
    <section
      id="overview"
      className="border-b border-[#243249]/80 bg-[#0B1220]/50 py-20 px-4 sm:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-[#38BDF8]">
            Unified Examination Ecosystem
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
            Built for Every Stakeholder in Academic Integrity
          </h2>
          <p className="text-base text-[#94A3B8] leading-relaxed">
            AI ExamGuard is an independent online examination platform designed from the ground up
            for universities. Every role operates inside strict tenant-isolated permissions enforced
            at the database layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                className="rounded-xl border border-[#243249] bg-[#111B2D] p-6 flex flex-col justify-between space-y-5 hover:border-[#38BDF8]/40 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-mono text-[#94A3B8] border border-[#243249] bg-[#0B1220] px-2.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#F8FAFC]">
                    {item.role}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

