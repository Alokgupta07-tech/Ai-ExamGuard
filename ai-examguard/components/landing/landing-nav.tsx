'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Menu, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#overview', label: 'Platform' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#experience', label: 'Experience' },
  { href: '#security', label: 'Architecture' },
  { href: '#privacy', label: 'Privacy' },
];

/**
 * Sticky solid-surface header for the public AI ExamGuard platform.
 * Features institutional branding, version pill, smooth anchor links, and mobile drawer.
 */
export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Left: Shield logo, product wordmark, version indicator */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-bold tracking-tight text-foreground">
              AI <span className="text-primary">ExamGuard</span>
            </span>
            <span className="hidden sm:inline font-mono text-[10px] font-semibold tracking-wider uppercase text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              v1.0
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Landing navigation">
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
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated/70'
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Auth & Primary Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/login">Institutional Sign In</Link>
          </Button>
          <Button asChild size="sm" className="text-xs">
            <Link href="/signup" className="flex items-center gap-1.5">
              <span>Launch University Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground cursor-pointer hover:bg-surface-elevated"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-border bg-sidebar px-4 py-4 space-y-3"
          >
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
              <Button asChild variant="outline" className="w-full text-xs">
                <Link href="/login">Institutional Sign In</Link>
              </Button>
              <Button asChild className="w-full text-xs">
                <Link href="/signup">Launch University Workspace</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
