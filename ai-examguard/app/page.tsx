import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Eye,
  Activity,
  Cpu,
  ArrowRight,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080D18] text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <header className="h-20 border-b border-[#243249]/80 bg-[#0B1220]/70 backdrop-blur-xl sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            AI <span className="text-primary">ExamGuard</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 text-sm">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[600px] rounded-full bg-primary/15 blur-[140px]" />
          <div className="absolute top-1/3 left-1/3 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-purple/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono text-primary shadow-[0_0_16px_rgba(56,189,248,0.2)]">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span>Next-Generation Edge AI Proctoring Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-heading text-foreground leading-[1.1]">
            University-Grade Online <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-secondary to-purple bg-clip-text text-transparent">
              Examination Integrity
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Eliminate exam misconduct with local in-browser face detection, audio energy profiling, and real-time invigilator telemetry. 100% private, zero raw video storage.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90 font-semibold px-8">
              <Link href="/signup" className="flex items-center gap-2">
                Launch Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="border-border/80 bg-card/60 backdrop-blur-sm hover:bg-surface-elevated font-semibold px-8">
              <Link href="/login">Institutional Sign In</Link>
            </Button>
          </div>

          {/* Quick Role Navigation Pills */}
          <div className="pt-10 border-t border-border/40 max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 font-mono">
              Explore Demo Portals
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Link
                href="/admin"
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-surface-elevated/40 hover:border-primary/50 transition-colors text-xs font-medium text-foreground"
              >
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Admin</span>
              </Link>

              <Link
                href="/faculty"
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-surface-elevated/40 hover:border-secondary/50 transition-colors text-xs font-medium text-foreground"
              >
                <BookOpen className="h-4 w-4 text-secondary" />
                <span>Faculty</span>
              </Link>

              <Link
                href="/invigilator"
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-surface-elevated/40 hover:border-purple/50 transition-colors text-xs font-medium text-foreground"
              >
                <Eye className="h-4 w-4 text-purple" />
                <span>Invigilator</span>
              </Link>

              <Link
                href="/student"
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border/80 bg-surface-elevated/40 hover:border-success/50 transition-colors text-xs font-medium text-foreground"
              >
                <GraduationCap className="h-4 w-4 text-success" />
                <span>Student</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="border-t border-[#243249]/80 bg-[#0B1220]/40 py-16 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground">Edge Vision AI</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time WebAssembly face presence and multiple-face detection running locally at 5 FPS without streaming video to servers.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg border border-secondary/30 bg-secondary/10 flex items-center justify-center text-secondary">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground">Acoustic Energy Meter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Browser Web Audio API computes continuous decibel RMS levels to flag sustained whispers and unauthorized speech.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card/60 p-6 space-y-3">
            <div className="h-10 w-10 rounded-lg border border-purple/30 bg-purple/10 flex items-center justify-center text-purple">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground">Answer Key Protection</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zero answer leakage. Grading keys exist only on the server, preventing DevTools network inspections and answer scraping.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#243249] py-8 px-6 text-center text-xs text-muted-foreground bg-[#080D18]">
        <p>© 2026 AI ExamGuard. Institutional Online Examination Integrity Platform.</p>
      </footer>
    </div>
  );
}
