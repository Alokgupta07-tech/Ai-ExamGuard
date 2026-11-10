import Link from 'next/link';
import { ShieldCheck, Lock } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#080D18] p-4 sm:p-6 lg:p-8">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[128px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/10 blur-[128px]" />
      </div>

      {/* Brand Header */}
      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-105">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 shadow-[0_0_24px_rgba(56,189,248,0.25)]">
            <ShieldCheck className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
            AI <span className="text-primary">ExamGuard</span>
          </span>
        </Link>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Lock className="h-3 w-3 text-secondary" />
          <span>Institutional Exam Integrity & Security Protocol</span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        <span>Protected by AI ExamGuard Local Edge Proctoring • FERPA & GDPR Compliant</span>
      </div>
    </div>
  );
}

