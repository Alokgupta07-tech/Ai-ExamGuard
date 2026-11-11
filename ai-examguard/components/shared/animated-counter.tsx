'use client';

import React, { useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Smoothly animates numeric values with Motion while respecting reduced-motion settings.
 */
export function AnimatedCounter({
  value,
  duration = 0.9,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const [displayValue, setDisplayValue] = useState<string>(() =>
    (prefersReducedMotion ? value : 0).toFixed(decimals)
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(latest.toFixed(decimals));
      },
    });

    return () => controls.stop();
  }, [value, duration, decimals, prefersReducedMotion, motionValue]);

  const activeDisplay = prefersReducedMotion ? value.toFixed(decimals) : displayValue;
  const numericParts = activeDisplay.split('.');
  const formattedInt = Number(numericParts[0]).toLocaleString();
  const formatted =
    decimals > 0 && numericParts[1] !== undefined
      ? `${formattedInt}.${numericParts[1]}`
      : formattedInt;

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
