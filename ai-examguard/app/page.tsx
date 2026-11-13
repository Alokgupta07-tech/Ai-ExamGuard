import React from 'react';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { ExamGuardScrollStory } from '@/components/showcase/ExamGuardScrollStory';
import { ExamGuard3DCarousel } from '@/components/showcase/ExamGuard3DCarousel';
import { UniversityShowcaseSection } from '@/components/landing/university-showcase';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { ProductShowcaseSection } from '@/components/landing/product-showcase-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { PrivacySection } from '@/components/landing/privacy-section';
import { CompactFooter } from '@/components/landing/compact-footer';

/**
 * AI ExamGuard — University Experience & Premium Visual Transformation
 * Structured institutional homepage:
 * 1. LandingNav (Top navigation with tenant status pill)
 * 2. HeroSection (Campus architecture backdrop + Live ECE-302 telemetry console)
 * 3. ExamGuardScrollStory (Cinematic Three.js 3D Procedural Sculpture Scroll Experience)
 * 4. ExamGuard3DCarousel (Interactive 3D Cylindrical Feature Showcase)
 * 5. UniversityShowcaseSection ("Where Innovation Meets Technology" - Authentic student startup & campus visuals)
 * 6. HowItWorksSection ("From Examination to Integrity Review" - 5-step institutional workflow)
 * 7. ProductShowcaseSection ("Experience Across Roles" - Admin, Faculty, Student, Invigilator SOC)
 * 8. FeaturesSection (Core Capabilities - Face, Audio RMS, Fullscreen, Event Intelligence)
 * 9. PrivacySection (Local Processing, Dignity, Human-Led Review)
 * 10. CompactFooter (Clean navigation, institutional configurability disclosure)
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* SECTION 1 — Navigation */}
      <LandingNav />

      <main className="flex-1">
        {/* SECTION 2 — Hero & Live Telemetry Console */}
        <HeroSection />

        {/* SECTION 3 — Cinematic 3D Scroll Story (Detection, Intelligence, Integrity) */}
        <ExamGuardScrollStory />

        {/* SECTION 4 — Interactive 3D Cylindrical Feature Showcase */}
        <ExamGuard3DCarousel />

        {/* SECTION 5 — University Innovation Showcase: Where Innovation Meets Technology */}
        <UniversityShowcaseSection />

        {/* SECTION 6 — From Examination to Integrity Review */}
        <HowItWorksSection />

        {/* SECTION 7 — Role Experience Showcase */}
        <ProductShowcaseSection />

        {/* SECTION 8 — Core Capabilities */}
        <FeaturesSection />

        {/* SECTION 9 — Privacy and Trust */}
        <PrivacySection />
      </main>

      {/* SECTION 10 — Compact Footer */}
      <CompactFooter />
    </div>
  );
}
