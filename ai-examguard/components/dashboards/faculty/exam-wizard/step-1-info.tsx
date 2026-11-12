'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, Clock, FileText, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertPanel } from '@/components/shared/alert-panel';
import { createDraftExamAction, updateExamCoreAction } from '@/lib/actions/exam-actions';
import type { CourseOption, ExamEditorView } from '@/types/exam-engine';

interface Step1InfoProps {
  courses: CourseOption[];
  exam: ExamEditorView | null;
  onSaved: (exam: ExamEditorView, advance: boolean) => void;
}

function toLocalDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '09:00';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

function defaultWindowValues() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateStr = toLocalDateInput(tomorrow.toISOString());
  return { date: dateStr, start: '09:00', end: '11:00' };
}

/**
 * Wizard Step 1: Examination information (Title, Course, Description, Instructions, Date, Start/End Time).
 */
export function Step1Info({ courses, exam, onSaved }: Step1InfoProps) {
  const defaults = useMemo(() => defaultWindowValues(), []);

  const [courseId, setCourseId] = useState(exam?.courseId || courses[0]?.id || '');
  const [title, setTitle] = useState(exam?.title || '');
  const [description, setDescription] = useState(exam?.description || '');
  const [instructions, setInstructions] = useState(exam?.instructions || '');
  const [examDate, setExamDate] = useState(
    exam ? toLocalDateInput(exam.startTime) : defaults.date
  );
  const [startTimeOfDay, setStartTimeOfDay] = useState(
    exam ? toLocalTimeInput(exam.startTime) : defaults.start
  );
  const [endTimeOfDay, setEndTimeOfDay] = useState(
    exam ? toLocalTimeInput(exam.endTime) : defaults.end
  );

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submitCore = async (advance: boolean) => {
    setFormError(null);
    setFieldErrors({});

    if (!examDate || !startTimeOfDay || !endTimeOfDay) {
      setFormError('Examination date, start time, and end time are required.');
      return;
    }

    const startLocal = new Date(`${examDate}T${startTimeOfDay}:00`);
    const endLocal = new Date(`${examDate}T${endTimeOfDay}:00`);

    if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime())) {
      setFormError('Enter valid examination date and times.');
      return;
    }

    if (endLocal.getTime() <= startLocal.getTime()) {
      setFieldErrors({ endTime: 'End time must be later than start time on the examination date.' });
      setFormError('End time must be after start time.');
      return;
    }

    setSaving(true);
    const payload = {
      courseId: courseId || courses[0]?.id || '',
      title,
      description,
      instructions,
      startTime: startLocal.toISOString(),
      endTime: endLocal.toISOString(),
    };

    const res = exam
      ? await updateExamCoreAction(exam.id, payload)
      : await createDraftExamAction(payload);

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
        <FileText className="h-4 w-4 text-primary" />
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Step 1 — Examination information &amp; schedule window
          </h2>
          <p className="text-xs text-muted-foreground">
            Define course association, title, candidate instructions, and scheduled window.
          </p>
        </div>
      </div>

      {formError && (
        <AlertPanel
          tone="critical"
          title="Validation error"
          description={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-title">Examination title</Label>
          <Input
            id="wiz-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="CS-301 Midterm Assessment"
            autoComplete="off"
            spellCheck={false}
            required
          />
          {fieldErrors.title && (
            <p className="text-xs text-destructive">{fieldErrors.title}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wiz-course">Course</Label>
          <select
            id="wiz-course"
            value={courseId || courses[0]?.id || ''}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-sidebar px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {courses.length === 0 ? (
              <option value="">No assigned courses</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))
            )}
          </select>
          {fieldErrors.courseId && (
            <p className="text-xs text-destructive">{fieldErrors.courseId}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="wiz-date" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Examination date</span>
          </Label>
          <Input
            id="wiz-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wiz-start" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Start time</span>
          </Label>
          <Input
            id="wiz-start"
            type="time"
            value={startTimeOfDay}
            onChange={(e) => setStartTimeOfDay(e.target.value)}
            required
          />
          {fieldErrors.startTime && (
            <p className="text-xs text-destructive">{fieldErrors.startTime}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wiz-end" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>End time</span>
          </Label>
          <Input
            id="wiz-end"
            type="time"
            value={endTimeOfDay}
            onChange={(e) => setEndTimeOfDay(e.target.value)}
            required
          />
          {fieldErrors.endTime && (
            <p className="text-xs text-destructive">{fieldErrors.endTime}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wiz-desc">Description</Label>
        <textarea
          id="wiz-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Concise syllabus scope covered in this assessment..."
          className="w-full rounded-md border border-border bg-sidebar p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        />
        {fieldErrors.description && (
          <p className="text-xs text-destructive">{fieldErrors.description}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wiz-inst">Candidate instructions</Label>
        <textarea
          id="wiz-inst"
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Shown to examinees during pre-flight verification before the timer begins..."
          className="w-full rounded-md border border-border bg-sidebar p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        />
        {fieldErrors.instructions && (
          <p className="text-xs text-destructive">{fieldErrors.instructions}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          disabled={saving || courses.length === 0}
          onClick={() => submitCore(false)}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save draft
        </Button>
        <Button
          type="button"
          disabled={saving || courses.length === 0}
          onClick={() => submitCore(true)}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {exam ? 'Save & continue to questions' : 'Create draft & add questions'}
        </Button>
      </div>
    </div>
  );
}

