import React from 'react';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { PrivacySection } from '@/components/landing/privacy-section';
import { CompactFooter } from '@/components/landing/compact-footer';

/**
 * AI ExamGuard — Minimal Premium Homepage
 * Concise, fast, elegant, and focused.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* SECTION 1 — Navigation */}
      <LandingNav />

      <main className="flex-1">
        {/* SECTION 2 — Hero */}
        <HeroSection />

        {/* SECTION 3 — Core Capabilities */}
        <FeaturesSection />

        {/* SECTION 4 — How It Works */}
        <HowItWorksSection />

        {/* SECTION 5 — Privacy and Trust */}
        <PrivacySection />
      </main>

      {/* SECTION 6 — Compact Footer */}
      <CompactFooter />
    </div>
  );
}
