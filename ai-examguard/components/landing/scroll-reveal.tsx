'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface ScrollRevealGroupProps {
  children: React.ReactNode;
  selector?: string;
  stagger?: number;
  yOffset?: number;
  duration?: number;
  className?: string;
}

/**
 * GSAP ScrollTrigger wrapper for landing section elements.
 * Uses GPU transforms + opacity only, clears inline styles after settling,
 * and honours prefers-reduced-motion automatically.
 */
export function ScrollRevealGroup({
  children,
  selector = '.reveal-item',
  stagger = 0.08,
  yOffset = 22,
  duration = 0.55,
  className,
}: ScrollRevealGroupProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const targets = gsap.utils.toArray<HTMLElement>(selector, root);
      if (targets.length === 0) return;

      gsap.from(targets, {
        y: yOffset,
        opacity: 0,
        duration,
        stagger,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: root,
          start: 'top 86%',
          once: true,
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={cn(className)}>
      {children}
    </div>
  );
}

