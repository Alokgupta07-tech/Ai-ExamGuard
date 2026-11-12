import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

/**
 * SECTION 8 — Compact Minimal Footer
 * Includes Logo, Navigation links, SRM University-AP configurable demonstration notice, and copyright.
 */
export function CompactFooter() {
  return (
    <footer className="border-t border-border bg-card py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-secondary">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <span className="font-heading text-xs font-semibold text-foreground">
              AI <span className="text-primary font-bold">ExamGuard</span>
            </span>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-5" aria-label="Footer navigation">
            <a href="#platform" className="hover:text-foreground transition-colors">
              Platform
            </a>
            <a href="#university" className="hover:text-foreground transition-colors">
              Campus
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              Workflow
            </a>
            <a href="#experience" className="hover:text-foreground transition-colors">
              Product
            </a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">
              Capabilities
            </a>
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <span className="text-border">|</span>
            <Link href="/login" className="hover:text-foreground transition-colors font-medium text-primary">
              Sign In
            </Link>
          </nav>

          {/* Right: Copyright */}
          <p className="text-[11px] text-ink-secondary">
            &copy; 2026 AI ExamGuard. All rights reserved.
          </p>
        </div>

        {/* Institutional Demonstration Notice */}
        <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-ink-secondary">
          <p>
            Demonstrated with <span className="font-medium text-foreground">SRM University–AP</span> institutional context. Institutional name, branding, and policies are fully configurable per tenant.
          </p>
          <p className="font-mono text-[10px]">
            WASM Edge Telemetry • PostgreSQL RLS Enforced
          </p>
        </div>
      </div>
    </footer>
  );
}
