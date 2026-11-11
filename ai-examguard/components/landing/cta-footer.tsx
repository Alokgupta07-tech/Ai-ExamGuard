import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Closing call-to-action band and clean institutional footer.
 */
export function CtaFooterSection() {
  return (
    <>
      <section className="bg-background py-16 sm:py-20 px-4 sm:px-8">
        <div className="mx-auto max-w-4xl text-center space-y-5">
          <p className="text-xs font-medium text-primary">
            Ready for institutional deployment
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Protect academic integrity without sacrificing student trust
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Create an institutional workspace or sign in to explore the Administrator, Faculty,
            Invigilator, and Student portals.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button asChild size="lg">
              <Link href="/signup" className="flex items-center gap-2">
                <span>Provision university account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in to portal</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-sidebar py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/35 bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="font-heading text-sm font-bold text-foreground">
                AI <span className="text-primary">ExamGuard</span>
              </span>
              <p className="text-xs text-muted-foreground">
                University online examination integrity platform
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground" aria-label="Footer navigation">
            <a href="#overview" className="hover:text-foreground transition-colors">
              Platform
            </a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              Workflow
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Architecture
            </a>
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <Link href="/login" className="hover:text-primary transition-colors">
              Sign in
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">
            AI ExamGuard · Academic Integrity Platform
          </p>
        </div>
      </footer>
    </>
  );
}
