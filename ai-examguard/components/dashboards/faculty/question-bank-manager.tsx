'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  CheckCircle2,
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertPanel } from '@/components/shared/alert-panel';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Modal } from '@/components/shared/modal';
import {
  deleteQuestionAction,
  listBankQuestionsAction,
  saveQuestionAction,
} from '@/lib/actions/exam-actions';
import { MCQ_OPTION_LABELS } from '@/lib/validators/exam';
import type { QuestionDifficulty } from '@/types/database';
import type { BankQuestionView, CourseOption, McqOptionLabel } from '@/types/exam-engine';
import { cn } from '@/lib/utils';

function difficultyTone(diff: QuestionDifficulty): 'success' | 'warning' | 'critical' {
  if (diff === 'easy') return 'success';
  if (diff === 'hard') return 'critical';
  return 'warning';
}

function emptyOptions(): Record<McqOptionLabel, string> {
  return { A: '', B: '', C: '', D: '' };
}

/**
 * Interactive Question Bank explorer, filterable by course, category, and difficulty,
 * with inline MCQ creation, editing, candidate/faculty preview, and protected answer keys.
 */
export function QuestionBankManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);

  const [questions, setQuestions] = useState<BankQuestionView[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [exams, setExams] = useState<{ id: string; title: string; courseId: string }[]>([]);

  const [courseFilter, setCourseFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [search, setSearch] = useState('');

  // Composer / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankQuestionView | null>(null);
  const [targetExamId, setTargetExamId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<Record<McqOptionLabel, string>>(emptyOptions);
  const [correctLabel, setCorrectLabel] = useState<McqOptionLabel>('A');
  const [points, setPoints] = useState(5);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<BankQuestionView | null>(null);
  const [showKey, setShowKey] = useState(false);

  const loadBank = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listBankQuestionsAction();
    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setQuestions(res.data.questions);
    setCourses(res.data.courses);
    setExams(res.data.exams);
    setTargetExamId((prev) => prev || res.data.exams[0]?.id || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await loadBank();
    })();
    return () => {
      active = false;
    };
  }, [loadBank]);

  const openCreateModal = () => {
    setEditing(null);
    setTargetExamId(exams[0]?.id || '');
    setPrompt('');
    setOptions(emptyOptions());
    setCorrectLabel('A');
    setPoints(5);
    setCategory('');
    setDifficulty('medium');
    setExplanation('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (bq: BankQuestionView) => {
    setEditing(bq);
    setTargetExamId(bq.examId);
    setPrompt(bq.prompt);
    const nextOpts = emptyOptions();
    let corr: McqOptionLabel = 'A';
    for (const o of bq.options) {
      if (o.label === 'A' || o.label === 'B' || o.label === 'C' || o.label === 'D') {
        nextOpts[o.label] = o.content;
        if (o.isCorrect) corr = o.label;
      }
    }
    setOptions(nextOpts);
    setCorrectLabel(corr);
    setPoints(bq.points);
    setCategory(bq.category || '');
    setDifficulty(bq.difficulty || 'medium');
    setExplanation(bq.explanation || '');
    setModalError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExamId) {
      setModalError('Select a target examination to house this question.');
      return;
    }
    setModalError(null);
    setSaving(true);

    const res = await saveQuestionAction(targetExamId, {
      questionId: editing?.id,
      prompt,
      points: Number(points),
      category,
      difficulty,
      explanation,
      orderIndex: editing?.orderIndex ?? 0,
      options: MCQ_OPTION_LABELS.map((lbl) => ({
        label: lbl,
        content: options[lbl],
        isCorrect: lbl === correctLabel,
      })),
    });

    setSaving(false);
    if (!res.success) {
      const firstFieldErr = res.fieldErrors
        ? Object.values(res.fieldErrors).find(Boolean)
        : undefined;
      setModalError(firstFieldErr ? `${res.error} (${firstFieldErr})` : res.error);
      return;
    }

    setModalOpen(false);
    setBanner({
      tone: 'success',
      text: editing ? 'Question updated in bank.' : 'MCQ question saved to bank.',
    });
    await loadBank();
  };

  const handleDelete = async (bq: BankQuestionView) => {
    setDeletingId(bq.id);
    const res = await deleteQuestionAction(bq.examId, bq.id);
    setDeletingId(null);
    if (!res.success) {
      setBanner({ tone: 'critical', text: res.error });
      return;
    }
    setBanner({ tone: 'success', text: 'Question deleted from bank.' });
    await loadBank();
  };

  const filtered = questions.filter((q) => {
    if (courseFilter && q.courseId !== courseFilter) return false;
    if (diffFilter && q.difficulty !== diffFilter) return false;
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      q.prompt.toLowerCase().includes(t) ||
      (q.category || '').toLowerCase().includes(t) ||
      q.examTitle.toLowerCase().includes(t) ||
      q.courseCode.toLowerCase().includes(t)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Question bank unavailable"
        message={error}
        onRetry={loadBank}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Question Bank"
        description="Author, filter, preview, and reuse MCQ items with protected server-side answer keys."
        badge={<StatusBadge tone="teal">{questions.length} MCQs</StatusBadge>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadBank}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            {exams.length > 0 ? (
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-3.5 w-3.5" />
                New MCQ question
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/faculty/exams/new">
                  <Plus className="h-3.5 w-3.5" />
                  Create exam first
                </Link>
              </Button>
            )}
          </>
        }
      />

      {banner && (
        <AlertPanel
          tone={banner.tone}
          title={banner.tone === 'success' ? 'Updated' : 'Notice'}
          description={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, categories, or exam titles..."
            className="pl-8"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          aria-label="Filter by course"
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-sm text-foreground"
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>

        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          aria-label="Filter by difficulty"
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-sm text-foreground"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching MCQ questions"
          description="Author questions inside the 6-step Exam Wizard or add a new MCQ item directly here."
          icon={<BookMarked className="h-5 w-5" />}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((q) => {
            const corr = q.options.find((o) => o.isCorrect);
            return (
              <div
                key={q.id}
                className="rounded-lg border border-border bg-card p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-primary">{q.courseCode}</span>
                      <StatusBadge tone={difficultyTone(q.difficulty)} className="capitalize">
                        {q.difficulty}
                      </StatusBadge>
                      {q.category && <StatusBadge tone="neutral">{q.category}</StatusBadge>}
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {q.points} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setShowKey(false);
                          setPreviewItem(q);
                        }}
                        aria-label="Preview question"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => openEditModal(q)}
                        aria-label="Edit question"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={deletingId === q.id}
                        onClick={() => handleDelete(q)}
                        aria-label="Delete question"
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === q.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-foreground leading-relaxed">{q.prompt}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={cn(
                          'rounded border px-2.5 py-1.5 flex items-center gap-2',
                          opt.isCorrect
                            ? 'border-success/50 bg-success/10 text-foreground'
                            : 'border-border bg-sidebar text-muted-foreground'
                        )}
                      >
                        <span className="font-mono font-semibold">{opt.label}.</span>
                        <span className="truncate">{opt.content}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
                  <Link
                    href={`/faculty/exams/${q.examId}/edit`}
                    className="hover:text-primary truncate"
                  >
                    Exam: {q.examTitle}
                  </Link>
                  {corr && (
                    <span className="text-success flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Key {corr.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Question Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit MCQ Question' : 'New MCQ Question'}
        description="Answer keys persist strictly in `question_answer_keys`."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {modalError && (
            <AlertPanel tone="critical" title="Validation error" description={modalError} />
          )}

          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="qb-exam">Target examination</Label>
              <select
                id="qb-exam"
                value={targetExamId}
                onChange={(e) => setTargetExamId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-sidebar px-3 text-sm text-foreground"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="qb-prompt">Question text</Label>
            <textarea
              id="qb-prompt"
              rows={3}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-md border border-border bg-sidebar p-3 text-sm text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label>Four options (select single correct key)</Label>
            {MCQ_OPTION_LABELS.map((lbl) => (
              <div
                key={lbl}
                className="flex items-center gap-2 rounded-md border border-border bg-sidebar p-2"
              >
                <label className="flex items-center gap-1.5 px-1.5 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="qb-correct"
                    checked={correctLabel === lbl}
                    onChange={() => setCorrectLabel(lbl)}
                    className="accent-success"
                  />
                  <span className="font-mono text-xs font-semibold">{lbl}</span>
                </label>
                <Input
                  required
                  value={options[lbl]}
                  onChange={(e) => setOptions((prev) => ({ ...prev, [lbl]: e.target.value }))}
                  placeholder={`Option ${lbl}`}
                  className="border-0 bg-transparent"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qb-pts">Marks</Label>
              <Input
                id="qb-pts"
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qb-cat">Category</Label>
              <Input
                id="qb-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Topic"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qb-diff">Difficulty</Label>
              <select
                id="qb-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="h-9 w-full rounded-md border border-border bg-sidebar px-3 text-sm text-foreground"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qb-expl">Explanation (faculty only)</Label>
            <Input
              id="qb-expl"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Update question' : 'Save MCQ question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title="Question Preview"
        description={
          showKey
            ? 'Faculty answer key view.'
            : 'Candidate rendering (answer key and rationale stripped).'
        }
        size="md"
        footer={
          <div className="flex w-full justify-between">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? 'Candidate mode' : 'Reveal answer key'}
            </Button>
            <Button type="button" size="sm" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
          </div>
        }
      >
        {previewItem && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {previewItem.category || 'General MCQ'} · {previewItem.difficulty}
              </span>
              <span className="tabular-nums">{previewItem.points} marks</span>
            </div>
            <p className="text-sm font-medium text-foreground">{previewItem.prompt}</p>
            <div className="space-y-2">
              {previewItem.options.map((opt) => (
                <div
                  key={opt.id}
                  className={cn(
                    'rounded border px-3 py-2 text-sm flex items-center gap-2',
                    showKey && opt.isCorrect
                      ? 'border-success bg-success/10'
                      : 'border-border bg-sidebar'
                  )}
                >
                  <span className="font-mono text-xs font-semibold text-primary">
                    {opt.label}.
                  </span>
                  <span>{opt.content}</span>
                </div>
              ))}
            </div>
            {showKey && previewItem.explanation && (
              <div className="rounded border border-border bg-sidebar p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Explanation: </strong>
                {previewItem.explanation}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
