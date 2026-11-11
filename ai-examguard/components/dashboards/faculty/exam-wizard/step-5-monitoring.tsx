'use client';

import React, { useState } from 'react';
import { Camera, Loader2, Maximize2, Mic, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertPanel } from '@/components/shared/alert-panel';
import { updateMonitoringSettingsAction } from '@/lib/actions/exam-actions';
import type { ExamEditorView } from '@/types/exam-engine';

interface Step5MonitoringProps {
  exam: ExamEditorView;
  onSaved: (exam: ExamEditorView, advance: boolean) => void;
  onBack: () => void;
}

/**
 * Wizard Step 5: Per-exam telemetry & human-review escalation thresholds.
 */
export function Step5Monitoring({ exam, onSaved, onBack }: Step5MonitoringProps) {
  const s = (exam.settings || {}) as Record<string, unknown>;

  const [requireCamera, setRequireCamera] = useState(
    typeof s.require_camera === 'boolean' ? s.require_camera : true
  );
  const [requireAudio, setRequireAudio] = useState(
    typeof s.require_audio === 'boolean' ? s.require_audio : true
  );
  const [requireFullscreen, setRequireFullscreen] = useState(
    typeof s.require_fullscreen === 'boolean' ? s.require_fullscreen : true
  );
  const [maxViolationsThreshold, setMaxViolationsThreshold] = useState(
    typeof s.max_violations_threshold === 'number' ? s.max_violations_threshold : 5
  );

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSave = async (advance: boolean) => {
    setFormError(null);
    setFieldErrors({});
    setSaving(true);

    const res = await updateMonitoringSettingsAction(exam.id, {
      requireCamera,
      requireAudio,
      requireFullscreen,
      maxViolationsThreshold: Number(maxViolationsThreshold),
    });

    setSaving(false);

    if (!res.success) {
      setFormError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    onSaved(res.data, advance);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Step 5 — Monitoring settings &amp; escalation policy
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure local browser edge sensors. Zero raw media frames are ever stored or uploaded.
          </p>
        </div>
      </div>

      {formError && (
        <AlertPanel
          tone="critical"
          title="Monitoring validation error"
          description={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="rounded-md border border-border bg-sidebar p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <Camera className="h-4 w-4 text-primary" />
            <input
              type="checkbox"
              checked={requireCamera}
              onChange={(e) => setRequireCamera(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Local face presence check</p>
            <p className="text-xs text-muted-foreground">
              Runs MediaPipe face detection locally in browser WASM to log absent or multiple faces.
            </p>
          </div>
        </label>

        <label className="rounded-md border border-border bg-sidebar p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <Mic className="h-4 w-4 text-secondary" />
            <input
              type="checkbox"
              checked={requireAudio}
              onChange={(e) => setRequireAudio(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Acoustic energy telemetry</p>
            <p className="text-xs text-muted-foreground">
              Monitors microphone decibel RMS spikes locally without recording or transcribing audio.
            </p>
          </div>
        </label>

        <label className="rounded-md border border-border bg-sidebar p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <Maximize2 className="h-4 w-4 text-warning" />
            <input
              type="checkbox"
              checked={requireFullscreen}
              onChange={(e) => setRequireFullscreen(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Fullscreen &amp; visibility lock</p>
            <p className="text-xs text-muted-foreground">
              Logs tab switching, window blur, and fullscreen exits with server timestamps.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-md border border-border bg-sidebar p-4 max-w-md space-y-2">
        <Label htmlFor="mon-thresh">Review escalation threshold (signals per session)</Label>
        <Input
          id="mon-thresh"
          type="number"
          min={1}
          max={100}
          value={maxViolationsThreshold}
          onChange={(e) => setMaxViolationsThreshold(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          Queues an invigilator review case automatically when threshold is met — never auto-fails a candidate.
        </p>
        {fieldErrors.maxViolationsThreshold && (
          <p className="text-xs text-destructive">{fieldErrors.maxViolationsThreshold}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to student assignment
        </Button>
        <div className="flex flex-wrap gap-2.5">
          <Button type="button" variant="outline" disabled={saving} onClick={() => handleSave(false)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button type="button" disabled={saving} onClick={() => handleSave(true)}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save &amp; preview examination
          </Button>
        </div>
      </div>
    </div>
  );
}

