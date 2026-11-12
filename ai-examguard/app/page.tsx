import React from 'react';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { ProductIntroSection } from '@/components/landing/product-intro';
import { FeaturesSection } from '@/components/landing/features-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { ProductShowcaseSection } from '@/components/landing/product-showcase-section';
import { ArchitecturePrivacySection } from '@/components/landing/architecture-privacy-section';
import { CtaFooterSection } from '@/components/landing/cta-footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <ProductIntroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ProductShowcaseSection />
        <ArchitecturePrivacySection />
      </main>
      <CtaFooterSection />
    </div>
  );
}

