'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '#overview', label: 'Platform' },
  { href: '#capabilities', label: 'AI Capabilities' },
  { href: '#workflow', label: 'How It Works' },
  { href: '#security', label: 'Security' },
  { href: '#privacy', label: 'Privacy' },
];

/**
 * Sticky glassmorphic navigation header for the public AI ExamGuard website.
 */
export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#243249]/80 bg-[#080D18]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl h-18 sm:h-20 px-4 sm:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#38BDF8]/40 bg-[#38BDF8]/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <ShieldCheck className="h-5 w-5 text-[#38BDF8]" />
          </div>
          <div>
            <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[#F8FAFC]">
              AI <span className="text-[#38BDF8]">ExamGuard</span>
            </span>
            <span className="hidden sm:block text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
              Integrity Platform
            </span>
          </div>
        </Link>

        {/* Desktop Anchor Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Landing navigation">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Auth Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            className="text-sm text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <Link href="/login">Institutional Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-[#38BDF8] text-[#080D18] font-semibold shadow-lg shadow-[#38BDF8]/20 hover:bg-[#38BDF8]/90 text-sm"
          >
            <Link href="/signup">Launch Workspace</Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#243249] bg-[#111B2D] text-[#F8FAFC] cursor-pointer"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#243249] bg-[#0B1220] px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#94A3B8] hover:bg-[#17243A] hover:text-[#F8FAFC]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-[#243249] flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full border-[#243249]">
              <Link href="/login">Institutional Sign In</Link>
            </Button>
            <Button asChild className="w-full bg-[#38BDF8] text-[#080D18] font-semibold">
              <Link href="/signup">Launch Workspace</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

