import React from 'react';
import { ClipboardCheck, Cpu, FileEdit, UserCheck } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: FileEdit,
    title: 'Author & Schedule',
    description:
      'Faculty build question banks and define exam timing, camera/audio thresholds, and course enrollments inside their university tenant.',
  },
  {
    step: '02',
    icon: ClipboardCheck,
    title: 'Student Pre-Flight Calibration',
    description:
      'Students verify webcam framing, microphone RMS baseline, and browser fullscreen permissions with clear consent disclosures before starting.',
  },
  {
    step: '03',
    icon: Cpu,
    title: 'Local Edge Telemetry',
    description:
      'During the exam, MediaPipe & Web Audio run strictly on-device. Only timestamped anomaly metadata is synced over encrypted channels.',
  },
  {
    step: '04',
    icon: UserCheck,
    title: 'Human Invigilator Adjudication',
    description:
      'Invigilators receive prioritized risk alerts in real time, inspect chronological event logs, and record verified review outcomes.',
  },
];

/**
 * Four-stage examination lifecycle walkthrough section.
 */
export function HowItWorksSection() {
  return (
    <section
      id="workflow"
      className="border-b border-[#243249]/80 bg-[#0B1220]/40 py-20 px-4 sm:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-[#8B5CF6]">
            End-to-End Integrity Workflow
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
            How AI ExamGuard Secures Every Session
          </h2>
          <p className="text-base text-[#94A3B8] leading-relaxed">
            From exam publication to post-exam audit, every step maintains deterministic security
            and explainability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-xl border border-[#243249] bg-[#111B2D] p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/10 text-[#38BDF8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#243249]">{item.step}</span>
                </div>
                <h3 className="font-heading text-lg font-semibold text-[#F8FAFC]">
                  {item.title}
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

