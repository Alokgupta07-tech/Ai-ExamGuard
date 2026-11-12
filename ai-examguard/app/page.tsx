import React from 'react';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { UniversityShowcaseSection } from '@/components/landing/university-showcase';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { ProductShowcaseSection } from '@/components/landing/product-showcase-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { PrivacySection } from '@/components/landing/privacy-section';
import { CompactFooter } from '@/components/landing/compact-footer';

/**
 * AI ExamGuard — University Experience & Premium Visual Transformation
 * Structured 8-section institutional homepage:
 * 1. LandingNav (Top navigation with tenant status pill)
 * 2. HeroSection (Campus architecture backdrop + Live ECE-302 telemetry console)
 * 3. UniversityShowcaseSection ("Where Innovation Meets Technology" - Authentic student startup & campus visuals)
 * 4. HowItWorksSection ("From Examination to Integrity Review" - 5-step institutional workflow)
 * 5. ProductShowcaseSection ("Experience Across Roles" - Admin, Faculty, Student, Invigilator SOC)
 * 6. FeaturesSection (Core Capabilities - Face, Audio RMS, Fullscreen, Event Intelligence)
 * 7. PrivacySection (Local Processing, Dignity, Human-Led Review)
 * 8. CompactFooter (Clean navigation, institutional configurability disclosure)
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* SECTION 1 — Navigation */}
      <LandingNav />

      <main className="flex-1">
        {/* SECTION 2 — Hero & Live Telemetry Console */}
        <HeroSection />

        {/* SECTION 3 — University Innovation Showcase: Where Innovation Meets Technology */}
        <UniversityShowcaseSection />

        {/* SECTION 4 — From Examination to Integrity Review */}
        <HowItWorksSection />

        {/* SECTION 5 — Role Experience Showcase */}
        <ProductShowcaseSection />

        {/* SECTION 6 — Core Capabilities */}
        <FeaturesSection />

        {/* SECTION 7 — Privacy and Trust */}
        <PrivacySection />
      </main>

      {/* SECTION 8 — Compact Footer */}
      <CompactFooter />
    </div>
  );
}
