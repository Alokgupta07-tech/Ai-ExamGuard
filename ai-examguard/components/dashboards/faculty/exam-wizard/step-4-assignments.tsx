'use client';

import React, { useEffect, useState } from 'react';
import { CheckSquare, Loader2, Save, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertPanel } from '@/components/shared/alert-panel';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { assignStudentsAction, getCourseRosterAction } from '@/lib/actions/exam-actions';
import { formatShortDateTime } from '@/lib/utils/dashboard-formatters';
import type { ExamEditorView, RosterStudentView } from '@/types/exam-engine';

interface Step4AssignmentsProps {
  exam: ExamEditorView;
  onSaved: (assignedIds: string[], advance: boolean) => void;
  onBack: () => void;
}

/**
 * Wizard Step 4: Student roster assignment persisted in `exam_assignments`.
 */
export function Step4Assignments({ exam, onSaved, onBack }: Step4AssignmentsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterStudentView[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(exam.assignedStudentIds);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await getCourseRosterAction(exam.id);
      if (!active) return;
      if (!res.success) {
        setError(res.error);
      } else {
        setRoster(res.data.roster);
        setSelectedIds(res.data.assignedStudentIds);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [exam.id]);

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async (advance: boolean) => {
    setError(null);
    setSaving(true);
    const res = await assignStudentsAction(exam.id, selectedIds);
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSaved(selectedIds, advance);
  };

  const filtered = roster.filter((r) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return r.studentName.toLowerCase().includes(t) || r.studentEmail.toLowerCase().includes(t);
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Step 4 — Student assignment ({exam.courseCode})
            </h2>
            <p className="text-xs text-muted-foreground">
              Assign a specific cohort via exam_assignments, or leave empty so all enrolled course students have access.
            </p>
          </div>
        </div>
        <span className="font-mono text-xs tabular-nums text-primary">
          {selectedIds.length} / {roster.length} selected
        </span>
      </div>

      {error && (
        <AlertPanel
          tone="critical"
          title="Assignment error"
          description={error}
          onDismiss={() => setError(null)}
        />
      )}

      {loading ? (
        <LoadingSkeleton variant="list" count={4} />
      ) : roster.length === 0 ? (
        <EmptyState
          title="No enrolled students in this course"
          description="Enroll students into the course first or continue and assign candidates before opening the exam window."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter enrolled students..."
                className="pl-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => setSelectedIds(roster.map((r) => r.studentId))}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Select all ({roster.length})
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden divide-y divide-border max-h-80 overflow-y-auto">
            {filtered.map((student) => {
              const checked = selectedIds.includes(student.studentId);
              return (
                <label
                  key={student.studentId}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-sidebar hover:bg-surface-elevated cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(student.studentId)}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {student.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.studentEmail}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    Enrolled {formatShortDateTime(student.enrolledAt)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to exam configuration
        </Button>
        <div className="flex flex-wrap gap-2.5">
          <Button type="button" variant="outline" disabled={saving} onClick={() => handleSave(false)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button type="button" disabled={saving} onClick={() => handleSave(true)}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save &amp; continue to monitoring
          </Button>
        </div>
      </div>
    </div>
  );
}
