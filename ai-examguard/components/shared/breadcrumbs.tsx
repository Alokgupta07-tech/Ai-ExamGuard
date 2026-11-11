'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
}

/**
 * Accessible hierarchical navigation breadcrumbs for dashboard pages.
 */
export function Breadcrumbs({ items, homeHref = '/', className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs sm:text-sm', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href={homeHref}
            className="text-muted-foreground hover:text-primary transition-colors flex items-center"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${idx}`}>
              <li aria-hidden="true" className="text-border">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              </li>
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'font-medium',
                      isLast ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

