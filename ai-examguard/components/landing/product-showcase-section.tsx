'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Bookmark,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  Mic,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';
import { cn } from '@/lib/utils';

type ProductTab = 'admin' | 'faculty' | 'student' | 'invigilator';

interface TabMeta {
  id: ProductTab;
  label: string;
  roleTitle: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  ctaHref: string;
  ctaText: string;
}

const TABS: TabMeta[] = [
  {
    id: 'admin',
    label: 'University Administration',
    roleTitle: 'Enterprise Institutional Governance',
    subtitle: 'Manage university tenants, role memberships, security thresholds, and immutable audit logs.',
    icon: ShieldCheck,
    ctaHref: '/admin',
    ctaText: 'Explore Admin Console',
  },
  {
    id: 'faculty',
    label: 'Faculty Management',
    roleTitle: 'Exam & Question Bank Authoring',
    subtitle: 'Author MCQ assessments in a 6-step wizard with server-isolated answer keys and cohort scheduling.',
    icon: BookOpen,
    ctaHref: '/faculty',
    ctaText: 'Explore Faculty Portal',
  },
  {
    id: 'student',
    label: 'Student Examination',
    roleTitle: 'Distraction-Free Candidate Taking Screen',
    subtitle: 'Take high-stakes assessments with transparent sensor disclosures, real-time timer, and auto-save.',
    icon: GraduationCap,
    ctaHref: '/student',
    ctaText: 'Explore Student Experience',
  },
  {
    id: 'invigilator',
    label: 'Invigilator Command Centre',
    roleTitle: 'SecOps-Grade Real-Time Telemetry SOC',
    subtitle: 'Live candidate monitoring roster, real-time explainable alert queue, and human adjudication actions.',
    icon: Eye,
    ctaHref: '/invigilator',
    ctaText: 'Explore Invigilator SOC',
  },
];

/**
 * SECTION 4 — Product Experience
 * Authentic, interactive product preview showcasing actual user interfaces
 * across all 4 institutional roles.
 */
export function ProductShowcaseSection() {
  const [activeTab, setActiveTab] = useState<ProductTab>('invigilator');
  const prefersReducedMotion = useReducedMotion();
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <section
      id="experience"
      className="border-b border-border bg-background py-16 sm:py-24 px-4 sm:px-8"
    >
      <ScrollRevealGroup className="mx-auto max-w-7xl space-y-12">
        {/* Section Heading */}
        <div className="reveal-item flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Authentic Product Showcase</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Experience AI ExamGuard across every user role
            </h2>
            <p className="text-base text-ink-secondary leading-relaxed">
              Every portal is purpose-built for its stakeholder: clean governance for admins, intuitive
              authoring for faculty, focused testing for students, and telemetry for invigilators.
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="self-start md:self-auto font-medium">
            <Link href={currentTab.ctaHref} className="flex items-center gap-2">
              <span>{currentTab.ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Tab Selector */}
        <div className="reveal-item flex flex-wrap gap-2 border-b border-border pb-4" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer border',
                  isSelected
                    ? 'border-primary/40 bg-primary/10 text-primary font-semibold shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Showcase Stage */}
        <div className="reveal-item rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          {/* Showcase Frame Header */}
          <div className="border-b border-border bg-surface-elevated/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                {currentTab.roleTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentTab.subtitle}
              </p>
            </div>
            <StatusBadge tone="teal" className="text-xs">
              Live Product View
            </StatusBadge>
          </div>

          {/* Tab Content Canvas */}
          <div className="p-4 sm:p-6 lg:p-8 bg-background">
            <AnimatePresence mode="wait" initial={false}>
              {/* 1. ADMIN DASHBOARD PREVIEW */}
              {activeTab === 'admin' && (
                <motion.div
                  key="admin"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Top Admin KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Total Enrolled Students</p>
                      <p className="font-mono text-2xl font-bold text-foreground mt-1">1,248</p>
                      <span className="text-[11px] text-success font-medium">↑ 14% this semester</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Active Faculty Members</p>
                      <p className="font-mono text-2xl font-bold text-foreground mt-1">42</p>
                      <span className="text-[11px] text-primary font-medium">Across 8 departments</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Monitored Exam Sessions</p>
                      <p className="font-mono text-2xl font-bold text-foreground mt-1">3,492</p>
                      <span className="text-[11px] text-secondary font-medium">PostgreSQL RLS verified</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Average Trust Score</p>
                      <p className="font-mono text-2xl font-bold text-success mt-1">94.8%</p>
                      <span className="text-[11px] text-muted-foreground">0.8% flagged for review</span>
                    </div>
                  </div>

                  {/* Member Directory & Policy Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    <div className="lg:col-span-8 rounded-lg border border-border bg-card overflow-hidden shadow-xs">
                      <div className="px-4 py-3 border-b border-border bg-surface-elevated/40 flex items-center justify-between">
                        <span className="font-heading text-sm font-semibold text-foreground">
                          Institutional Member Directory
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">Tenant: Stanford CS</span>
                      </div>
                      <div className="divide-y divide-border text-xs">
                        {[
                          { name: 'Dr. Eleanor Vance', email: 'vance@university.edu', role: 'Faculty', joined: 'Sep 12, 2026' },
                          { name: 'Marcus Sterling', email: 'sterling@university.edu', role: 'Invigilator', joined: 'Oct 04, 2026' },
                          { name: 'Priya Sharma', email: 'sharma.p@university.edu', role: 'Student', joined: 'Nov 01, 2026' },
                        ].map((m) => (
                          <div key={m.email} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                {m.name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{m.name}</p>
                                <p className="text-muted-foreground">{m.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <StatusBadge tone={m.role === 'Faculty' ? 'info' : m.role === 'Invigilator' ? 'warning' : 'success'}>
                                {m.role}
                              </StatusBadge>
                              <span className="font-mono text-muted-foreground hidden sm:inline">{m.joined}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-4 rounded-lg border border-border bg-card p-5 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <h4 className="font-heading text-sm font-semibold text-foreground">
                          Default Security Policies
                        </h4>
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-elevated/40">
                          <span className="font-medium text-foreground">Camera Presence Lock</span>
                          <span className="font-mono text-success font-semibold">ENFORCED</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-elevated/40">
                          <span className="font-medium text-foreground">Microphone RMS Energy</span>
                          <span className="font-mono text-success font-semibold">ENFORCED</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-elevated/40">
                          <span className="font-medium text-foreground">Browser Fullscreen Guard</span>
                          <span className="font-mono text-success font-semibold">ENFORCED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 2. FACULTY DASHBOARD PREVIEW */}
              {activeTab === 'faculty' && (
                <motion.div
                  key="faculty"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* 6-Step Wizard Stepper Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-px bg-border border border-border rounded-lg overflow-hidden text-xs">
                    {[
                      { step: '1', title: 'Exam Info', active: false, done: true },
                      { step: '2', title: 'Questions', active: true, done: false },
                      { step: '3', title: 'Timing', active: false, done: false },
                      { step: '4', title: 'Assignments', active: false, done: false },
                      { step: '5', title: 'Monitoring', active: false, done: false },
                      { step: '6', title: 'Publish', active: false, done: false },
                    ].map((st) => (
                      <div
                        key={st.step}
                        className={cn(
                          'p-3 flex items-center gap-2',
                          st.active ? 'bg-primary/10 border-b-2 border-primary text-primary font-semibold' : 'bg-card text-muted-foreground'
                        )}
                      >
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded font-mono text-[11px] font-bold', st.done ? 'bg-success/20 text-success' : st.active ? 'bg-primary text-primary-foreground' : 'bg-surface-elevated')}>
                          {st.done ? <Check className="h-3 w-3" /> : st.step}
                        </span>
                        <span className="truncate">{st.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* Question Composer Preview */}
                  <div className="rounded-lg border border-border bg-card p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <span className="font-mono text-xs font-semibold text-primary">CS-201 Final Examination</span>
                        <h4 className="font-heading text-base font-bold text-foreground">
                          Question 4: Balanced Tree Red-Black Properties
                        </h4>
                      </div>
                      <StatusBadge tone="teal">5 Points • Server Key Isolated</StatusBadge>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      {[
                        { letter: 'A', text: 'Every leaf node (NIL) must be black.', correct: true },
                        { letter: 'B', text: 'If a node is red, both of its children must be red.', correct: false },
                        { letter: 'C', text: 'The root node is permitted to be red.', correct: false },
                        { letter: 'D', text: 'Simple paths to leaves can contain unequal black heights.', correct: false },
                      ].map((opt) => (
                        <div
                          key={opt.letter}
                          className={cn(
                            'p-3 rounded border flex items-center justify-between',
                            opt.correct ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-border bg-surface-elevated/40 text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-card border font-bold">
                              {opt.letter}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {opt.correct && <span className="text-[10px] uppercase font-bold text-primary">Correct Option (Protected)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3. STUDENT EXAMINATION PREVIEW */}
              {activeTab === 'student' && (
                <motion.div
                  key="student"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Clean Distraction-Free Top Bar */}
                  <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
                        CS-201
                      </span>
                      <h4 className="font-heading text-sm font-semibold text-foreground">
                        Data Structures & Algorithms Final Examination
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Camera className="h-3.5 w-3.5 text-success" />
                        <span>Face: OK</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mic className="h-3.5 w-3.5 text-success" />
                        <span>Mic: OK</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-primary bg-primary/10 px-3 py-1 rounded border border-primary/25">
                        <Clock className="h-3.5 w-3.5" />
                        <span>48:22 Remaining</span>
                      </div>
                    </div>
                  </div>

                  {/* Question Stage Card */}
                  <div className="rounded-lg border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl mx-auto">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Question 3 of 20
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">4 Marks</span>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <Bookmark className="h-3.5 w-3.5 text-warning fill-warning" />
                        <span>Marked for Review</span>
                      </Button>
                    </div>

                    <p className="text-base font-medium text-foreground leading-relaxed">
                      What is the worst-case asymptotic time complexity for inserting an element into an AVL tree with n nodes?
                    </p>

                    <div className="space-y-3">
                      {[
                        { key: 'A', text: 'O(1) amortized', selected: false },
                        { key: 'B', text: 'O(log n) guaranteed', selected: true },
                        { key: 'C', text: 'O(n) worst case', selected: false },
                        { key: 'D', text: 'O(n log n)', selected: false },
                      ].map((ans) => (
                        <div
                          key={ans.key}
                          className={cn(
                            'p-4 rounded-md border flex items-center justify-between transition-colors cursor-pointer',
                            ans.selected
                              ? 'border-primary bg-primary/10 text-foreground font-medium'
                              : 'border-border bg-background hover:bg-surface-elevated/60 text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn('flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold border', ans.selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface-elevated text-muted-foreground border-border')}>
                              {ans.key}
                            </span>
                            <span className="text-sm">{ans.text}</span>
                          </div>
                          {ans.selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </div>
                      ))}
                    </div>

                    {/* Bottom Navigator */}
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <Button variant="outline" size="sm" className="text-xs">Previous</Button>
                      <span className="font-mono text-xs text-muted-foreground">Answer Saved Automatically</span>
                      <Button size="sm" className="text-xs">Next Question</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. INVIGILATOR SOC COMMAND CENTRE PREVIEW */}
              {activeTab === 'invigilator' && (
                <motion.div
                  key="invigilator"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Top SOC Metrics Strip */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Active Candidates</p>
                      <p className="font-mono text-2xl font-bold text-foreground mt-1">142</p>
                      <span className="text-[11px] text-success font-medium">100% telemetry online</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Active Incidents</p>
                      <p className="font-mono text-2xl font-bold text-critical mt-1">3</p>
                      <span className="text-[11px] text-critical font-medium">Immediate triage queue</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Camera Feeds Operational</p>
                      <p className="font-mono text-2xl font-bold text-primary mt-1">98.6%</p>
                      <span className="text-[11px] text-primary font-medium">Local WASM detection</span>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card shadow-xs">
                      <p className="text-xs text-muted-foreground">Acoustic Baselines</p>
                      <p className="font-mono text-2xl font-bold text-secondary mt-1">100%</p>
                      <span className="text-[11px] text-muted-foreground">Ambient RMS calibration</span>
                    </div>
                  </div>

                  {/* Candidate Roster + Live Incident Queue Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Candidate Roster (Span 7) */}
                    <div className="lg:col-span-7 rounded-lg border border-border bg-card overflow-hidden shadow-xs">
                      <div className="px-4 py-3 border-b border-border bg-surface-elevated/50 flex items-center justify-between">
                        <span className="font-heading text-sm font-semibold text-foreground">
                          Candidate Monitoring Roster
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">CS-201 Cohort</span>
                      </div>
                      <div className="divide-y divide-border text-xs">
                        {[
                          { name: 'Priya Sharma', cam: true, mic: true, trust: 98, status: 'In Progress' },
                          { name: 'Devon Vance', cam: true, mic: true, trust: 74, status: 'Flagged Incident' },
                          { name: 'Chloe Dubois', cam: true, mic: true, trust: 96, status: 'In Progress' },
                        ].map((c) => (
                          <div key={c.name} className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{c.name}</p>
                              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                                <span className={c.cam ? 'text-success' : 'text-critical'}>● Cam</span>
                                <span className={c.mic ? 'text-success' : 'text-warning'}>● Mic</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn('font-mono font-bold text-sm', c.trust >= 85 ? 'text-success' : 'text-critical')}>
                                {c.trust}%
                              </span>
                              <StatusBadge tone={c.trust >= 85 ? 'success' : 'critical'}>
                                {c.status}
                              </StatusBadge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Alert Queue (Span 5) */}
                    <div className="lg:col-span-5 rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <span className="font-heading text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-critical" />
                          Live Alert Queue
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">Realtime Supabase</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded border border-critical/30 bg-critical/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-critical">● CRITICAL • MULTI_FACE</span>
                            <span className="font-mono text-[10px] text-muted-foreground">14:18:44</span>
                          </div>
                          <p className="text-foreground">Devon Vance — 2 distinct faces detected in frame for 3.2s.</p>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button className="px-2 py-0.5 rounded border border-border bg-card text-[11px] hover:bg-surface-elevated">Dismiss</button>
                            <button className="px-2 py-0.5 rounded bg-critical text-primary-foreground text-[11px]">Escalate</button>
                          </div>
                        </div>

                        <div className="p-3 rounded border border-warning/30 bg-warning/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-warning">● MEDIUM • TAB_HIDDEN</span>
                            <span className="font-mono text-[10px] text-muted-foreground">14:16:12</span>
                          </div>
                          <p className="text-foreground">Priya Sharma — Document visibility lost for 4.1s.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </ScrollRevealGroup>
    </section>
  );
}
