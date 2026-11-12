'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Menu, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#privacy', label: 'Privacy' },
];

/**
 * SECTION 1 — Compact Professional Navbar
 * Minimal, elegant, and responsive.
 */
export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (const item of NAV_LINKS) {
        const id = item.href.replace('#', '');
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(item.href);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
            AI <span className="text-primary font-bold">ExamGuard</span>
          </span>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-ink-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Auth & Primary Action Buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-ink-secondary hover:text-foreground"
          >
            <Link href="/login">Institutional Sign In</Link>
          </Button>
          <Button asChild size="sm" className="h-8 px-3.5 text-xs font-medium">
            <Link href="/signup" className="flex items-center gap-1">
              <span>Launch Workspace</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-black/5"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden border-b border-border bg-background px-4 py-3 space-y-2 overflow-hidden"
          >
            <nav className="flex flex-col space-y-1">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-xs font-medium text-ink-secondary hover:text-foreground hover:bg-black/5"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Institutional Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full text-xs h-8">
                <Link href="/signup" onClick={() => setMobileOpen(false)}>
                  Launch Workspace
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
