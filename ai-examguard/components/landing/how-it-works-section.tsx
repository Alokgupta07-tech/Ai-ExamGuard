import React from 'react';
import { ClipboardCheck, Cpu, FileEdit, UserCheck } from 'lucide-react';

const STEPS = [
  {
    step: 'Stage 01',
    icon: FileEdit,
    title: 'Author and schedule',
    description:
      'Faculty author MCQ question banks, configure passing marks and randomization, assign cohorts, and set monitoring thresholds.',
  },
  {
    step: 'Stage 02',
    icon: ClipboardCheck,
    title: 'Pre-flight calibration',
    description:
      'Students verify webcam framing, microphone RMS baseline, and browser fullscreen permissions with clear disclosures prior to launch.',
  },
  {
    step: 'Stage 03',
    icon: Cpu,
    title: 'Local edge telemetry',
    description:
      'During the assessment, MediaPipe and Web Audio run locally on-device. Only timestamped risk metadata crosses the wire.',
  },
  {
    step: 'Stage 04',
    icon: UserCheck,
    title: 'Invigilator adjudication',
    description:
      'Invigilators receive prioritized risk alerts in real time, inspect chronological event logs, and record verified review outcomes.',
  },
];

/**
 * Four-stage examination lifecycle workflow presented as a sequential pipeline.
 */
export function HowItWorksSection() {
  return (
    <section
      id="workflow"
      className="border-b border-border bg-sidebar py-16 sm:py-20 px-4 sm:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium text-primary">
            End-to-end lifecycle
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            How AI ExamGuard secures every session
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            From exam publication to post-exam review, every transition enforces server validation
            and transparent audit trails.
          </p>
        </div>

        <ol className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <li
                key={item.step}
                className="relative flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                  <span className="font-mono text-xs tabular-nums text-primary">
                    {item.step}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {idx + 1}/{STEPS.length}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
