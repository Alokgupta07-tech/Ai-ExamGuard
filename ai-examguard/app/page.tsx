import React from 'react';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { ProductIntroSection } from '@/components/landing/product-intro';
import { FeaturesSection } from '@/components/landing/features-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { ArchitecturePrivacySection } from '@/components/landing/architecture-privacy-section';
import { CtaFooterSection } from '@/components/landing/cta-footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex flex-col selection:bg-[#38BDF8]/20 selection:text-[#38BDF8]">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <ProductIntroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ArchitecturePrivacySection />
      </main>
      <CtaFooterSection />
    </div>
  );
}
