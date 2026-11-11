'use client';

import React, { useState } from 'react';
import { Loader2, Save, Settings2, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertPanel } from '@/components/shared/alert-panel';
import { updateExamConfigAction } from '@/lib/actions/exam-actions';
import { NEGATIVE_MARKING_VALUES } from '@/lib/validators/exam';
import type { ExamEditorView } from '@/types/exam-engine';

interface Step3ConfigProps {
  exam: ExamEditorView;
  onSaved: (exam: ExamEditorView, advance: boolean) => void;
  onBack: () => void;
}

/**
 * Wizard Step 3: Duration, maximum marks, passing marks, negative marking, and randomization.
 */
export function Step3Config({ exam, onSaved, onBack }: Step3ConfigProps) {
  const questionSum = exam.questions.reduce((acc, q) => acc + Number(q.points || 0), 0);

  const [durationMinutes, setDurationMinutes] = useState(exam.durationMinutes);
  const [totalPoints, setTotalPoints] = useState(
    exam.totalPoints > 0 ? exam.totalPoints : Math.max(1, questionSum)
  );
  const [passingMarks, setPassingMarks] = useState(exam.passingMarks);
  const [negativeMarking, setNegativeMarking] = useState(exam.negativeMarking);
  const [shuffleQuestions, setShuffleQuestions] = useState(exam.shuffleQuestions);
  const [shuffleOptions, setShuffleOptions] = useState(exam.shuffleOptions);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const windowMinutes = Math.max(
    5,
    Math.floor((Date.parse(exam.endTime) - Date.parse(exam.startTime)) / 60_000)
  );

  const handleSubmit = async (advance: boolean) => {
    setFormError(null);
    setFieldErrors({});
    setSaving(true);

    const res = await updateExamConfigAction(exam.id, {
      durationMinutes: Number(durationMinutes),
      totalPoints: Number(totalPoints),
      passingMarks: Number(passingMarks),
      negativeMarking: Number(negativeMarking),
      shuffleQuestions,
      shuffleOptions,
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
        <Settings2 className="h-4 w-4 text-primary" />
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Step 3 — Exam configuration &amp; scoring policy
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure attempt duration, passing thresholds, penalty policy, and item randomization.
          </p>
        </div>
      </div>

      {formError && (
        <AlertPanel
          tone="critical"
          title="Configuration error"
          description={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="cfg-dur">Duration (minutes)</Label>
          <Input
            id="cfg-dur"
            type="number"
            min={5}
            max={480}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Window allows up to <span className="font-mono">{windowMinutes}</span> min
          </p>
          {fieldErrors.durationMinutes && (
            <p className="text-xs text-destructive">{fieldErrors.durationMinutes}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="cfg-max">Maximum marks</Label>
            {questionSum > 0 && questionSum !== totalPoints && (
              <button
                type="button"
                onClick={() => {
                  setTotalPoints(questionSum);
                  if (passingMarks > questionSum) setPassingMarks(questionSum);
                }}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Sync ({questionSum})
              </button>
            )}
          </div>
          <Input
            id="cfg-max"
            type="number"
            min={1}
            max={1000}
            value={totalPoints}
            onChange={(e) => setTotalPoints(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Question marks sum: <span className="font-mono">{questionSum}</span> pts
          </p>
          {fieldErrors.totalPoints && (
            <p className="text-xs text-destructive">{fieldErrors.totalPoints}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cfg-pass">Passing marks</Label>
          <Input
            id="cfg-pass"
            type="number"
            min={0}
            max={totalPoints}
            value={passingMarks}
            onChange={(e) => setPassingMarks(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            {Number.isFinite(totalPoints) && totalPoints > 0 && Number.isFinite(passingMarks)
              ? `${Math.round((passingMarks / totalPoints) * 100)}% pass threshold`
              : 'Must be <= maximum marks'}
          </p>
          {fieldErrors.passingMarks && (
            <p className="text-xs text-destructive">{fieldErrors.passingMarks}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cfg-neg">Negative marking (wrong answer)</Label>
          <select
            id="cfg-neg"
            value={negativeMarking}
            onChange={(e) => setNegativeMarking(Number(e.target.value))}
            className="h-9 w-full rounded-md border border-border bg-sidebar px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {NEGATIVE_MARKING_VALUES.map((val) => (
              <option key={val} value={val}>
                {val === 0 ? '0 (Disabled)' : `-${val}x question marks`}
              </option>
            ))}
          </select>
          {fieldErrors.negativeMarking && (
            <p className="text-xs text-destructive">{fieldErrors.negativeMarking}</p>
          )}
        </div>
      </div>

      {/* Randomization Switches */}
      <div className="rounded-md border border-border bg-sidebar p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Shuffle className="h-3.5 w-3.5 text-secondary" />
          <span>Per-candidate randomization</span>
        </div>

        <label className="flex items-center justify-between gap-4 py-1 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-foreground">Question randomisation</p>
            <p className="text-xs text-muted-foreground">
              Deterministically shuffles question delivery order for each examinee.
            </p>
          </div>
          <input
            type="checkbox"
            checked={shuffleQuestions}
            onChange={(e) => setShuffleQuestions(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </label>

        <div className="border-t border-border" />

        <label className="flex items-center justify-between gap-4 py-1 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-foreground">Option randomisation</p>
            <p className="text-xs text-muted-foreground">
              Randomizes A–D answer option presentation per candidate while keeping server grading accurate.
            </p>
          </div>
          <input
            type="checkbox"
            checked={shuffleOptions}
            onChange={(e) => setShuffleOptions(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to questions
        </Button>
        <div className="flex flex-wrap gap-2.5">
          <Button type="button" variant="outline" disabled={saving} onClick={() => handleSubmit(false)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button type="button" disabled={saving} onClick={() => handleSubmit(true)}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save &amp; continue to student assignment
          </Button>
        </div>
      </div>
    </div>
  );
}

