'use client';

import React from 'react';
import Image from 'next/image';
import { Award, BookOpen, Building, Newspaper, Sparkles, Users } from 'lucide-react';
import { ScrollRevealGroup } from '@/components/landing/scroll-reveal';
import { StatusBadge } from '@/components/shared/status-badge';

/**
 * SECTION 3 — University Innovation Showcase: "Where Innovation Meets Technology"
 * Features authentic SRM University–AP student startup photographs, team collaboration,
 * and academic infrastructure in a premium editorial layout.
 */
export function UniversityShowcaseSection() {
  return (
    <section id="university" className="py-16 sm:py-24 border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <ScrollRevealGroup className="max-w-2xl space-y-3">
          <div className="reveal-item inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>CAMPUS INNOVATION ECOSYSTEM</span>
          </div>
          <h2 className="reveal-item font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Where Innovation Meets Technology.
          </h2>
          <p className="reveal-item text-sm sm:text-base text-ink-secondary leading-relaxed">
            Built in an environment of collaboration, entrepreneurship and technological innovation at SRM University–AP.
          </p>
        </ScrollRevealGroup>

        {/* Asymmetric Editorial Photographic Grid */}
        <ScrollRevealGroup className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main Editorial Feature (Span 7): Student Collaboration & Innovation */}
          <div className="reveal-item lg:col-span-7 flex flex-col justify-between rounded-xl border border-border bg-background overflow-hidden shadow-xs group">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/5">
              <Image
                src="/images/university/srmap-student-innovation-team.png"
                alt="Student Innovation Team Collaboration at SRM University–AP"
                fill
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute top-3 left-3">
                <StatusBadge tone="teal" className="bg-background/90 backdrop-blur-xs font-mono text-[10px]">
                  SRM University–AP • Student Innovators
                </StatusBadge>
              </div>
            </div>

            <div className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Users className="h-3.5 w-3.5" />
                <span>Student Engineering Teams</span>
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Entrepreneurial Sprints & Technical Problem Solving
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Undergraduate engineers collaborating on hardware prototypes, system architecture, and machine learning deployments at the Hatchlab Research Centre.
              </p>
            </div>
          </div>

          {/* Right Column (Span 5): 2 Editorial Supporting Visuals */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Supporting Image 1: Team Avyron Collage */}
            <div className="reveal-item flex-1 rounded-xl border border-border bg-background overflow-hidden shadow-xs flex flex-col sm:flex-row lg:flex-row group">
              <div className="relative w-full sm:w-2/5 lg:w-2/5 aspect-[4/5] sm:aspect-auto overflow-hidden bg-black/5 shrink-0">
                <Image
                  src="/images/university/avyron-team-collage.png"
                  alt="Team Avyron Entrepreneurship and Technical Mentoring Collage"
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, 30vw"
                />
              </div>
              <div className="p-4 flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-secondary font-medium">
                    <Award className="h-3.5 w-3.5" />
                    <span>Team Avyron</span>
                  </div>
                  <h4 className="font-heading text-sm font-semibold text-foreground">
                    The Grind & Peer Mentorship
                  </h4>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Student-led startup initiatives participating in competitive pitching, design reviews, and hands-on code development.
                  </p>
                </div>
                <span className="font-mono text-[10px] text-ink-secondary">
                  Amaravati Innovation Corridor
                </span>
              </div>
            </div>

            {/* Supporting Image 2: Newspaper Article Clipping */}
            <div className="reveal-item flex-1 rounded-xl border border-border bg-background overflow-hidden shadow-xs flex flex-col sm:flex-row lg:flex-row group">
              <div className="relative w-full sm:w-2/5 lg:w-2/5 aspect-[4/5] sm:aspect-auto overflow-hidden bg-black/5 shrink-0">
                <Image
                  src="/images/university/srmap-startup-news.png"
                  alt="The Hans India coverage of 34 student startup ventures at SRM University-AP IGNITE Demo Day"
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, 30vw"
                />
              </div>
              <div className="p-4 flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
                    <Newspaper className="h-3.5 w-3.5" />
                    <span>The Hans India Press</span>
                  </div>
                  <h4 className="font-heading text-sm font-semibold text-foreground">
                    34 Startup Ventures at IGNITE
                  </h4>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Directorate of Innovation & Entrepreneurship (DoIE) highlighting campus technology ventures solving national challenges.
                  </p>
                </div>
                <span className="font-mono text-[10px] text-ink-secondary">
                  PRARAMBH Demo Day • Press Archive
                </span>
              </div>
            </div>
          </div>
        </ScrollRevealGroup>

        {/* Supporting Campus Infrastructure Banner */}
        <ScrollRevealGroup>
          <div className="reveal-item rounded-xl border border-border bg-background p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0">
              <Image
                src="/images/university/srmap-central-library.jpg"
                alt="SRM University–AP Central Library & Study Pavilion"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 200px"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <BookOpen className="h-4 w-4" />
                <span>Central Library & Digital Academic Infrastructure</span>
              </div>
              <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                Engineered for Modern University Scale & Dignity
              </h4>
              <p className="text-xs text-ink-secondary leading-relaxed">
                From lecture halls and research laboratories to digital examination stations, AI ExamGuard provides client-side integrity monitoring that respects student dignity while giving faculty verified assessment confidence.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-ink-secondary border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6">
              <Building className="h-4 w-4 text-primary" />
              <span>Neerukonda, Mangalagiri, AP</span>
            </div>
          </div>
        </ScrollRevealGroup>
      </div>
    </section>
  );
}
