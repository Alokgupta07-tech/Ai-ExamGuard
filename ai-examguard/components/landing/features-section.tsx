import React from 'react';
import {
  Activity,
  CheckCircle2,
  Eye,
  FileCheck2,
  Lock,
  Monitor,
  ShieldAlert,
  Volume2,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';

const FEATURES = [
  {
    icon: Eye,
    color: 'text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/10',
    title: 'In-Browser Face Presence & Multi-Face Detection',
    description:
      'Powered by MediaPipe Tasks Vision WebAssembly running locally on the examinee device. Detects absent face and multiple faces without streaming raw camera video.',
  },
  {
    icon: Volume2,
    color: 'text-[#2DD4BF] border-[#2DD4BF]/30 bg-[#2DD4BF]/10',
    title: 'Acoustic Energy Profiling (Web Audio API)',
    description:
      'Analyzes microphone decibel RMS spikes locally to detect sustained background noise or speech activity—explicitly distinguishing acoustic energy from speech recognition.',
  },
  {
    icon: Monitor,
    color: 'text-[#8B5CF6] border-[#8B5CF6]/30 bg-[#8B5CF6]/10',
    title: 'Browser Visibility & Fullscreen Telemetry',
    description:
      'Tracks standard browser document visibility changes and fullscreen exits during active sessions, logging exact timestamps for invigilator context.',
  },
  {
    icon: Lock,
    color: 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10',
    title: 'Zero Answer-Key Leakage',
    description:
      'Correct options and grading rubrics remain strictly server-side. Student question APIs exclude answer columns so DevTools inspection yields zero grading secrets.',
  },
  {
    icon: Activity,
    color: 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10',
    title: 'Explainable Risk Indicators',
    description:
      'Every anomaly emits structured metadata (type, confidence, duration, server timestamp) rather than opaque black-box scores—never auto-disqualifying a student.',
  },
  {
    icon: FileCheck2,
    color: 'text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/10',
    title: 'Live Invigilator Review Workflow',
    description:
      'Supabase Realtime streams prioritized risk events to human proctors who inspect event timelines, add review notes, and record formal determinations.',
  },
];

const CAPABILITY_BOUNDARIES = [
  {
    capability: 'Single-face presence & absent-candidate detection',
    scope: 'In-Browser MVP (MediaPipe WASM)',
    supported: true,
    detail: 'Executed locally in browser canvas memory; only event timestamps persist.',
  },
  {
    capability: 'Multiple-face detection in camera frame',
    scope: 'In-Browser MVP (MediaPipe WASM)',
    supported: true,
    detail: 'Flags >1 face sustained past grace window as a human-review indicator.',
  },
  {
    capability: 'Ambient acoustic spike & voice activity thresholding',
    scope: 'In-Browser MVP (Web Audio API)',
    supported: true,
    detail: 'Measures RMS energy levels locally without recording or transcribing audio.',
  },
  {
    capability: 'Tab visibility & fullscreen state monitoring',
    scope: 'Standard Browser APIs',
    supported: true,
    detail: 'Uses visibilitychange & fullscreenchange events where supported by browser.',
  },
  {
    capability: 'OS-level process killing or desktop window lockdown',
    scope: 'Future Native App Scope',
    supported: false,
    detail: 'Web browsers cannot control external OS apps. Honest boundaries enforced.',
  },
];

/**
 * Core platform feature grid combined with transparent AI & browser boundary matrix.
 */
export function FeaturesSection() {
  return (
    <section
      id="capabilities"
      className="border-b border-[#243249]/80 bg-[#080D18] py-20 px-4 sm:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Feature Cards */}
        <div className="space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-mono uppercase tracking-widest text-[#2DD4BF]">
              Platform Capabilities
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
              Precision Telemetry Without Surrendering Privacy
            </h2>
            <p className="text-base text-[#94A3B8] leading-relaxed">
              Designed around transparent edge processing and rigorous server-side exam controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-xl border border-[#243249] bg-[#111B2D] p-6 space-y-4 hover:border-[#38BDF8]/40 transition-colors"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg border ${feat.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#F8FAFC]">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Monitoring Capabilities & Honest Technical Boundaries */}
        <div className="rounded-2xl border border-[#243249] bg-[#0B1220] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#38BDF8]" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#38BDF8]">
                  Transparent AI Capabilities
                </span>
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#F8FAFC]">
                Real Browser Capabilities vs. Native Boundaries
              </h3>
              <p className="text-sm text-[#94A3B8]">
                AI ExamGuard never makes exaggerated claims or automatically convicts examinees.
                Every automated signal is an explainable indicator queued for human judgment.
              </p>
            </div>
            <StatusBadge tone="purple">Human-in-the-Loop Guarantee</StatusBadge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#243249] text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                  <th className="py-3 pr-4">Monitoring Signal</th>
                  <th className="py-3 px-4">Execution Layer</th>
                  <th className="py-3 px-4">Browser Availability</th>
                  <th className="py-3 pl-4">Operational Guarantee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243249]/70 text-sm">
                {CAPABILITY_BOUNDARIES.map((row) => (
                  <tr key={row.capability} className="hover:bg-[#111B2D]/60 transition-colors">
                    <td className="py-3.5 pr-4 font-medium text-[#F8FAFC]">{row.capability}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#94A3B8]">{row.scope}</td>
                    <td className="py-3.5 px-4">
                      {row.supported ? (
                        <StatusBadge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                          Verified
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" icon={<XCircle className="h-3 w-3" />}>
                          Future Native App
                        </StatusBadge>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-xs sm:text-sm text-[#94A3B8]">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

