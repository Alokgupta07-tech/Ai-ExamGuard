import React from 'react';
import { BookOpen, Eye, GraduationCap, ShieldCheck } from 'lucide-react';

const ROLES = [
  {
    role: 'University Administrator',
    scope: 'Tenant & Governance',
    color: 'text-primary border-primary/30 bg-primary/10',
    icon: ShieldCheck,
    description:
      'Provision institutional tenants, manage role assignments, onboard student cohorts via CSV, and inspect immutable audit logs.',
  },
  {
    role: 'Faculty & Instructors',
    scope: 'Exam Authoring',
    color: 'text-secondary border-secondary/30 bg-secondary/10',
    icon: BookOpen,
    description:
      'Build courses, author randomized question banks, configure proctoring sensitivity rules, and review graded exam outcomes.',
  },
  {
    role: 'Live Invigilators',
    scope: 'Human Review',
    color: 'text-warning border-warning/30 bg-warning/10',
    icon: Eye,
    description:
      'Monitor active examination cohorts in real time, triage explainable risk alerts, and log human adjudication decisions.',
  },
  {
    role: 'Students',
    scope: 'Candidate Workspace',
    color: 'text-success border-success/30 bg-success/10',
    icon: GraduationCap,
    description:
      'Complete transparent pre-flight hardware checks and take timed assessments in a calm, accessible interface.',
  },
];

/**
 * Product introduction ledger explaining the four role-isolated portals.
 */
export function ProductIntroSection() {
  return (
    <section
      id="overview"
      className="border-b border-border bg-sidebar py-16 sm:py-20 px-4 sm:px-8"
    >
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-4">
          <p className="text-xs font-medium text-primary">
            Unified examination ecosystem
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Built for every stakeholder in academic integrity
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            AI ExamGuard is an online examination platform engineered for universities. Every role
            operates inside tenant-isolated permissions enforced at the PostgreSQL layer.
          </p>
        </div>

        {/* Hairline 2x2 architectural matrix */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {ROLES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                className="bg-card p-6 flex flex-col justify-between gap-4 hover:bg-surface-elevated transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-md border ${item.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.scope}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {item.role}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
