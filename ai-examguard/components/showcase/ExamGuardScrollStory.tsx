'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { ExamGuardStoryPanels } from './ExamGuardStoryPanels';
import './examguard-cinematic.css';

// Dynamically import the WebGL 3D scene on the client to avoid SSR issues
const ExamGuardCinematicScene = dynamic(
  () =>
    import('./ExamGuardCinematicScene').then(
      (mod) => mod.ExamGuardCinematicScene
    ),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>INITIALIZING 3D ENGINE...</span>
        </div>
      </div>
    ),
  }
);

export function ExamGuardScrollStory() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const rafIdRef = useRef<number | null>(null);

  const [progress, setProgress] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  // Compute scroll progress continuously
  useEffect(() => {
    if (prefersReducedMotion) return;

    const updateScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const rawP = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      targetProgressRef.current = rawP;
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    updateScroll();

    // Smooth LERP loop for silky-smooth progress updates
    let running = true;
    const loop = () => {
      if (!running) return;

      if (isVisibleRef.current) {
        const delta = targetProgressRef.current - currentProgressRef.current;
        if (Math.abs(delta) > 0.0005) {
          currentProgressRef.current += delta * 0.12;
          setProgress(currentProgressRef.current);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [prefersReducedMotion]);

  // Pause rendering when outside the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ================= REDUCED MOTION STATIC PRESENTATION =================
  if (prefersReducedMotion) {
    return (
      <section
        id="cinematic-story"
        className="py-20 border-b border-border bg-background"
        aria-label="AI ExamGuard Examination Security"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="font-mono text-xs text-primary font-semibold uppercase tracking-wider">
              EXAMINATION SECURITY ARCHITECTURE
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
              Examinations, protected by intelligence.
            </h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              An intelligent examination ecosystem combining local vision, audio formant
              isolation, and server-authoritative integrity oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <span className="font-mono text-xs text-primary font-semibold">01 · DETECTION</span>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Examinations, protected by intelligence.
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                An intelligent examination ecosystem built for modern universities.
              </p>
              <Link
                href="#university"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
              >
                Explore platform <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <span className="font-mono text-xs text-primary font-semibold">02 · INTELLIGENCE</span>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Every signal matters.
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Vision, audio and examination activity brought together through contextual AI analysis.
              </p>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
              >
                Discover AI capabilities <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <span className="font-mono text-xs text-primary font-semibold">03 · INTEGRITY</span>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Technology with human oversight.
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Real-time monitoring, transparent alerts and examiner-led review.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
              >
                Launch workspace <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ================= 300VH CINEMATIC 3D SCROLL STORY =================
  return (
    <section
      id="cinematic-story"
      ref={containerRef}
      className="cinematic-scroll-container h-[280vh] sm:h-[300vh] border-b border-border/80"
      aria-label="Cinematic 3D Examination Security Story"
    >
      {/* Sticky Viewport Stage (100vh) */}
      <div className="cinematic-viewport-sticky">
        {/* Subtle Architectural Atmosphere */}
        <div className="cinematic-lighting-ambient" />
        <div className="cinematic-grid-subtle" />

        {/* Real Procedural 3D WebGL Canvas Scene */}
        <ExamGuardCinematicScene progress={progress} />

        {/* Overlay HTML Cinematic Typography Panels */}
        <ExamGuardStoryPanels progress={progress} />
      </div>
    </section>
  );
}

