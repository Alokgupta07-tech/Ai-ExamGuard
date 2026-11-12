import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';

/**
 * SECTION 6 & 7 — Final Call to Action & Institutional Footer
 * Features explicit CTAs ("Launch University Workspace" and "Institutional Sign In"),
 * comprehensive sitemap navigation, system operational status, and legal disclosures.
 */
export function CtaFooterSection() {
  return (
    <>
      {/* SECTION 6 — Call to Action */}
      <section className="relative overflow-hidden bg-background py-20 sm:py-28 px-4 sm:px-8 border-b border-border">
        {/* Subtle background ambient grid and radial highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-radial-cyber opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cyber-grid opacity-30"
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-6">
          <ScrollRevealGroup className="space-y-4">
            <div className="reveal-item inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>READY FOR UNIVERSITY DEPLOYMENT</span>
            </div>

            <h2 className="reveal-item font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Empower academic integrity with transparent intelligence.
            </h2>

            <p className="reveal-item text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Deploy client-side proctoring telemetry in minutes. Built for higher education security,
              candidate privacy, and human invigilator oversight.
            </p>
          </ScrollRevealGroup>

          {/* Action Buttons */}
          <ScrollRevealGroup>
            <div className="reveal-item flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-7 text-sm font-semibold shadow-sm">
                <Link href="/signup" className="flex items-center justify-center gap-2">
                  <span>Launch University Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 text-sm font-semibold border-border hover:bg-card"
              >
                <Link href="/login">Institutional Sign In</Link>
              </Button>
            </div>

            {/* Trust statement */}
            <div className="reveal-item flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>Zero raw video stored</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Client-side WASM inference</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                <span>100% human-adjudicated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                <span>FERPA & GDPR aligned</span>
              </div>
            </div>
          </ScrollRevealGroup>
        </div>
      </section>

      {/* SECTION 7 — Institutional Footer */}
      <footer className="bg-sidebar py-12 sm:py-16 px-4 sm:px-8 border-t border-border">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="font-heading text-base font-bold text-foreground">
                    AI <span className="text-primary">ExamGuard</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Enterprise Academic Integrity Infrastructure
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                Next-generation digital examination proctoring engineered for modern universities.
                Combining client-side WebAssembly computer vision, acoustic event detection, and
                human-centric invigilation workflows.
              </p>

              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="font-mono text-[11px]">System Status: Operational • All Edge Analyzers Active</span>
              </div>
            </div>

            {/* Sitemap Column 1: Platform & Architecture */}
            <div className="space-y-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                Architecture
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#overview" className="hover:text-primary transition-colors">
                    Platform Overview
                  </a>
                </li>
                <li>
                  <a href="#capabilities" className="hover:text-primary transition-colors">
                    Core Capabilities
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-primary transition-colors">
                    Assessment Lifecycle
                  </a>
                </li>
                <li>
                  <a href="#experience" className="hover:text-primary transition-colors">
                    Product Experience
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-primary transition-colors">
                    Security & RLS
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="hover:text-primary transition-colors">
                    Privacy-by-Design
                  </a>
                </li>
              </ul>
            </div>

            {/* Sitemap Column 2: Role Workspaces */}
            <div className="space-y-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                Institutional Portals
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/admin" className="hover:text-primary transition-colors">
                    University Admin Console
                  </Link>
                </li>
                <li>
                  <Link href="/faculty" className="hover:text-primary transition-colors">
                    Faculty Assessment Studio
                  </Link>
                </li>
                <li>
                  <Link href="/invigilator" className="hover:text-primary transition-colors">
                    Invigilator Command Centre
                  </Link>
                </li>
                <li>
                  <Link href="/student" className="hover:text-primary transition-colors">
                    Student Examination Portal
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-primary transition-colors">
                    Institutional SSO Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-primary transition-colors">
                    Register Institution
                  </Link>
                </li>
              </ul>
            </div>

            {/* Sitemap Column 3: Trust & Compliance */}
            <div className="space-y-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
                Compliance & Trust
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>WASM Edge Processing</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span>FERPA Data Minimization</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span>GDPR Candidate Rights</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                  <span>Human-in-the-Loop Policy</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-warning" />
                  <span>Zero Biometric Storage</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              &copy; 2026 AI ExamGuard Inc. All rights reserved. Built for higher education integrity.
            </p>
            <div className="flex items-center gap-6">
              <a href="#privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#security" className="hover:text-foreground transition-colors">
                Security Disclosures
              </a>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Portal Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
