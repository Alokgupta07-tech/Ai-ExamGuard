import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Closing call-to-action banner and institutional footer.
 */
export function CtaFooterSection() {
  return (
    <>
      {/* CTA Section */}
      <section className="relative overflow-hidden bg-[#080D18] py-20 px-4 sm:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-[640px] rounded-full bg-[#38BDF8]/10 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-6">
          <p className="text-xs font-mono uppercase tracking-widest text-[#38BDF8]">
            Ready for Deployment
          </p>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-[#F8FAFC]">
            Protect Academic Integrity Without Sacrificing Student Trust.
          </h2>
          <p className="text-base text-[#94A3B8] max-w-2xl mx-auto">
            Create an institutional workspace or sign in to explore the Administrator, Faculty,
            Invigilator, and Student portals.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-[#38BDF8] text-[#080D18] font-semibold shadow-xl shadow-[#38BDF8]/25 hover:bg-[#38BDF8]/90 px-8"
            >
              <Link href="/signup" className="flex items-center gap-2">
                <span>Provision University Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#243249] bg-[#111B2D] text-[#F8FAFC] hover:bg-[#17243A] px-8"
            >
              <Link href="/login">Sign In to Portal</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#243249] bg-[#0B1220] py-10 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#38BDF8]/40 bg-[#38BDF8]/10">
              <ShieldCheck className="h-4 w-4 text-[#38BDF8]" />
            </div>
            <div>
              <span className="font-heading text-sm font-bold text-[#F8FAFC]">
                AI <span className="text-[#38BDF8]">ExamGuard</span>
              </span>
              <p className="text-[11px] text-[#94A3B8]">
                University-Grade Online Examination Integrity Platform
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#94A3B8]">
            <a href="#overview" className="hover:text-[#F8FAFC] transition-colors">
              Platform
            </a>
            <a href="#capabilities" className="hover:text-[#F8FAFC] transition-colors">
              AI Capabilities
            </a>
            <a href="#security" className="hover:text-[#F8FAFC] transition-colors">
              Security
            </a>
            <a href="#privacy" className="hover:text-[#F8FAFC] transition-colors">
              Privacy
            </a>
            <Link href="/login" className="hover:text-[#38BDF8] transition-colors">
              Sign In
            </Link>
          </div>

          <p className="text-xs font-mono text-[#94A3B8]">
            © 2026 AI ExamGuard. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

