'use client';

import React from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Lock,
  Mic,
  RotateCw,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';

export interface FeatureCardData {
  id: string;
  index: number;
  badge: string;
  title: string;
  shortDesc: string;
  status: {
    label: string;
    tone: 'teal' | 'success' | 'warning' | 'critical' | 'neutral';
  };
  back: {
    title: string;
    description: string;
    capabilities: string[];
    techSpec: string;
    privacyNote: string;
    moduleIcon: React.ComponentType<{ className?: string }>;
  };
}

export interface ExamGuardFeatureCardProps {
  card: FeatureCardData;
  isActive: boolean;
  isFlipped: boolean;
  onFlip: () => void;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function ExamGuardFeatureCard({
  card,
  isActive,
  isFlipped,
  onFlip,
  onClick,
  style,
}: ExamGuardFeatureCardProps) {
  const BackIcon = card.back.moduleIcon;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={isActive ? 0 : -1}
      aria-label={`${card.title} - ${isActive ? 'Active feature card' : 'Click to bring to front'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isActive) onFlip();
          else onClick();
        }
      }}
      className={cn(
        'group absolute top-0 left-0 w-[280px] sm:w-[320px] h-[420px] sm:h-[440px] cursor-pointer select-none rounded-2xl transition-shadow duration-300',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4',
        isActive
          ? 'shadow-[0_20px_50px_-10px_rgba(23,107,91,0.25)] ring-1 ring-primary/40'
          : 'opacity-80 hover:opacity-100'
      )}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {/* 3D Flippable Inner Container */}
      <div
        className={cn(
          'relative w-full h-full rounded-2xl transition-transform duration-700 ease-out preserve-3d',
          isFlipped && '[transform:rotateY(180deg)]'
        )}
      >
        {/* ================= FRONT FACE ================= */}
        <div
          className={cn(
            'absolute inset-0 w-full h-full rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between overflow-hidden backface-hidden shadow-sm',
            'bg-gradient-to-b from-card via-card to-surface-elevated/40'
          )}
        >
          {/* Subtle Accent Glow Ring */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          {/* Front Header */}
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {card.badge}
              </span>
              <StatusBadge tone={card.status.tone} className="text-[10px] px-2 py-0.5">
                {card.status.label}
              </StatusBadge>
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground leading-snug">
              {card.title}
            </h3>
            <p className="text-xs text-ink-secondary line-clamp-1">{card.shortDesc}</p>
          </div>

          {/* Front Interactive Mini-Interface Visualisation */}
          <div className="relative z-10 flex-1 my-3 rounded-xl border border-border/70 bg-background/80 p-3.5 flex flex-col justify-between overflow-hidden shadow-inner">
            {renderFrontVisual(card.id)}
          </div>

          {/* Front Footer */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>AI ExamGuard</span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onFlip();
              }}
              className="text-primary hover:text-primary hover:bg-primary/10 text-[11px] gap-1 h-7 px-2"
            >
              <RotateCw className="h-3 w-3" />
              <span>View Specs</span>
            </Button>
          </div>
        </div>

        {/* ================= BACK FACE ================= */}
        <div
          className={cn(
            'absolute inset-0 w-full h-full rounded-2xl border border-primary/30 bg-card p-5 flex flex-col justify-between overflow-hidden backface-hidden shadow-lg',
            '[transform:rotateY(180deg)] bg-gradient-to-br from-card via-card to-sidebar'
          )}
        >
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <BackIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-mono text-[10px] text-primary uppercase tracking-wider block">
                    Technical Specifications
                  </span>
                  <h4 className="font-heading text-base font-bold text-foreground">
                    {card.back.title}
                  </h4>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Flip back to preview"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              {card.back.description}
            </p>
          </div>

          {/* Capabilities List */}
          <div className="space-y-2 py-2">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider font-mono">
              Core Capabilities
            </span>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {card.back.capabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="leading-tight">{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Specs Footer */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <div className="rounded-lg bg-surface-elevated/70 p-2.5 space-y-1 border border-border/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-mono">Runtime Engine</span>
                <span className="font-mono text-primary font-semibold">{card.back.techSpec}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-mono">Privacy Standard</span>
                <span className="font-mono text-foreground">{card.back.privacyNote}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Card {card.index + 1} of 6</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Return to front <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Render authentic simulated mini-interfaces for each of the 6 AI ExamGuard feature panels.
 */
function renderFrontVisual(cardId: string) {
  switch (cardId) {
    case 'live-proctoring':
      return (
        <div className="h-full flex flex-col justify-between space-y-2.5">
          {/* Simulated Candidate Stream Header */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-ping" />
              <span className="font-mono font-semibold text-foreground">LIVE STREAM</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">720p @ 30fps</span>
          </div>

          {/* Video Placeholder Box */}
          <div className="relative flex-1 rounded-lg bg-black/40 border border-border/50 flex flex-col items-center justify-center p-3 text-center overflow-hidden group/vid">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <Camera className="h-8 w-8 text-primary/70 mb-1 z-10" />
            <span className="text-xs font-semibold text-white z-10">Aarav Sharma</span>
            <span className="font-mono text-[10px] text-gray-300 z-10">CSE-213 · Seat #14</span>

            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 rounded px-1.5 py-0.5 text-[9px] font-mono text-success">
              <Wifi className="h-2.5 w-2.5" /> 38ms WebRTC
            </div>
            <div className="absolute bottom-2 right-2 z-10 bg-primary/80 rounded px-1.5 py-0.5 text-[9px] font-mono text-white">
              Trust 98%
            </div>
          </div>

          {/* Metrics bar */}
          <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono pt-1">
            <div className="rounded bg-surface-elevated/60 p-1 border border-border/40">
              <span className="text-muted-foreground block text-[9px]">BITRATE</span>
              <span className="text-foreground font-semibold">420 kbps</span>
            </div>
            <div className="rounded bg-surface-elevated/60 p-1 border border-border/40">
              <span className="text-muted-foreground block text-[9px]">AUDIO</span>
              <span className="text-success font-semibold">Active</span>
            </div>
            <div className="rounded bg-surface-elevated/60 p-1 border border-border/40">
              <span className="text-muted-foreground block text-[9px]">STRIKES</span>
              <span className="text-foreground font-semibold">0 / 3</span>
            </div>
          </div>
        </div>
      );

    case 'face-gaze':
      return (
        <div className="h-full flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-muted-foreground">478-POINT MESH</span>
            <span className="font-mono text-success text-[10px]">Verified (100%)</span>
          </div>

          {/* Face Constellation Wireframe */}
          <div className="relative flex-1 rounded-lg bg-surface-elevated/40 border border-border/50 flex flex-col items-center justify-center p-2 overflow-hidden">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Concentric Calibration Target Rings */}
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-40" />
              <div className="absolute inset-2 rounded-full border border-primary/30" />
              <div className="absolute inset-5 rounded-full border border-dashed border-secondary/40" />
              <ScanFace className="h-10 w-10 text-primary z-10" />
              {/* Center Dot */}
              <div className="absolute h-1.5 w-1.5 rounded-full bg-success z-20" />
            </div>

            <div className="w-full flex items-center justify-between px-2 text-[10px] font-mono text-muted-foreground mt-1">
              <span>Center Fixation: <strong className="text-foreground">0.12 ratio</strong></span>
              <span className="text-success font-semibold">Target Aligned</span>
            </div>
          </div>

          {/* 3D Euler Angles Readings */}
          <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono">
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">YAW</span>
              <span className="text-foreground font-semibold">+3.2°</span>
            </div>
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">PITCH</span>
              <span className="text-foreground font-semibold">-1.4°</span>
            </div>
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">ROLL</span>
              <span className="text-foreground font-semibold">+0.8°</span>
            </div>
          </div>
        </div>
      );

    case 'phone-detection':
      return (
        <div className="h-full flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-muted-foreground">OBJECT CLASSIFIER</span>
            <span className="font-mono text-warning text-[10px]">Flagged (91%)</span>
          </div>

          {/* Bounding Box Visualizer */}
          <div className="relative flex-1 rounded-lg bg-black/30 border border-border/60 flex flex-col justify-between p-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">CAM_01_FEED</span>
              <span className="text-[9px] font-mono bg-warning/20 text-warning px-1.5 py-0.5 rounded border border-warning/30">
                1.8s Sustained
              </span>
            </div>

            {/* Simulated Bounding Box */}
            <div className="self-center my-auto w-36 h-20 rounded border-2 border-warning/90 bg-warning/10 p-1.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold bg-warning text-black px-1 rounded">
                  MOBILE_PHONE
                </span>
                <span className="text-[9px] font-mono text-warning font-semibold">0.91</span>
              </div>
              <div className="flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-warning/80" />
              </div>
              <span className="text-[8px] font-mono text-center text-muted-foreground">
                Coords: [0.72, 0.41, 0.88, 0.65]
              </span>
            </div>

            <div className="text-[9px] font-mono text-center text-ink-secondary">
              *Simulated Model Telemetry Preview
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-center font-mono">
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">DEVICE</span>
              <span className="text-warning font-semibold">Phone In Hand</span>
            </div>
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">PERSONS</span>
              <span className="text-foreground font-semibold">1 (Verified)</span>
            </div>
          </div>
        </div>
      );

    case 'audio-intelligence':
      return (
        <div className="h-full flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-muted-foreground">SPECTRAL VAD</span>
            <span className="font-mono text-secondary text-[10px]">Formant 300-3400Hz</span>
          </div>

          {/* Audio Waveform / Spectrum Bars */}
          <div className="relative flex-1 rounded-lg bg-surface-elevated/40 border border-border/60 flex flex-col justify-between p-3 overflow-hidden">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1 text-primary">
                <Mic className="h-3 w-3" /> 48 kHz Mono
              </span>
              <span>-42 dB Floor</span>
            </div>

            {/* Animated Equalizer Bars */}
            <div className="flex items-end justify-center gap-1.5 h-16 px-2 my-auto">
              {[28, 55, 82, 95, 60, 42, 75, 35].map((h, i) => (
                <div
                  key={i}
                  className="w-3 rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all duration-300"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">ENERGY RATIO:</span>
              <span className="text-primary font-semibold">0.82 (Speech Formant)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-center font-mono">
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">VAD CLASSIFICATION</span>
              <span className="text-primary font-semibold">Human Speech</span>
            </div>
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">STORAGE</span>
              <span className="text-success font-semibold">Zero Audio Saved</span>
            </div>
          </div>
        </div>
      );

    case 'secure-exam':
      return (
        <div className="h-full flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-muted-foreground">CLIENT LOCKDOWN</span>
            <span className="font-mono text-success text-[10px]">Tauri 2 Core Active</span>
          </div>

          {/* Secure Environment Matrix */}
          <div className="relative flex-1 rounded-lg bg-surface-elevated/40 border border-border/60 flex flex-col justify-between p-3 overflow-hidden">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">KIOSK ENFORCEMENT</span>
                <span className="text-success font-semibold flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5" /> Fullscreen 100%
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">TASK SWITCHING</span>
                <span className="text-success font-semibold">Alt+Tab Blocked</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">MULTI-DISPLAY</span>
                <span className="text-success font-semibold">Single Active</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">SEB BEK HMAC</span>
                <span className="text-primary font-semibold">Verified</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-background border border-border text-foreground">
                Windows
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-background border border-border text-foreground">
                macOS
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-background border border-border text-foreground">
                Linux
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-center font-mono">
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">INTEGRITY</span>
              <span className="text-success font-semibold">Hardware Bound</span>
            </div>
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">FALLBACK</span>
              <span className="text-foreground font-semibold">Browser Lockdown</span>
            </div>
          </div>
        </div>
      );

    case 'integrity-intelligence':
      return (
        <div className="h-full flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-muted-foreground">PROGRESSIVE STRIKES</span>
            <span className="font-mono text-warning text-[10px]">Strike 1 of 3</span>
          </div>

          {/* Timeline & Actions */}
          <div className="relative flex-1 rounded-lg bg-surface-elevated/40 border border-border/60 flex flex-col justify-between p-2.5 overflow-hidden">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">TRUST SCORE</span>
                <span className="text-primary font-bold text-xs">94 / 100</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-[94%]" />
              </div>

              {/* Event Log items */}
              <div className="space-y-1 pt-1 font-mono text-[9px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>10:14 · Gaze Averted (2.1s)</span>
                  <span className="text-muted-foreground">Auto-Cleared</span>
                </div>
                <div className="flex items-center justify-between text-warning">
                  <span>10:28 · Secondary Voice (3.4s)</span>
                  <span className="font-semibold">Notice Issued</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[9px] font-mono">
              <span className="text-muted-foreground">AUTOSUBMIT POLICY:</span>
              <span className="text-critical font-semibold">Strike 3 Triggers</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-center font-mono">
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">CORROBORATION</span>
              <span className="text-primary font-semibold">Multi-Sensor</span>
            </div>
            <div className="rounded bg-background p-1 border border-border/60">
              <span className="text-muted-foreground block text-[9px]">AUDIT CHAIN</span>
              <span className="text-success font-semibold">SHA-256 Signed</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
