'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '#overview', label: 'Platform' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#security', label: 'Architecture' },
  { href: '#privacy', label: 'Privacy' },
];

/**
 * Sticky solid-surface header for the public AI ExamGuard platform.
 */
export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-base font-bold tracking-tight text-foreground">
              AI <span className="text-primary">ExamGuard</span>
            </span>
            <span className="hidden sm:inline font-mono text-xs text-muted-foreground">
              v1.0
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Landing navigation">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/login">Institutional sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Launch workspace</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground cursor-pointer"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-sidebar px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Institutional sign in</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/signup">Launch workspace</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
