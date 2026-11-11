import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRoleActor, type VerifiedActor } from '@/lib/services/dashboard';
import type { ExamStatus, QuestionDifficulty, QuestionType } from '@/types/database';
import type {
  BankQuestionView,
  CourseOption,
  ExamAssignmentResult,
  ExamConfigInput,
  ExamCoreInput,
  ExamEditorView,
  ExamMonitoringInput,
  ExamPublishCheck,
  ExamPublishPreview,
  ExamSettingsJson,
  ExamWizardBootstrap,
  QuestionInput,
  QuestionOptionView,
  QuestionWithOptionsView,
  RosterStudentView,
  StudentExamPaper,
  StudentOptionView,
  StudentQuestionView,
} from '@/types/exam-engine';
import {
  durationFitsWindow,
  examAssignmentSchema,
  examConfigSchema,
  examCoreSchema,
  examMonitoringSchema,
  fieldErrorsFrom,
  mcqQuestionSchema,
} from '@/lib/validators/exam';

export class ExamValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ExamValidationError';
    this.fieldErrors = fieldErrors;
  }
}

interface OwnedExamContext {
  exam: {
    id: string;
    course_id: string;
    tenant_id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    duration_minutes: number;
    start_time: string;
    end_time: string;
    status: ExamStatus;
    total_points: number;
    passing_marks: number;
    negative_marking: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    settings: ExamSettingsJson | null;
    created_by: string;
  };
  course: {
    id: string;
    code: string;
    name: string;
    instructor_id: string;
    tenant_id: string;
  };
}

function deterministicShuffle<T>(items: T[], seedStr: string): T[] {
  const copy = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

function extractMonitoringSettings(
  settings: ExamSettingsJson | null | undefined,
  tenantDefaults?: ExamSettingsJson
): ExamMonitoringInput {
  const s = settings || {};
  const t = tenantDefaults || {};
  return {
    requireCamera:
      typeof s.require_camera === 'boolean'
        ? s.require_camera
        : typeof t.require_camera === 'boolean'
          ? t.require_camera
          : true,
    requireAudio:
      typeof s.require_audio === 'boolean'
        ? s.require_audio
        : typeof t.require_audio === 'boolean'
          ? t.require_audio
          : true,
    requireFullscreen:
      typeof s.require_fullscreen === 'boolean'
        ? s.require_fullscreen
        : typeof t.require_fullscreen === 'boolean'
          ? t.require_fullscreen
          : true,
    maxViolationsThreshold:
      typeof s.max_violations_threshold === 'number'
        ? s.max_violations_threshold
        : typeof t.max_violations_threshold === 'number'
          ? t.max_violations_threshold
          : 5,
  };
}

async function logExamAudit(
  actor: VerifiedActor,
  action: 'EXAM_CREATED' | 'EXAM_PUBLISHED' | 'QUESTION_CREATED' | 'QUESTION_UPDATED' | 'QUESTION_DELETED' | 'SETTINGS_CHANGED',
  entityType: 'exam' | 'question',
  entityId: string,
  details: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: actor.tenantId,
    user_id: actor.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

async function requireOwnedCourse(
  courseId: string,
  actor: VerifiedActor
): Promise<{ id: string; code: string; name: string; instructor_id: string; tenant_id: string }> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('id, code, name, instructor_id, tenant_id')
    .eq('id', courseId)
    .eq('tenant_id', actor.tenantId)
    .single();

  if (error || !data) {
    throw new ExamValidationError('Selected course does not exist in this university tenant.', {
      courseId: 'Course not found',
    });
  }

  const course = data as {
    id: string;
    code: string;
    name: string;
    instructor_id: string;
    tenant_id: string;
  };

  if (!actor.roles.includes('admin') && course.instructor_id !== actor.userId) {
    throw new Error('Forbidden: You can only author exams for courses you instruct.');
  }

  return course;
}

async function requireOwnedExam(examId: string, actor: VerifiedActor): Promise<OwnedExamContext> {
  const { data: examRow, error } = await supabaseAdmin
    .from('exams')
    .select(
      'id, course_id, tenant_id, title, description, instructions, duration_minutes, start_time, end_time, status, total_points, passing_marks, negative_marking, shuffle_questions, shuffle_options, settings, created_by'
    )
    .eq('id', examId)
    .eq('tenant_id', actor.tenantId)
    .single();

  if (error || !examRow) {
    throw new Error('Examination not found in your university tenant.');
  }

  const exam = examRow as OwnedExamContext['exam'];
  const course = await requireOwnedCourse(exam.course_id, actor);
  return { exam, course };
}

async function fetchQuestionsWithOptions(examId: string): Promise<QuestionWithOptionsView[]> {
  const { data: qRows, error: qError } = await supabaseAdmin
    .from('questions')
    .select('id, exam_id, order_index, type, prompt, points, explanation, category, difficulty')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });

  if (qError) {
    throw new Error(`Failed to fetch examination questions: ${qError.message}`);
  }

  const questions = (qRows || []) as {
    id: string;
    exam_id: string;
    order_index: number;
    type: QuestionType;
    prompt: string;
    points: number;
    explanation: string | null;
    category: string | null;
    difficulty: QuestionDifficulty;
  }[];

  if (questions.length === 0) return [];

  const qIds = questions.map((q) => q.id);
  const { data: optRows, error: optError } = await supabaseAdmin
    .from('question_answer_keys')
    .select('id, question_id, label, content, is_correct, order_index')
    .in('question_id', qIds)
    .order('order_index', { ascending: true });

  if (optError) {
    throw new Error(`Failed to fetch answer options: ${optError.message}`);
  }

  const optionsByQuestion = new Map<string, QuestionOptionView[]>();
  for (const opt of (optRows || []) as {
    id: string;
    question_id: string;
    label: string;
    content: string;
    is_correct: boolean;
    order_index: number;
  }[]) {
    const list = optionsByQuestion.get(opt.question_id) || [];
    list.push({
      id: opt.id,
      label: opt.label,
      content: opt.content,
      isCorrect: Boolean(opt.is_correct),
      orderIndex: opt.order_index,
    });
    optionsByQuestion.set(opt.question_id, list);
  }

  return questions.map((q) => ({
    id: q.id,
    examId: q.exam_id,
    orderIndex: q.order_index,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    category: q.category ?? null,
    difficulty: q.difficulty || 'medium',
    explanation: q.explanation ?? null,
    options: optionsByQuestion.get(q.id) || [],
  }));
}

async function recalculateExamTotals(
  examId: string,
  currentPassingMarks: number
): Promise<number> {
  const { data: qRows } = await supabaseAdmin
    .from('questions')
    .select('points')
    .eq('exam_id', examId);

  const sum = ((qRows || []) as { points: number }[]).reduce(
    (acc, q) => acc + Number(q.points || 0),
    0
  );

  const nextPassingMarks = Math.min(currentPassingMarks, sum);

  const { error } = await supabaseAdmin
    .from('exams')
    .update({
      total_points: sum,
      passing_marks: nextPassingMarks,
    })
    .eq('id', examId);

  if (error) {
    throw new Error(`Failed to synchronize exam marks total: ${error.message}`);
  }

  return sum;
}

async function compactQuestionOrder(examId: string): Promise<void> {
  const { data: rows, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });

  if (qErr) {
    throw new Error(`Failed to reload question order: ${qErr.message}`);
  }

  const orderedIds = ((rows || []) as { id: string }[]).map((r) => r.id);
  if (orderedIds.length === 0) return;

  // Phase 1: shift past max index to avoid UNIQUE(exam_id, order_index) collisions
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabaseAdmin
      .from('questions')
      .update({ order_index: 10000 + i })
      .eq('id', orderedIds[i]);
    if (error) {
      throw new Error(`Failed to shift question order: ${error.message}`);
    }
  }

  // Phase 2: write dense 0..N-1 indices and sync exam_questions
  for (let i = 0; i < orderedIds.length; i++) {
    const { error: updErr } = await supabaseAdmin
      .from('questions')
      .update({ order_index: i })
      .eq('id', orderedIds[i]);
    if (updErr) {
      throw new Error(`Failed to assign question index: ${updErr.message}`);
    }
    const { error: eqErr } = await supabaseAdmin
      .from('exam_questions')
      .update({ order_index: i })
      .eq('exam_id', examId)
      .eq('question_id', orderedIds[i]);
    if (eqErr) {
      throw new Error(`Failed to synchronize exam_questions order: ${eqErr.message}`);
    }
  }
}

function buildPublishChecks(
  exam: OwnedExamContext['exam'],
  questionCount: number,
  questionPointsSum: number,
  assignedCount: number,
  enrolledCount: number
): ExamPublishCheck[] {
  const checks: ExamPublishCheck[] = [];
  if (questionCount === 0) {
    checks.push({
      level: 'error',
      field: 'questions',
      message: 'Add at least one MCQ question with a marked correct answer key before publishing.',
    });
  }
  if (exam.total_points <= 0) {
    checks.push({
      level: 'error',
      field: 'totalPoints',
      message: 'Maximum marks must be greater than zero.',
    });
  }
  if (exam.passing_marks > exam.total_points) {
    checks.push({
      level: 'error',
      field: 'passingMarks',
      message: 'Passing marks cannot exceed total maximum marks.',
    });
  }
  if (!durationFitsWindow(exam.duration_minutes, exam.start_time, exam.end_time)) {
    checks.push({
      level: 'error',
      field: 'durationMinutes',
      message: 'Exam duration exceeds the scheduled availability window between start and end times.',
    });
  }
  if (questionCount > 0 && questionPointsSum !== exam.total_points) {
    checks.push({
      level: 'warning',
      field: 'totalPoints',
      message: `Authored question marks sum to ${questionPointsSum}, while configured maximum marks is ${exam.total_points}. Sync in Step 3 if unintended.`,
    });
  }
  if (assignedCount === 0 && enrolledCount === 0) {
    checks.push({
      level: 'warning',
      field: 'assignments',
      message: 'No students are enrolled or assigned to this course yet.',
    });
  } else if (assignedCount === 0 && enrolledCount > 0) {
    checks.push({
      level: 'warning',
      field: 'assignments',
      message: `No explicit subset selected — all ${enrolledCount} enrolled students in the course will have access.`,
    });
  }
  return checks;
}

export class ExamEngineService {
  /**
   * Lists courses owned by the authenticated faculty member (or all tenant courses for admin).
   */
  static async bootstrapWizard(): Promise<ExamWizardBootstrap> {
    const actor = await requireRoleActor(['instructor', 'admin']);

    let query = supabaseAdmin
      .from('courses')
      .select('id, code, name')
      .eq('tenant_id', actor.tenantId)
      .order('code', { ascending: true });

    if (!actor.roles.includes('admin')) {
      query = query.eq('instructor_id', actor.userId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load courses: ${error.message}`);
    }

    return {
      courses: ((data || []) as { id: string; code: string; name: string }[]).map(
        (c): CourseOption => ({
          id: c.id,
          code: c.code,
          name: c.name,
        })
      ),
    };
  }

  /**
   * Returns complete exam editor payload including protected answer keys (faculty/admin only).
   */
  static async getExamForEditor(examId: string): Promise<ExamEditorView> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam, course } = await requireOwnedExam(examId, actor);

    const [questions, { data: assignmentRows }] = await Promise.all([
      fetchQuestionsWithOptions(exam.id),
      supabaseAdmin
        .from('exam_assignments')
        .select('student_id')
        .eq('exam_id', exam.id),
    ]);

    return {
      id: exam.id,
      courseId: exam.course_id,
      courseCode: course.code,
      courseName: course.name,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      durationMinutes: exam.duration_minutes,
      startTime: exam.start_time,
      endTime: exam.end_time,
      passingMarks: exam.passing_marks ?? 0,
      negativeMarking: Number(exam.negative_marking ?? 0),
      shuffleQuestions: Boolean(exam.shuffle_questions),
      shuffleOptions: Boolean(exam.shuffle_options),
      status: exam.status,
      totalPoints: exam.total_points,
      settings: exam.settings || {},
      questions,
      assignedStudentIds: ((assignmentRows || []) as { student_id: string }[]).map(
        (a) => a.student_id
      ),
    };
  }

  /**
   * Step 1: Creates a persisted draft examination validated against course ownership & window bounds.
   */
  static async createDraftExam(input: ExamCoreInput): Promise<ExamEditorView> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const parsed = examCoreSchema.safeParse(input);
    if (!parsed.success) {
      throw new ExamValidationError('Invalid examination details.', fieldErrorsFrom(parsed.error));
    }

    const valid = parsed.data;
    await requireOwnedCourse(valid.courseId, actor);

    const windowMinutes = Math.floor(
      (Date.parse(valid.endTime) - Date.parse(valid.startTime)) / 60_000
    );
    if (windowMinutes < 5) {
      throw new ExamValidationError(
        'Examination window must be at least 5 minutes long.',
        { endTime: 'End time must be at least 5 minutes after start time' }
      );
    }

    const defaultDuration = Math.min(60, Math.max(5, windowMinutes));
    const tenantMonitoring = extractMonitoringSettings(null, actor.tenantSettings);

    const { data: created, error } = await supabaseAdmin
      .from('exams')
      .insert({
        course_id: valid.courseId,
        tenant_id: actor.tenantId,
        created_by: actor.userId,
        title: valid.title,
        description: valid.description || null,
        instructions: valid.instructions || null,
        start_time: new Date(valid.startTime).toISOString(),
        end_time: new Date(valid.endTime).toISOString(),
        duration_minutes: defaultDuration,
        status: 'draft',
        total_points: 0,
        passing_marks: 0,
        negative_marking: 0,
        shuffle_questions: true,
        shuffle_options: true,
        settings: {
          require_camera: tenantMonitoring.requireCamera,
          require_audio: tenantMonitoring.requireAudio,
          require_fullscreen: tenantMonitoring.requireFullscreen,
          max_violations_threshold: tenantMonitoring.maxViolationsThreshold,
        },
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create draft examination: ${error?.message}`);
    }

    const examId = (created as { id: string }).id;
    await logExamAudit(actor, 'EXAM_CREATED', 'exam', examId, {
      title: valid.title,
      courseId: valid.courseId,
    });

    return this.getExamForEditor(examId);
  }

  /**
   * Step 1 (update): Updates examination metadata and schedule window.
   */
  static async updateExamCore(examId: string, input: ExamCoreInput): Promise<ExamEditorView> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const parsed = examCoreSchema.safeParse(input);
    if (!parsed.success) {
      throw new ExamValidationError('Invalid examination details.', fieldErrorsFrom(parsed.error));
    }

    const valid = parsed.data;
    await requireOwnedCourse(valid.courseId, actor);

    const windowMinutes = Math.floor(
      (Date.parse(valid.endTime) - Date.parse(valid.startTime)) / 60_000
    );
    if (windowMinutes < 5) {
      throw new ExamValidationError('Examination window must span at least 5 minutes.', {
        endTime: 'End time must be at least 5 minutes after start time',
      });
    }

    const nextDuration =
      exam.duration_minutes > windowMinutes ? windowMinutes : exam.duration_minutes;

    const { error } = await supabaseAdmin
      .from('exams')
      .update({
        course_id: valid.courseId,
        title: valid.title,
        description: valid.description || null,
        instructions: valid.instructions || null,
        start_time: new Date(valid.startTime).toISOString(),
        end_time: new Date(valid.endTime).toISOString(),
        duration_minutes: nextDuration,
      })
      .eq('id', exam.id);

    if (error) {
      throw new Error(`Failed to update examination information: ${error.message}`);
    }

    // If course changed, purge stale assignments belonging to the previous course's roster
    if (valid.courseId !== exam.course_id) {
      const { error: purgeErr } = await supabaseAdmin
        .from('exam_assignments')
        .delete()
        .eq('exam_id', exam.id);
      if (purgeErr) {
        throw new Error(`Failed to clear previous course student assignments: ${purgeErr.message}`);
      }
    }

    return this.getExamForEditor(exam.id);
  }

  /**
   * Step 2 (create / update): Saves an MCQ question with 4 options and an isolated answer key.
   */
  static async saveQuestion(
    examId: string,
    input: QuestionInput
  ): Promise<{ question: QuestionWithOptionsView; totalPoints: number }> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const parsed = mcqQuestionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ExamValidationError('Invalid MCQ question details.', fieldErrorsFrom(parsed.error));
    }

    const valid = parsed.data;
    let questionId = valid.questionId;
    const isUpdate = Boolean(questionId);

    if (questionId) {
      const { data: existing, error: findErr } = await supabaseAdmin
        .from('questions')
        .select('id, exam_id')
        .eq('id', questionId)
        .eq('exam_id', exam.id)
        .single();

      if (findErr || !existing) {
        throw new Error('Question not found on this examination.');
      }

      const { error: updErr } = await supabaseAdmin
        .from('questions')
        .update({
          prompt: valid.prompt,
          points: valid.points,
          category: valid.category || null,
          difficulty: valid.difficulty,
          explanation: valid.explanation || null,
        })
        .eq('id', questionId);

      if (updErr) {
        throw new Error(`Failed to update question: ${updErr.message}`);
      }
    } else {
      const { data: maxRows } = await supabaseAdmin
        .from('questions')
        .select('order_index')
        .eq('exam_id', exam.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextIndex =
        maxRows && maxRows.length > 0
          ? Number((maxRows[0] as { order_index: number }).order_index) + 1
          : 0;

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('questions')
        .insert({
          exam_id: exam.id,
          order_index: nextIndex,
          type: 'mcq_single',
          prompt: valid.prompt,
          points: valid.points,
          category: valid.category || null,
          difficulty: valid.difficulty,
          explanation: valid.explanation || null,
        })
        .select('id, order_index')
        .single();

      if (insErr || !inserted) {
        throw new Error(`Failed to create MCQ question: ${insErr?.message}`);
      }

      const createdRow = inserted as { id: string; order_index: number };
      questionId = createdRow.id;

      const { error: eqErr } = await supabaseAdmin.from('exam_questions').upsert(
        {
          exam_id: exam.id,
          question_id: questionId,
          order_index: createdRow.order_index,
        },
        { onConflict: 'exam_id,question_id' }
      );
      if (eqErr) {
        throw new Error(`Failed to link question to exam: ${eqErr.message}`);
      }
    }

    const answerRows = valid.options.map((opt, idx) => ({
      question_id: questionId!,
      label: opt.label,
      content: opt.content,
      is_correct: opt.isCorrect,
      order_index: idx,
    }));

    const { error: keyErr } = await supabaseAdmin
      .from('question_answer_keys')
      .upsert(answerRows, { onConflict: 'question_id,label' });
    if (keyErr) {
      throw new Error(`Failed to persist protected answer keys: ${keyErr.message}`);
    }

    const totalPoints = await recalculateExamTotals(exam.id, exam.passing_marks);

    await logExamAudit(
      actor,
      isUpdate ? 'QUESTION_UPDATED' : 'QUESTION_CREATED',
      'question',
      questionId!,
      {
        examId: exam.id,
        points: valid.points,
        difficulty: valid.difficulty,
        category: valid.category || null,
      }
    );

    const allQuestions = await fetchQuestionsWithOptions(exam.id);
    const saved = allQuestions.find((q) => q.id === questionId);
    if (!saved) {
      throw new Error('Saved question could not be reloaded.');
    }

    return { question: saved, totalPoints };
  }

  /**
   * Step 2 (delete): Removes a question, compacts order indices, and recalculates exam marks.
   */
  static async deleteQuestion(examId: string, questionId: string): Promise<{ totalPoints: number }> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const { count: currentCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', exam.id);

    if ((exam.status === 'published' || exam.status === 'active') && (currentCount || 0) <= 1) {
      throw new ExamValidationError(
        'Cannot remove the last question from a published or active examination.'
      );
    }

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', questionId)
      .eq('exam_id', exam.id);

    if (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }

    await compactQuestionOrder(exam.id);
    const totalPoints = await recalculateExamTotals(exam.id, exam.passing_marks);

    await logExamAudit(actor, 'QUESTION_DELETED', 'question', questionId, { examId: exam.id });

    return { totalPoints };
  }

  /**
   * Step 2 (reorder): Two-phase order_index update preventing unique index violations.
   */
  static async reorderQuestions(
    examId: string,
    orderedQuestionIds: string[]
  ): Promise<QuestionWithOptionsView[]> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const existing = await fetchQuestionsWithOptions(exam.id);
    const existingIds = new Set(existing.map((q) => q.id));

    if (
      orderedQuestionIds.length !== existing.length ||
      orderedQuestionIds.some((id) => !existingIds.has(id))
    ) {
      throw new ExamValidationError('Question order list does not match questions in this exam.');
    }

    for (let i = 0; i < orderedQuestionIds.length; i++) {
      const { error } = await supabaseAdmin
        .from('questions')
        .update({ order_index: 10000 + i })
        .eq('id', orderedQuestionIds[i])
        .eq('exam_id', exam.id);
      if (error) {
        throw new Error(`Failed to reorder questions (shift phase): ${error.message}`);
      }
    }

    for (let i = 0; i < orderedQuestionIds.length; i++) {
      const { error: qUpdErr } = await supabaseAdmin
        .from('questions')
        .update({ order_index: i })
        .eq('id', orderedQuestionIds[i])
        .eq('exam_id', exam.id);
      if (qUpdErr) {
        throw new Error(`Failed to save question order: ${qUpdErr.message}`);
      }

      const { error: eqUpdErr } = await supabaseAdmin
        .from('exam_questions')
        .update({ order_index: i })
        .eq('exam_id', exam.id)
        .eq('question_id', orderedQuestionIds[i]);
      if (eqUpdErr) {
        throw new Error(`Failed to synchronize exam_questions order: ${eqUpdErr.message}`);
      }
    }

    return fetchQuestionsWithOptions(exam.id);
  }

  /**
   * Question Bank: Returns reusable MCQs with protected answer keys for faculty/admin authoring.
   */
  static async listBankQuestions(filters?: {
    courseId?: string;
    category?: string;
    difficulty?: QuestionDifficulty;
    search?: string;
  }): Promise<{ questions: BankQuestionView[]; courses: CourseOption[]; exams: { id: string; title: string; courseId: string }[] }> {
    const actor = await requireRoleActor(['instructor', 'admin']);

    let courseQuery = supabaseAdmin
      .from('courses')
      .select('id, code, name')
      .eq('tenant_id', actor.tenantId)
      .order('code', { ascending: true });

    if (!actor.roles.includes('admin')) {
      courseQuery = courseQuery.eq('instructor_id', actor.userId);
    }

    const { data: courseRows, error: cErr } = await courseQuery;
    if (cErr) {
      throw new Error(`Failed to load courses for question bank: ${cErr.message}`);
    }
    const courses = (courseRows || []) as { id: string; code: string; name: string }[];
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const allowedCourseIds = courses.map((c) => c.id);

    if (allowedCourseIds.length === 0) {
      return { questions: [], courses: [], exams: [] };
    }

    const { data: examRows, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('id, title, course_id')
      .eq('tenant_id', actor.tenantId)
      .in('course_id', allowedCourseIds)
      .order('created_at', { ascending: false });
    if (exErr) {
      throw new Error(`Failed to load exams for question bank: ${exErr.message}`);
    }

    const exams = (examRows || []) as { id: string; title: string; course_id: string }[];
    const examMap = new Map(exams.map((e) => [e.id, e]));
    const filteredExamIds = filters?.courseId
      ? exams.filter((e) => e.course_id === filters.courseId).map((e) => e.id)
      : exams.map((e) => e.id);

    if (filteredExamIds.length === 0) {
      return {
        questions: [],
        courses,
        exams: exams.map((e) => ({ id: e.id, title: e.title, courseId: e.course_id })),
      };
    }

    let qQuery = supabaseAdmin
      .from('questions')
      .select('id, exam_id, order_index, type, prompt, points, explanation, category, difficulty, created_at')
      .in('exam_id', filteredExamIds)
      .order('created_at', { ascending: false });

    if (filters?.difficulty) {
      qQuery = qQuery.eq('difficulty', filters.difficulty);
    }
    if (filters?.category) {
      qQuery = qQuery.eq('category', filters.category);
    }

    const { data: qRows } = await qQuery;
    const rawQuestions = (qRows || []) as {
      id: string;
      exam_id: string;
      order_index: number;
      type: QuestionType;
      prompt: string;
      points: number;
      explanation: string | null;
      category: string | null;
      difficulty: QuestionDifficulty;
      created_at: string;
    }[];

    const searchTerm = filters?.search?.trim().toLowerCase() || '';
    const matchingQuestions = searchTerm
      ? rawQuestions.filter(
          (q) =>
            q.prompt.toLowerCase().includes(searchTerm) ||
            (q.category || '').toLowerCase().includes(searchTerm)
        )
      : rawQuestions;

    const qIds = matchingQuestions.map((q) => q.id);
    const { data: optRows } =
      qIds.length > 0
        ? await supabaseAdmin
            .from('question_answer_keys')
            .select('id, question_id, label, content, is_correct, order_index')
            .in('question_id', qIds)
            .order('order_index', { ascending: true })
        : { data: [] };

    const optionsByQ = new Map<string, QuestionOptionView[]>();
    for (const opt of (optRows || []) as {
      id: string;
      question_id: string;
      label: string;
      content: string;
      is_correct: boolean;
      order_index: number;
    }[]) {
      const list = optionsByQ.get(opt.question_id) || [];
      list.push({
        id: opt.id,
        label: opt.label,
        content: opt.content,
        isCorrect: Boolean(opt.is_correct),
        orderIndex: opt.order_index,
      });
      optionsByQ.set(opt.question_id, list);
    }

    const bankQuestions: BankQuestionView[] = matchingQuestions.map((q) => {
      const ex = examMap.get(q.exam_id);
      const co = ex ? courseMap.get(ex.course_id) : undefined;
      return {
        id: q.id,
        examId: q.exam_id,
        examTitle: ex?.title || 'Examination',
        courseId: ex?.course_id || '',
        courseCode: co?.code || 'COURSE',
        courseName: co?.name || 'Course',
        orderIndex: q.order_index,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        category: q.category ?? null,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation ?? null,
        options: optionsByQ.get(q.id) || [],
        createdAt: q.created_at,
      };
    });

    return {
      questions: bankQuestions,
      courses,
      exams: exams.map((e) => ({ id: e.id, title: e.title, courseId: e.course_id })),
    };
  }

  /**
   * Clones an existing bank question (and its answer key) into a target examination.
   */
  static async importQuestionFromBank(
    targetExamId: string,
    sourceQuestionId: string
  ): Promise<{ question: QuestionWithOptionsView; totalPoints: number }> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    await requireOwnedExam(targetExamId, actor);

    const { data: srcRow, error: srcErr } = await supabaseAdmin
      .from('questions')
      .select('id, exam_id, prompt, points, category, difficulty, explanation')
      .eq('id', sourceQuestionId)
      .single();

    if (srcErr || !srcRow) {
      throw new Error('Source question not found in the question bank.');
    }

    const source = srcRow as {
      id: string;
      exam_id: string;
      prompt: string;
      points: number;
      category: string | null;
      difficulty: QuestionDifficulty;
      explanation: string | null;
    };

    // Ensure caller also owns the source exam/tenant so cross-tenant question import is impossible
    await requireOwnedExam(source.exam_id, actor);

    const { data: srcOpts } = await supabaseAdmin
      .from('question_answer_keys')
      .select('label, content, is_correct')
      .eq('question_id', source.id)
      .order('order_index', { ascending: true });

    const options = (srcOpts || []) as {
      label: 'A' | 'B' | 'C' | 'D';
      content: string;
      is_correct: boolean;
    }[];

    if (options.length !== 4) {
      throw new ExamValidationError('Selected question does not contain 4 valid MCQ options.');
    }

    return this.saveQuestion(targetExamId, {
      prompt: source.prompt,
      points: source.points,
      category: source.category || '',
      difficulty: source.difficulty || 'medium',
      explanation: source.explanation || '',
      orderIndex: 0,
      options: options.map((o) => ({
        label: o.label,
        content: o.content,
        isCorrect: Boolean(o.is_correct),
      })),
    });
  }

  /**
   * Step 3: Persists duration, maximum marks, passing marks, negative marking, and randomisation.
   */
  static async updateExamConfig(examId: string, input: ExamConfigInput): Promise<ExamEditorView> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const parsed = examConfigSchema.safeParse(input);
    if (!parsed.success) {
      throw new ExamValidationError('Invalid examination configuration.', fieldErrorsFrom(parsed.error));
    }

    const valid = parsed.data;
    if (!durationFitsWindow(valid.durationMinutes, exam.start_time, exam.end_time)) {
      const windowMinutes = Math.floor(
        (Date.parse(exam.end_time) - Date.parse(exam.start_time)) / 60_000
      );
      throw new ExamValidationError(
        `Duration (${valid.durationMinutes} min) exceeds the scheduled window (${windowMinutes} min).`,
        {
          durationMinutes: `Must be at most ${windowMinutes} minutes to fit between start and end times`,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from('exams')
      .update({
        duration_minutes: valid.durationMinutes,
        total_points: valid.totalPoints,
        passing_marks: valid.passingMarks,
        negative_marking: valid.negativeMarking,
        shuffle_questions: valid.shuffleQuestions,
        shuffle_options: valid.shuffleOptions,
      })
      .eq('id', exam.id);

    if (error) {
      throw new Error(`Failed to save exam configuration: ${error.message}`);
    }

    await logExamAudit(actor, 'SETTINGS_CHANGED', 'exam', exam.id, {
      step: 'configuration',
      durationMinutes: valid.durationMinutes,
      totalPoints: valid.totalPoints,
      passingMarks: valid.passingMarks,
      negativeMarking: valid.negativeMarking,
    });

    return this.getExamForEditor(exam.id);
  }

  /**
   * Step 4: Lists course-enrolled roster eligible for student assignment.
   */
  static async getCourseRoster(examId: string): Promise<{
    roster: RosterStudentView[];
    assignedStudentIds: string[];
  }> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const [{ data: enrRows }, { data: assignRows }] = await Promise.all([
      supabaseAdmin
        .from('enrollments')
        .select('student_id, enrolled_at')
        .eq('course_id', exam.course_id)
        .order('enrolled_at', { ascending: false }),
      supabaseAdmin
        .from('exam_assignments')
        .select('student_id')
        .eq('exam_id', exam.id),
    ]);

    const enrollments = (enrRows || []) as { student_id: string; enrolled_at: string }[];
    const studentIds = enrollments.map((e) => e.student_id);

    const { data: profiles } =
      studentIds.length > 0
        ? await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .in('id', studentIds)
        : { data: [] };

    const profileMap = new Map(
      ((profiles || []) as { id: string; email: string; full_name: string | null }[]).map((p) => [
        p.id,
        p,
      ])
    );

    return {
      roster: enrollments.map((enr) => {
        const prof = profileMap.get(enr.student_id);
        return {
          studentId: enr.student_id,
          studentName: prof?.full_name || 'Student',
          studentEmail: prof?.email || 'N/A',
          enrolledAt: enr.enrolled_at,
        };
      }),
      assignedStudentIds: ((assignRows || []) as { student_id: string }[]).map((a) => a.student_id),
    };
  }

  /**
   * Step 4: Replaces assigned students for an exam after validating tenant enrollment.
   */
  static async assignStudents(
    examId: string,
    studentIds: string[]
  ): Promise<ExamAssignmentResult> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const parsed = examAssignmentSchema.safeParse({ studentIds });
    if (!parsed.success) {
      throw new ExamValidationError('Invalid student assignment payload.', fieldErrorsFrom(parsed.error));
    }

    const uniqueIds = Array.from(new Set(parsed.data.studentIds));

    if (uniqueIds.length > 0) {
      const { data: validEnr } = await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('course_id', exam.course_id)
        .in('student_id', uniqueIds);

      const enrolledSet = new Set(
        ((validEnr || []) as { student_id: string }[]).map((e) => e.student_id)
      );

      if (uniqueIds.some((id) => !enrolledSet.has(id))) {
        throw new ExamValidationError(
          'Only students enrolled in this course can be assigned to the examination.',
          { studentIds: 'Contains non-enrolled student IDs' }
        );
      }
    }

    const { data: prevRows, error: prevErr } = await supabaseAdmin
      .from('exam_assignments')
      .select('student_id')
      .eq('exam_id', exam.id);
    if (prevErr) {
      throw new Error(`Failed to read existing assignments: ${prevErr.message}`);
    }
    const prevSet = new Set(((prevRows || []) as { student_id: string }[]).map((r) => r.student_id));

    if (uniqueIds.length === 0) {
      const { error: delAllErr } = await supabaseAdmin
        .from('exam_assignments')
        .delete()
        .eq('exam_id', exam.id);
      if (delAllErr) {
        throw new Error(`Failed to clear assignments: ${delAllErr.message}`);
      }
    } else {
      const { error: upsertErr } = await supabaseAdmin
        .from('exam_assignments')
        .upsert(
          uniqueIds.map((studentId) => ({
            exam_id: exam.id,
            student_id: studentId,
          })),
          { onConflict: 'exam_id,student_id' }
        );
      if (upsertErr) {
        throw new Error(`Failed to save student assignments: ${upsertErr.message}`);
      }

      const toRemove = Array.from(prevSet).filter((id) => !uniqueIds.includes(id));
      if (toRemove.length > 0) {
        const { error: delErr } = await supabaseAdmin
          .from('exam_assignments')
          .delete()
          .eq('exam_id', exam.id)
          .in('student_id', toRemove);
        if (delErr) {
          throw new Error(`Failed to remove deselected students: ${delErr.message}`);
        }
      }
    }

    const removedCount = Array.from(prevSet).filter((id) => !uniqueIds.includes(id)).length;

    return {
      assignedCount: uniqueIds.length,
      removedCount,
    };
  }

  /**
   * Step 5: Updates exam proctoring & telemetry settings inside `exams.settings`.
   */
  static async updateMonitoringSettings(
    examId: string,
    input: ExamMonitoringInput
  ): Promise<ExamEditorView> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    const parsed = examMonitoringSchema.safeParse(input);
    if (!parsed.success) {
      throw new ExamValidationError('Invalid monitoring settings.', fieldErrorsFrom(parsed.error));
    }

    const valid = parsed.data;
    const mergedSettings: ExamSettingsJson = {
      ...(exam.settings || {}),
      require_camera: valid.requireCamera,
      require_audio: valid.requireAudio,
      require_fullscreen: valid.requireFullscreen,
      max_violations_threshold: valid.maxViolationsThreshold,
    };

    const { error } = await supabaseAdmin
      .from('exams')
      .update({ settings: mergedSettings })
      .eq('id', exam.id);

    if (error) {
      throw new Error(`Failed to save monitoring settings: ${error.message}`);
    }

    await logExamAudit(actor, 'SETTINGS_CHANGED', 'exam', exam.id, {
      step: 'monitoring',
      ...valid,
    });

    return this.getExamForEditor(exam.id);
  }

  /**
   * Step 6: Server-computed publish readiness check summary.
   */
  static async getPublishPreview(examId: string): Promise<ExamPublishPreview> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam, course } = await requireOwnedExam(examId, actor);

    const [{ data: qPtsRows }, { count: assignCount }, { count: enrCount }] = await Promise.all([
      supabaseAdmin
        .from('questions')
        .select('points')
        .eq('exam_id', exam.id),
      supabaseAdmin
        .from('exam_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', exam.id),
      supabaseAdmin
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', exam.course_id),
    ]);

    const questionList = (qPtsRows || []) as { points: number }[];
    const questionCount = questionList.length;
    const questionPointsSum = questionList.reduce((acc, q) => acc + Number(q.points || 0), 0);
    const assignedStudentCount = assignCount || 0;
    const enrolledCount = enrCount || 0;

    return {
      examId: exam.id,
      title: exam.title,
      courseCode: course.code,
      status: exam.status,
      questionCount,
      totalPoints: exam.total_points,
      passingMarks: exam.passing_marks ?? 0,
      negativeMarking: Number(exam.negative_marking ?? 0),
      durationMinutes: exam.duration_minutes,
      startTime: exam.start_time,
      endTime: exam.end_time,
      shuffleQuestions: Boolean(exam.shuffle_questions),
      shuffleOptions: Boolean(exam.shuffle_options),
      monitoring: extractMonitoringSettings(exam.settings, actor.tenantSettings),
      assignedStudentCount,
      checks: buildPublishChecks(
        exam,
        questionCount,
        questionPointsSum,
        assignedStudentCount,
        enrolledCount
      ),
    };
  }

  /**
   * Step 6: Validates readiness and transitions a draft exam to published.
   */
  static async publishExam(examId: string): Promise<ExamEditorView> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const preview = await this.getPublishPreview(examId);

    const errors = preview.checks.filter((c) => c.level === 'error');
    const firstError = errors[0];
    if (firstError) {
      const errMap: Record<string, string> = {};
      for (const e of errors) errMap[e.field] = e.message;
      throw new ExamValidationError(firstError.message, errMap);
    }

    const { error } = await supabaseAdmin
      .from('exams')
      .update({ status: 'published' })
      .eq('id', examId);

    if (error) {
      throw new Error(`Failed to publish examination: ${error.message}`);
    }

    await logExamAudit(actor, 'EXAM_PUBLISHED', 'exam', examId, {
      title: preview.title,
      questionCount: preview.questionCount,
      totalPoints: preview.totalPoints,
    });

    return this.getExamForEditor(examId);
  }

  /**
   * Lifecycle status management (draft <-> published -> active -> completed -> archived).
   */
  static async updateExamStatus(examId: string, nextStatus: ExamStatus): Promise<ExamEditorView> {
    const ALLOWED_STATUSES: ExamStatus[] = ['draft', 'published', 'active', 'completed', 'archived'];
    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      throw new ExamValidationError(`Invalid examination status: ${String(nextStatus)}`);
    }

    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    if (
      (exam.status === 'completed' || exam.status === 'archived') &&
      (nextStatus === 'draft' || nextStatus === 'active' || nextStatus === 'published')
    ) {
      throw new ExamValidationError(
        `Cannot revert a ${exam.status} examination back to ${nextStatus}.`
      );
    }

    if (nextStatus === 'published' && exam.status !== 'published') {
      return this.publishExam(examId);
    }

    if (nextStatus === 'active' && exam.status !== 'active') {
      const preview = await this.getPublishPreview(examId);
      const errors = preview.checks.filter((c) => c.level === 'error');
      const firstError = errors[0];
      if (firstError) {
        throw new ExamValidationError(firstError.message);
      }
    }

    const { error } = await supabaseAdmin
      .from('exams')
      .update({ status: nextStatus })
      .eq('id', exam.id);

    if (error) {
      throw new Error(`Failed to update examination status: ${error.message}`);
    }

    await logExamAudit(actor, 'SETTINGS_CHANGED', 'exam', exam.id, {
      previousStatus: exam.status,
      status: nextStatus,
    });

    return this.getExamForEditor(exam.id);
  }

  /**
   * Permanently deletes a draft examination owned by the faculty member.
   */
  static async deleteDraftExam(examId: string): Promise<void> {
    const actor = await requireRoleActor(['instructor', 'admin']);
    const { exam } = await requireOwnedExam(examId, actor);

    if (exam.status !== 'draft') {
      throw new ExamValidationError(
        'Only draft examinations can be deleted. Archive active or completed examinations instead.'
      );
    }

    const { error } = await supabaseAdmin.from('exams').delete().eq('id', exam.id);
    if (error) {
      throw new Error(`Failed to delete draft examination: ${error.message}`);
    }
  }

  /**
   * Student-safe delivery payload: queries `question_options_student_view` and
   * NEVER exposes `is_correct` or `explanation` to candidate clients.
   */
  static async getStudentExamPaper(examId: string): Promise<StudentExamPaper> {
    const actor = await requireRoleActor(['student']);

    const { data: examRow, error: examErr } = await supabaseAdmin
      .from('exams')
      .select(
        'id, course_id, tenant_id, title, description, instructions, duration_minutes, start_time, end_time, status, total_points, passing_marks, negative_marking, shuffle_questions, shuffle_options, settings'
      )
      .eq('id', examId)
      .eq('tenant_id', actor.tenantId)
      .single();

    if (examErr || !examRow) {
      throw new Error('Examination not found.');
    }

    const exam = examRow as OwnedExamContext['exam'];
    if (exam.status !== 'published' && exam.status !== 'active') {
      throw new Error('Forbidden: Examination is not currently open to candidates.');
    }

    const nowMs = Date.now();
    const startMs = Date.parse(exam.start_time);
    const endMs = Date.parse(exam.end_time);
    if (exam.status === 'published' && nowMs < startMs) {
      throw new Error('Forbidden: Examination has not started yet.');
    }
    if (nowMs > endMs) {
      throw new Error('Forbidden: Examination window has ended.');
    }

    const [
      { data: courseRow },
      { data: enrollment, error: enrErr },
      { data: assignmentRows, error: assignErr },
    ] = await Promise.all([
      supabaseAdmin.from('courses').select('code, name').eq('id', exam.course_id).single(),
      supabaseAdmin
        .from('enrollments')
        .select('course_id')
        .eq('course_id', exam.course_id)
        .eq('student_id', actor.userId)
        .maybeSingle(),
      supabaseAdmin.from('exam_assignments').select('student_id').eq('exam_id', exam.id),
    ]);

    if (enrErr || assignErr) {
      throw new Error('Unable to verify course enrollment or examination assignment.');
    }

    if (!enrollment) {
      throw new Error('Forbidden: You are not enrolled in the course for this examination.');
    }

    const assignedSet = new Set(
      ((assignmentRows || []) as { student_id: string }[]).map((a) => a.student_id)
    );
    if (assignedSet.size > 0 && !assignedSet.has(actor.userId)) {
      throw new Error('Forbidden: You are not included in the candidate roster for this exam.');
    }

    const { data: qRows, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, order_index, type, prompt, points, category, difficulty')
      .eq('exam_id', exam.id)
      .order('order_index', { ascending: true });

    if (qErr) {
      throw new Error(`Failed to fetch examination questions: ${qErr.message}`);
    }

    const questions = (qRows || []) as {
      id: string;
      order_index: number;
      type: QuestionType;
      prompt: string;
      points: number;
      category: string | null;
      difficulty: QuestionDifficulty;
    }[];

    const qIds = questions.map((q) => q.id);
    // Explicitly query ONLY the student-safe view (no is_correct column exists on it)
    const { data: optRows, error: optErr } =
      qIds.length > 0
        ? await supabaseAdmin
            .from('question_options_student_view')
            .select('id, question_id, label, content, order_index')
            .in('question_id', qIds)
            .order('order_index', { ascending: true })
        : { data: [], error: null };

    if (optErr) {
      throw new Error(`Failed to fetch question options: ${optErr.message}`);
    }

    const optionsByQuestion = new Map<string, StudentOptionView[]>();
    for (const opt of (optRows || []) as {
      id: string;
      question_id: string;
      label: string;
      content: string;
      order_index: number;
    }[]) {
      const list = optionsByQuestion.get(opt.question_id) || [];
      list.push({
        id: opt.id,
        label: opt.label,
        content: opt.content,
        orderIndex: opt.order_index,
      });
      optionsByQuestion.set(opt.question_id, list);
    }

    let studentQuestions: StudentQuestionView[] = questions.map((q) => {
      const rawOpts = optionsByQuestion.get(q.id) || [];
      const opts = exam.shuffle_options
        ? deterministicShuffle(rawOpts, `${actor.userId}:${q.id}`)
        : rawOpts;
      return {
        id: q.id,
        orderIndex: q.order_index,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        category: q.category ?? null,
        difficulty: q.difficulty || 'medium',
        options: opts,
      };
    });

    if (exam.shuffle_questions) {
      studentQuestions = deterministicShuffle(studentQuestions, `${actor.userId}:${exam.id}`);
    }

    const course = (courseRow || { code: 'COURSE', name: 'Course' }) as {
      code: string;
      name: string;
    };

    return {
      examId: exam.id,
      title: exam.title,
      courseCode: course.code,
      courseName: course.name,
      description: exam.description,
      instructions: exam.instructions,
      durationMinutes: exam.duration_minutes,
      startTime: exam.start_time,
      endTime: exam.end_time,
      totalPoints: exam.total_points,
      passingMarks: exam.passing_marks ?? 0,
      negativeMarking: Number(exam.negative_marking ?? 0),
      shuffleQuestions: Boolean(exam.shuffle_questions),
      shuffleOptions: Boolean(exam.shuffle_options),
      settings: (exam.settings || {}) as ExamSettingsJson,
      questions: studentQuestions,
    };
  }
}
