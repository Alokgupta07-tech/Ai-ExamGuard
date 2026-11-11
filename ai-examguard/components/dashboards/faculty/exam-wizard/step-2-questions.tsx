'use client';

import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  CheckCircle2,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertPanel } from '@/components/shared/alert-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/shared/modal';
import {
  deleteQuestionAction,
  importQuestionFromBankAction,
  listBankQuestionsAction,
  reorderQuestionsAction,
  saveQuestionAction,
} from '@/lib/actions/exam-actions';
import { MCQ_OPTION_LABELS } from '@/lib/validators/exam';
import type { QuestionDifficulty } from '@/types/database';
import type {
  BankQuestionView,
  ExamEditorView,
  McqOptionLabel,
  QuestionWithOptionsView,
} from '@/types/exam-engine';
import { cn } from '@/lib/utils';

interface Step2QuestionsProps {
  exam: ExamEditorView;
  onQuestionsChanged: (questions: QuestionWithOptionsView[], totalPoints: number, msg?: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function blankOptions(): Record<McqOptionLabel, string> {
  return { A: '', B: '', C: '', D: '' };
}

function difficultyTone(diff: QuestionDifficulty): 'success' | 'warning' | 'critical' {
  if (diff === 'easy') return 'success';
  if (diff === 'hard') return 'critical';
  return 'warning';
}

/**
 * Wizard Step 2: 4-option MCQ author, protected answer key selector, question preview, & bank importer.
 */
export function Step2Questions({
  exam,
  onQuestionsChanged,
  onBack,
  onNext,
}: Step2QuestionsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<Record<McqOptionLabel, string>>(blankOptions);
  const [correctLabel, setCorrectLabel] = useState<McqOptionLabel>('A');
  const [points, setPoints] = useState<number>(5);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium');
  const [explanation, setExplanation] = useState('');

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Question Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<QuestionWithOptionsView | null>(null);
  const [showKeyInPreview, setShowKeyInPreview] = useState(false);

  // Import from Bank Modal
  const [bankOpen, setBankOpen] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankItems, setBankItems] = useState<BankQuestionView[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankDiffFilter, setBankDiffFilter] = useState<string>('all');

  const resetComposer = () => {
    setEditingId(null);
    setPrompt('');
    setOptions(blankOptions());
    setCorrectLabel('A');
    setPoints(5);
    setCategory('');
    setDifficulty('medium');
    setExplanation('');
    setFormError(null);
    setFieldErrors({});
  };

  const loadForEdit = (q: QuestionWithOptionsView) => {
    setEditingId(q.id);
    setPrompt(q.prompt);
    const nextOpts = blankOptions();
    let corr: McqOptionLabel = 'A';
    for (const o of q.options) {
      if (o.label === 'A' || o.label === 'B' || o.label === 'C' || o.label === 'D') {
        nextOpts[o.label] = o.content;
        if (o.isCorrect) corr = o.label;
      }
    }
    setOptions(nextOpts);
    setCorrectLabel(corr);
    setPoints(q.points);
    setCategory(q.category || '');
    setDifficulty(q.difficulty || 'medium');
    setExplanation(q.explanation || '');
    setFormError(null);
    setFieldErrors({});
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaving(true);

    const payload = {
      questionId: editingId || undefined,
      prompt,
      points: Number(points),
      category,
      difficulty,
      explanation,
      orderIndex: exam.questions.length,
      options: MCQ_OPTION_LABELS.map((lbl) => ({
        label: lbl,
        content: options[lbl],
        isCorrect: lbl === correctLabel,
      })),
    };

    const res = await saveQuestionAction(exam.id, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    const updatedList = editingId
      ? exam.questions.map((q) => (q.id === res.data.question.id ? res.data.question : q))
      : [...exam.questions, res.data.question];

    onQuestionsChanged(
      updatedList,
      res.data.totalPoints,
      editingId ? 'Question updated and answer key synced.' : 'MCQ question added to examination.'
    );
    resetComposer();
  };

  const handleDelete = async (qId: string) => {
    setBusyId(qId);
    setFormError(null);
    const res = await deleteQuestionAction(exam.id, qId);
    setBusyId(null);
    if (!res.success) {
      setFormError(res.error);
      return;
    }
    const remaining = exam.questions
      .filter((q) => q.id !== qId)
      .map((q, idx) => ({ ...q, orderIndex: idx }));
    onQuestionsChanged(remaining, res.data.totalPoints, 'Question removed.');
    if (editingId === qId) resetComposer();
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exam.questions.length) return;
    const copy = [...exam.questions];
    const current = copy[index];
    const swapWith = copy[target];
    if (!current || !swapWith) return;
    copy[index] = swapWith;
    copy[target] = current;
    const ids = copy.map((q) => q.id);
    setBusyId(current.id);
    const res = await reorderQuestionsAction(exam.id, ids);
    setBusyId(null);
    if (!res.success) {
      setFormError(res.error);
      return;
    }
    onQuestionsChanged(res.data, exam.totalPoints);
  };

  const openBankModal = async () => {
    setBankOpen(true);
    setBankError(null);
    setBankLoading(true);
    const res = await listBankQuestionsAction();
    setBankLoading(false);
    if (!res.success) {
      setBankError(res.error);
      return;
    }
    setBankItems(res.data.questions.filter((q) => q.examId !== exam.id));
  };

  const handleImportFromBank = async (sourceQuestionId: string) => {
    setBusyId(sourceQuestionId);
    setBankError(null);
    const res = await importQuestionFromBankAction(exam.id, sourceQuestionId);
    setBusyId(null);
    if (!res.success) {
      setBankError(res.error);
      return;
    }
    onQuestionsChanged(
      [...exam.questions, res.data.question],
      res.data.totalPoints,
      'Imported question and answer key from Question Bank.'
    );
  };

  const filteredBank = bankItems.filter((item) => {
    if (bankDiffFilter !== 'all' && item.difficulty !== bankDiffFilter) return false;
    if (!bankSearch.trim()) return true;
    const term = bankSearch.toLowerCase();
    return (
      item.prompt.toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term) ||
      item.courseCode.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {formError && (
        <AlertPanel
          tone="critical"
          title="Question validation error"
          description={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Composer Column */}
        <form
          onSubmit={handleSaveQuestion}
          className="xl:col-span-6 rounded-lg border border-border bg-card p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                {editingId ? 'Edit MCQ Question' : 'Author MCQ Question'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Correct answer keys are persisted strictly in protected server tables.
              </p>
            </div>
            {editingId && (
              <Button type="button" size="xs" variant="outline" onClick={resetComposer}>
                New question
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-prompt">Question text</Label>
            <textarea
              id="q-prompt"
              rows={3}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Which ACID property ensures committed transactions survive system crashes?"
              className="w-full rounded-md border border-border bg-sidebar p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            {fieldErrors.prompt && <p className="text-xs text-destructive">{fieldErrors.prompt}</p>}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Four answer options (select single correct key)</Label>
              <span className="font-mono text-xs text-primary">Key: Option {correctLabel}</span>
            </div>

            {MCQ_OPTION_LABELS.map((lbl) => {
              const selected = correctLabel === lbl;
              return (
                <div
                  key={lbl}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border p-2 transition-colors',
                    selected ? 'border-success/60 bg-success/5' : 'border-border bg-sidebar'
                  )}
                >
                  <label className="flex items-center gap-1.5 px-1.5 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={selected}
                      onChange={() => setCorrectLabel(lbl)}
                      className="accent-success"
                    />
                    <span className="font-mono text-xs font-semibold text-foreground">{lbl}</span>
                  </label>
                  <Input
                    value={options[lbl]}
                    onChange={(e) => setOptions((prev) => ({ ...prev, [lbl]: e.target.value }))}
                    placeholder={`Enter option ${lbl}`}
                    required
                    className="border-0 bg-transparent focus-visible:outline-none"
                  />
                </div>
              );
            })}
            {fieldErrors.options && (
              <p className="text-xs text-destructive">{fieldErrors.options}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="q-marks">Marks</Label>
              <Input
                id="q-marks"
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                required
              />
              {fieldErrors.points && <p className="text-xs text-destructive">{fieldErrors.points}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="q-cat">Category / Topic</Label>
              <Input
                id="q-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Transactions"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="q-diff">Difficulty</Label>
              <select
                id="q-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="h-9 w-full rounded-md border border-border bg-sidebar px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-expl">Grading explanation (faculty only, never sent to examinees)</Label>
            <Input
              id="q-expl"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Write-ahead logging guarantees durability across crashes."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={openBankModal}>
              <BookMarked className="h-3.5 w-3.5" />
              Import from Question Bank
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? 'Save question changes' : 'Add question'}
            </Button>
          </div>
        </form>

        {/* Authored Questions Column */}
        <div className="xl:col-span-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3.5">
            <div>
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Exam Paper Questions ({exam.questions.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Total authored marks: <span className="font-mono text-primary">{exam.totalPoints} pts</span>
              </p>
            </div>
            <StatusBadge tone={exam.questions.length > 0 ? 'success' : 'warning'}>
              {exam.questions.length > 0 ? 'Ready' : 'Needs questions'}
            </StatusBadge>
          </div>

          {exam.questions.length === 0 ? (
            <EmptyState
              title="No questions added yet"
              description="Author MCQ questions on the left or import questions from your Question Bank."
            />
          ) : (
            <div className="space-y-3">
              {exam.questions.map((q, idx) => {
                const corr = q.options.find((o) => o.isCorrect);
                return (
                  <div
                    key={q.id}
                    className={cn(
                      'rounded-lg border bg-card p-4 space-y-3',
                      editingId === q.id ? 'border-primary' : 'border-border'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            Q{idx + 1}
                          </span>
                          <StatusBadge tone={difficultyTone(q.difficulty)} className="capitalize">
                            {q.difficulty}
                          </StatusBadge>
                          {q.category && (
                            <StatusBadge tone="neutral">{q.category}</StatusBadge>
                          )}
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {q.points} pts
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                          {q.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          disabled={idx === 0 || busyId === q.id}
                          onClick={() => handleMove(idx, -1)}
                          aria-label="Move question up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          disabled={idx === exam.questions.length - 1 || busyId === q.id}
                          onClick={() => handleMove(idx, 1)}
                          aria-label="Move question down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => {
                            setShowKeyInPreview(false);
                            setPreviewQuestion(q);
                          }}
                          aria-label="Preview question"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => loadForEdit(q)}
                          aria-label="Edit question"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          disabled={busyId === q.id}
                          onClick={() => handleDelete(q.id)}
                          aria-label="Delete question"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

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

                    {corr && (
                      <p className="text-xs text-success flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Protected key: Option {corr.label}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to exam information
        </Button>
        <Button type="button" onClick={onNext}>
          Continue to exam configuration
        </Button>
      </div>

      {/* Question Preview Modal */}
      <Modal
        open={Boolean(previewQuestion)}
        onClose={() => setPreviewQuestion(null)}
        title="Question Preview"
        description={
          showKeyInPreview
            ? 'Instructor verification view with protected answer key revealed.'
            : 'Candidate rendering view — answer key and explanation stripped.'
        }
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowKeyInPreview((v) => !v)}
            >
              {showKeyInPreview ? 'Hide answer key (Candidate mode)' : 'Reveal answer key'}
            </Button>
            <Button type="button" size="sm" onClick={() => setPreviewQuestion(null)}>
              Close
            </Button>
          </div>
        }
      >
        {previewQuestion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{previewQuestion.category || 'General MCQ'}</span>
              <span className="font-mono tabular-nums">{previewQuestion.points} marks</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {previewQuestion.prompt}
            </p>
            <div className="space-y-2">
              {previewQuestion.options.map((opt) => (
                <div
                  key={opt.id}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm flex items-center gap-2.5',
                    showKeyInPreview && opt.isCorrect
                      ? 'border-success bg-success/10 text-foreground'
                      : 'border-border bg-sidebar text-foreground'
                  )}
                >
                  <span className="font-mono text-xs font-semibold text-primary">
                    {opt.label}.
                  </span>
                  <span>{opt.content}</span>
                </div>
              ))}
            </div>
            {showKeyInPreview && previewQuestion.explanation && (
              <div className="rounded-md border border-border bg-sidebar p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Explanation: </strong>
                {previewQuestion.explanation}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Import from Bank Modal */}
      <Modal
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        title="Import MCQ from Question Bank"
        description="Clone authored questions and their protected answer keys into this examination."
        size="lg"
      >
        <div className="space-y-4">
          {bankError && (
            <AlertPanel
              tone="critical"
              title="Question bank import error"
              description={bankError}
              onDismiss={() => setBankError(null)}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <Input
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              placeholder="Search question prompt, category, or course code..."
              className="flex-1 min-w-[200px]"
            />
            <select
              value={bankDiffFilter}
              onChange={(e) => setBankDiffFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-sm text-foreground"
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {bankLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading question bank...
            </div>
          ) : filteredBank.length === 0 ? (
            <EmptyState
              title="No matching bank questions"
              description="Questions authored in other examinations across your courses will appear here."
            />
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
              {filteredBank.map((bq) => (
                <div
                  key={bq.id}
                  className="rounded-md border border-border bg-sidebar p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-primary">{bq.courseCode}</span>
                      <StatusBadge tone={difficultyTone(bq.difficulty)} className="capitalize">
                        {bq.difficulty}
                      </StatusBadge>
                      {bq.category && <StatusBadge tone="neutral">{bq.category}</StatusBadge>}
                      <span className="font-mono text-xs text-muted-foreground">{bq.points} pts</span>
                    </div>
                    <p className="text-sm text-foreground">{bq.prompt}</p>
                    <p className="text-xs text-muted-foreground">From: {bq.examTitle}</p>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    disabled={busyId === bq.id}
                    onClick={() => handleImportFromBank(bq.id)}
                  >
                    {busyId === bq.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Import
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
