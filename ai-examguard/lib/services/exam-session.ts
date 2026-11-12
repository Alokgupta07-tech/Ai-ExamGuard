import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRoleActor, type VerifiedActor } from '@/lib/services/dashboard';
import { ExamEngineService } from '@/lib/services/exam-engine';
import {
  batchSaveAnswersSchema,
  saveAnswerSchema,
  startSessionSchema,
  submitExamSchema,
  updateSessionProgressSchema,
} from '@/lib/validators/exam-session';
import type { ExamStatus, SessionStatus } from '@/types/database';
import type { ExamSettingsJson } from '@/types/exam-engine';
import type {
  ActiveExamSessionState,
  BatchSaveAnswersResult,
  ExamEligibilityReason,
  ExamPreflightPayload,
  ExamSessionHardwareState,
  ExamSubmissionReceipt,
  SaveAnswerResult,
  SavedAnswerEntry,
  StudentExamSessionBootstrap,
} from '@/types/exam-session';

const uuidSchema = z.string().uuid();

const TERMINAL_SESSION_STATUSES: SessionStatus[] = [
  'submitted',
  'graded',
  'under_review',
  'terminated',
];

/** Small clock/network slack for in-flight autosave packets around timeout. */
const AUTOSAVE_GRACE_MS = 5_000;
/** Grace window on final submit to accept buffered offline answers after timeout. */
const SUBMIT_OFFLINE_FLUSH_GRACE_MS = 120_000;

export class ExamSessionError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = 'EXAM_SESSION_ERROR') {
    super(message);
    this.name = 'ExamSessionError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface RawExamRow {
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
}

interface RawSessionRow {
  id: string;
  exam_id: string;
  student_id: string;
  tenant_id: string;
  status: SessionStatus;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  trust_score: number;
  hardware_status: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface RawAnswerRow {
  question_id: string;
  selected_option_id: string | null;
  selected_option_ids: string[] | null;
  response_text: string | null;
  updated_at: string;
}

function assertValidExamId(examId: string): void {
  if (!uuidSchema.safeParse(examId).success) {
    throw new ExamSessionError('Examination not found.', 404, 'EXAM_NOT_FOUND');
  }
}

function computeExpiresAtIso(
  startedAtIso: string,
  durationMinutes: number,
  examEndTimeIso: string
): string {
  const startedMs = Date.parse(startedAtIso);
  const durationEndMs = startedMs + durationMinutes * 60_000;
  const windowEndMs = Date.parse(examEndTimeIso);
  return new Date(Math.min(durationEndMs, windowEndMs)).toISOString();
}

function buildReceiptCode(sessionId: string): string {
  return `EXG-${sessionId.slice(0, 8).toUpperCase()}`;
}

function parseHardwareState(raw: Record<string, unknown> | null | undefined): ExamSessionHardwareState {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const flagged = Array.isArray(raw.flaggedQuestionIds)
    ? raw.flaggedQuestionIds.filter((v): v is string => typeof v === 'string')
    : [];
  return {
    ...raw,
    camera: typeof raw.camera === 'boolean' ? raw.camera : undefined,
    microphone: typeof raw.microphone === 'boolean' ? raw.microphone : undefined,
    fullscreen: typeof raw.fullscreen === 'boolean' ? raw.fullscreen : undefined,
    flaggedQuestionIds: flagged,
    currentQuestionId: typeof raw.currentQuestionId === 'string' ? raw.currentQuestionId : null,
    receiptCode: typeof raw.receiptCode === 'string' ? raw.receiptCode : undefined,
    autoSubmitted: typeof raw.autoSubmitted === 'boolean' ? raw.autoSubmitted : undefined,
    answeredCount: typeof raw.answeredCount === 'number' ? raw.answeredCount : undefined,
    totalQuestions: typeof raw.totalQuestions === 'number' ? raw.totalQuestions : undefined,
  };
}

function mapSavedAnswers(rows: RawAnswerRow[]): SavedAnswerEntry[] {
  return rows.map((row) => ({
    questionId: row.question_id,
    selectedOptionId: row.selected_option_id,
    selectedOptionIds: Array.isArray(row.selected_option_ids) ? row.selected_option_ids : [],
    responseText: row.response_text,
    updatedAt: row.updated_at,
  }));
}

async function loadExamContext(examId: string, actor: VerifiedActor) {
  assertValidExamId(examId);

  const { data: examRow, error: examErr } = await supabaseAdmin
    .from('exams')
    .select(
      'id, course_id, tenant_id, title, description, instructions, duration_minutes, start_time, end_time, status, total_points, passing_marks, negative_marking, shuffle_questions, shuffle_options, settings'
    )
    .eq('id', examId)
    .eq('tenant_id', actor.tenantId)
    .maybeSingle();

  if (examErr || !examRow) {
    throw new ExamSessionError('Examination not found.', 404, 'EXAM_NOT_FOUND');
  }

  const exam = examRow as RawExamRow;

  const [
    { data: courseRow },
    { data: enrollment, error: enrErr },
    { data: assignmentRows, error: assignErr },
    { count: questionCount, error: qCountErr },
    { data: existingSessionRow, error: sessErr },
  ] = await Promise.all([
    supabaseAdmin.from('courses').select('code, name').eq('id', exam.course_id).maybeSingle(),
    supabaseAdmin
      .from('enrollments')
      .select('course_id')
      .eq('course_id', exam.course_id)
      .eq('student_id', actor.userId)
      .maybeSingle(),
    supabaseAdmin.from('exam_assignments').select('student_id').eq('exam_id', exam.id),
    supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', exam.id),
    supabaseAdmin
      .from('exam_sessions')
      .select(
        'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at, updated_at'
      )
      .eq('exam_id', exam.id)
      .eq('student_id', actor.userId)
      .maybeSingle(),
  ]);

  if (enrErr || assignErr || qCountErr || sessErr) {
    throw new ExamSessionError(
      'Unable to verify examination eligibility right now.',
      500,
      'ELIGIBILITY_CHECK_FAILED'
    );
  }

  const course = (courseRow || { code: 'COURSE', name: 'Course' }) as {
    code: string;
    name: string;
  };
  const assignedIds = new Set(
    ((assignmentRows || []) as { student_id: string }[]).map((r) => r.student_id)
  );
  const isEnrolled = Boolean(enrollment);
  const isAssigned = assignedIds.size === 0 || assignedIds.has(actor.userId);
  const session = (existingSessionRow as RawSessionRow | null) ?? null;

  return {
    exam,
    course,
    isEnrolled,
    isAssigned,
    questionCount: questionCount || 0,
    session,
  };
}

function evaluateEligibility(params: {
  exam: RawExamRow;
  isEnrolled: boolean;
  isAssigned: boolean;
  questionCount: number;
  session: RawSessionRow | null;
  nowMs: number;
}): { eligible: boolean; reason: ExamEligibilityReason; reasonMessage: string } {
  const { exam, isEnrolled, isAssigned, questionCount, session, nowMs } = params;

  if (!isEnrolled) {
    return {
      eligible: false,
      reason: 'not_enrolled',
      reasonMessage: 'You are not enrolled in the course for this examination.',
    };
  }

  if (!isAssigned) {
    return {
      eligible: false,
      reason: 'not_assigned',
      reasonMessage: 'Your account is not included in the candidate roster for this examination.',
    };
  }

  if (session && TERMINAL_SESSION_STATUSES.includes(session.status)) {
    return {
      eligible: false,
      reason: 'already_submitted',
      reasonMessage: 'Your examination attempt has already been submitted and recorded.',
    };
  }

  if (exam.status !== 'published' && exam.status !== 'active') {
    return {
      eligible: false,
      reason: 'exam_closed',
      reasonMessage: 'This examination is not currently open to candidates.',
    };
  }

  if (questionCount <= 0) {
    return {
      eligible: false,
      reason: 'no_questions',
      reasonMessage: 'This examination has no published questions yet.',
    };
  }

  const startMs = Date.parse(exam.start_time);
  const endMs = Date.parse(exam.end_time);

  if (exam.status === 'published' && nowMs < startMs) {
    return {
      eligible: false,
      reason: 'not_started_window',
      reasonMessage: 'This examination window has not opened yet.',
    };
  }

  if (nowMs > endMs && !session) {
    return {
      eligible: false,
      reason: 'window_ended',
      reasonMessage: 'The scheduled window for this examination has ended.',
    };
  }

  return {
    eligible: true,
    reason: 'eligible',
    reasonMessage:
      session?.status === 'in_progress'
        ? 'Your active session is ready to resume.'
        : 'All eligibility checks passed.',
  };
}

async function buildReceiptFromSession(params: {
  session: RawSessionRow;
  exam: RawExamRow;
  course: { code: string; name: string };
  totalQuestions: number;
  alreadySubmitted: boolean;
}): Promise<ExamSubmissionReceipt> {
  const { session, exam, course, totalQuestions, alreadySubmitted } = params;
  const hw = parseHardwareState(session.hardware_status);

  let answeredCount = hw.answeredCount;
  if (typeof answeredCount !== 'number') {
    const { count } = await supabaseAdmin
      .from('session_answers')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id);
    answeredCount = count || 0;
  }

  return {
    sessionId: session.id,
    receiptCode: hw.receiptCode || buildReceiptCode(session.id),
    examId: exam.id,
    examTitle: exam.title,
    courseCode: course.code,
    courseName: course.name,
    status: session.status,
    startedAt: session.started_at,
    submittedAt: session.submitted_at || session.updated_at,
    answeredCount,
    totalQuestions,
    autoSubmitted: Boolean(hw.autoSubmitted),
    alreadySubmitted,
  };
}

async function finalizeAndGradeSession(params: {
  actor: VerifiedActor;
  exam: RawExamRow;
  course: { code: string; name: string };
  session: RawSessionRow;
  autoSubmitted: boolean;
  flaggedQuestionIds?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<ExamSubmissionReceipt> {
  const { actor, exam, course, session, autoSubmitted, flaggedQuestionIds, ipAddress, userAgent } =
    params;

  // Fetch all questions for this exam + answer keys (strictly server-side)
  const { data: qRows, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, points')
    .eq('exam_id', exam.id);

  if (qErr) {
    throw new ExamSessionError(`Failed to grade examination: ${qErr.message}`, 500, 'GRADING_ERROR');
  }

  const questions = (qRows || []) as { id: string; points: number }[];
  const qIds = questions.map((q) => q.id);
  const qIdSet = new Set(qIds);

  const [{ data: keyRows, error: kErr }, { data: answerRows, error: aErr }] = await Promise.all([
    qIds.length > 0
      ? supabaseAdmin
          .from('question_answer_keys')
          .select('id, question_id, is_correct')
          .in('question_id', qIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from('session_answers')
      .select('id, question_id, selected_option_id, response_text')
      .eq('session_id', session.id),
  ]);

  if (kErr || aErr) {
    throw new ExamSessionError('Failed to reconcile candidate answers for grading.', 500, 'GRADING_ERROR');
  }

  const correctOptionByQuestion = new Map<string, Set<string>>();
  for (const k of (keyRows || []) as { id: string; question_id: string; is_correct: boolean }[]) {
    if (k.is_correct) {
      const set = correctOptionByQuestion.get(k.question_id) || new Set<string>();
      set.add(k.id);
      correctOptionByQuestion.set(k.question_id, set);
    }
  }

  const answerByQuestion = new Map<
    string,
    { id: string; question_id: string; selected_option_id: string | null; response_text: string | null }
  >();
  for (const ans of (answerRows || []) as {
    id: string;
    question_id: string;
    selected_option_id: string | null;
    response_text: string | null;
  }[]) {
    if (qIdSet.has(ans.question_id)) {
      answerByQuestion.set(ans.question_id, ans);
    }
  }

  const negFraction = Number(exam.negative_marking ?? 0);
  let maxPoints = 0;
  let rawEarned = 0;
  let penalty = 0;
  let answeredCount = 0;

  let hasMcqScoring = false;

  for (const q of questions) {
    maxPoints += q.points;
    const ans = answerByQuestion.get(q.id);
    if (!ans) {
      continue;
    }
    const hasOption = Boolean(ans.selected_option_id);
    const hasText = Boolean(ans.response_text && ans.response_text.trim().length > 0);
    if (!hasOption && !hasText) {
      continue;
    }
    answeredCount += 1;

    if (hasOption && ans.selected_option_id) {
      hasMcqScoring = true;
      const correctSet = correctOptionByQuestion.get(q.id);
      const isCorrect = Boolean(correctSet?.has(ans.selected_option_id));
      const pointsAwarded = isCorrect ? q.points : 0;

      if (isCorrect) {
        rawEarned += q.points;
      } else if (negFraction > 0) {
        penalty += q.points * negFraction;
      }

      await supabaseAdmin
        .from('session_answers')
        .update({
          is_correct: isCorrect,
          points_awarded: pointsAwarded,
        })
        .eq('id', ans.id);
    } else {
      // Descriptive question - points will be awarded during faculty evaluation
      await supabaseAdmin
        .from('session_answers')
        .update({
          is_correct: null,
          points_awarded: null,
        })
        .eq('id', ans.id);
    }
  }

  const netPoints = Math.max(0, rawEarned - penalty);
  const percentScore = hasMcqScoring && maxPoints > 0
    ? Math.min(100, Math.max(0, Number(((netPoints / maxPoints) * 100).toFixed(2))))
    : null;

  const startedAtMs = session.started_at ? Date.parse(session.started_at) : Date.now();
  const submittedAtIso = new Date(Math.max(Date.now(), startedAtMs)).toISOString();
  const receiptCode = buildReceiptCode(session.id);

  const prevHw = parseHardwareState(session.hardware_status);
  const nextHw: ExamSessionHardwareState = {
    ...prevHw,
    flaggedQuestionIds: flaggedQuestionIds
      ? flaggedQuestionIds.filter((id) => qIdSet.has(id))
      : prevHw.flaggedQuestionIds || [],
    receiptCode,
    autoSubmitted,
    answeredCount,
    totalQuestions: questions.length,
  };

  // Atomic duplicate-submission prevention: only transitions an `in_progress` row once.
  const { data: updatedRow, error: updErr } = await supabaseAdmin
    .from('exam_sessions')
    .update({
      status: 'submitted',
      submitted_at: submittedAtIso,
      score: percentScore,
      hardware_status: nextHw,
    })
    .eq('id', session.id)
    .eq('student_id', actor.userId)
    .eq('status', 'in_progress')
    .select(
      'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at, updated_at'
    )
    .maybeSingle();

  if (updErr) {
    throw new ExamSessionError(`Failed to finalize examination submission: ${updErr.message}`, 500, 'SUBMIT_FAILED');
  }

  if (!updatedRow) {
    // Lost a concurrent double-submit race — reload winning row idempotently.
    const { data: winner } = await supabaseAdmin
      .from('exam_sessions')
      .select(
        'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at, updated_at'
      )
      .eq('id', session.id)
      .eq('student_id', actor.userId)
      .single();

    return buildReceiptFromSession({
      session: winner as RawSessionRow,
      exam,
      course,
      totalQuestions: questions.length,
      alreadySubmitted: true,
    });
  }

  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: actor.tenantId,
    user_id: actor.userId,
    action: 'SESSION_SUBMITTED',
    entity_type: 'exam_session',
    entity_id: session.id,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    details: {
      examId: exam.id,
      receiptCode,
      answeredCount,
      totalQuestions: questions.length,
      autoSubmitted,
      scorePercent: percentScore,
    },
  });

  return buildReceiptFromSession({
    session: updatedRow as RawSessionRow,
    exam,
    course,
    totalQuestions: questions.length,
    alreadySubmitted: false,
  });
}

function buildActiveSessionView(session: RawSessionRow, exam: RawExamRow): ActiveExamSessionState {
  const startedAt = session.started_at || session.created_at;
  const expiresAt = computeExpiresAtIso(startedAt, exam.duration_minutes, exam.end_time);
  const hw = parseHardwareState(session.hardware_status);

  return {
    id: session.id,
    examId: session.exam_id,
    status: session.status,
    startedAt,
    expiresAt,
    submittedAt: session.submitted_at,
    trustScore: Number(session.trust_score ?? 100),
    hardwareStatus: hw,
    flaggedQuestionIds: hw.flaggedQuestionIds || [],
    currentQuestionId: hw.currentQuestionId || null,
  };
}

export class ExamSessionService {
  /**
   * Preflight eligibility & exam metadata (does NOT return questions or answer keys).
   */
  static async getExamPreflight(examId: string): Promise<ExamPreflightPayload> {
    const actor = await requireRoleActor(['student']);
    const ctx = await loadExamContext(examId, actor);
    const nowMs = Date.now();

    let currentSession = ctx.session;
    let receipt: ExamSubmissionReceipt | null = null;

    // If an in-progress session already exceeded its server deadline, finalize it now.
    if (currentSession && currentSession.status === 'in_progress' && currentSession.started_at) {
      const expiresAtIso = computeExpiresAtIso(
        currentSession.started_at,
        ctx.exam.duration_minutes,
        ctx.exam.end_time
      );
      if (nowMs > Date.parse(expiresAtIso) + AUTOSAVE_GRACE_MS) {
        receipt = await finalizeAndGradeSession({
          actor,
          exam: ctx.exam,
          course: ctx.course,
          session: currentSession,
          autoSubmitted: true,
        });
        currentSession = {
          ...currentSession,
          status: receipt.status,
          submitted_at: receipt.submittedAt,
        };
      }
    } else if (currentSession && TERMINAL_SESSION_STATUSES.includes(currentSession.status)) {
      receipt = await buildReceiptFromSession({
        session: currentSession,
        exam: ctx.exam,
        course: ctx.course,
        totalQuestions: ctx.questionCount,
        alreadySubmitted: true,
      });
    }

    const eligibility = evaluateEligibility({
      exam: ctx.exam,
      isEnrolled: ctx.isEnrolled,
      isAssigned: ctx.isAssigned,
      questionCount: ctx.questionCount,
      session: currentSession,
      nowMs,
    });

    const expiresAt =
      currentSession?.started_at
        ? computeExpiresAtIso(
            currentSession.started_at,
            ctx.exam.duration_minutes,
            ctx.exam.end_time
          )
        : null;

    return {
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      reasonMessage: eligibility.reasonMessage,
      serverNow: new Date(nowMs).toISOString(),
      exam: {
        id: ctx.exam.id,
        title: ctx.exam.title,
        courseCode: ctx.course.code,
        courseName: ctx.course.name,
        description: ctx.exam.description,
        instructions: ctx.exam.instructions,
        durationMinutes: ctx.exam.duration_minutes,
        startTime: ctx.exam.start_time,
        endTime: ctx.exam.end_time,
        totalPoints: ctx.exam.total_points,
        passingMarks: ctx.exam.passing_marks ?? 0,
        negativeMarking: Number(ctx.exam.negative_marking ?? 0),
        shuffleQuestions: Boolean(ctx.exam.shuffle_questions),
        shuffleOptions: Boolean(ctx.exam.shuffle_options),
        questionCount: ctx.questionCount,
        settings: (ctx.exam.settings || {}) as ExamSettingsJson,
      },
      existingSession: currentSession
        ? {
            id: currentSession.id,
            status: currentSession.status,
            startedAt: currentSession.started_at,
            expiresAt,
            submittedAt: currentSession.submitted_at,
          }
        : null,
      receipt,
    };
  }

  /**
   * Starts or resumes an authorized student exam session, restoring all saved answers
   * and server-controlled start/end timestamps without ever exposing answer keys.
   */
  static async startOrResumeSession(
    examId: string,
    rawInput?: unknown,
    meta?: { ipAddress?: string | null; userAgent?: string | null; createIfMissing?: boolean }
  ): Promise<StudentExamSessionBootstrap> {
    const actor = await requireRoleActor(['student']);
    const ctx = await loadExamContext(examId, actor);
    const parsed = startSessionSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      throw new ExamSessionError('Invalid session start payload.', 400, 'INVALID_PAYLOAD');
    }

    const nowMs = Date.now();
    let session = ctx.session;

    // 1. Existing submitted/terminal session -> idempotently return receipt
    if (session && TERMINAL_SESSION_STATUSES.includes(session.status)) {
      const receipt = await buildReceiptFromSession({
        session,
        exam: ctx.exam,
        course: ctx.course,
        totalQuestions: ctx.questionCount,
        alreadySubmitted: true,
      });
      return {
        alreadySubmitted: true,
        serverNow: new Date(nowMs).toISOString(),
        paper: null,
        session: null,
        answers: [],
        receipt,
      };
    }

    // 2. Existing active session expired while closed -> auto-finalize and return receipt
    if (session && session.status === 'in_progress' && session.started_at) {
      const expiresAtIso = computeExpiresAtIso(
        session.started_at,
        ctx.exam.duration_minutes,
        ctx.exam.end_time
      );
      if (nowMs > Date.parse(expiresAtIso) + AUTOSAVE_GRACE_MS) {
        const receipt = await finalizeAndGradeSession({
          actor,
          exam: ctx.exam,
          course: ctx.course,
          session,
          autoSubmitted: true,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        return {
          alreadySubmitted: true,
          serverNow: new Date(nowMs).toISOString(),
          paper: null,
          session: null,
          answers: [],
          receipt,
        };
      }
    }

    // 3. Enforce eligibility before starting/resuming
    const eligibility = evaluateEligibility({
      exam: ctx.exam,
      isEnrolled: ctx.isEnrolled,
      isAssigned: ctx.isAssigned,
      questionCount: ctx.questionCount,
      session,
      nowMs,
    });

    if (!eligibility.eligible) {
      throw new ExamSessionError(eligibility.reasonMessage, 403, eligibility.reason.toUpperCase());
    }

    const incomingHw = parsed.data.hardwareStatus;

    // 4. Create new session if none exists (or transition `not_started` -> `in_progress`)
    if (!session) {
      if (meta?.createIfMissing === false) {
        throw new ExamSessionError(
          'Examination session has not been started yet.',
          404,
          'SESSION_NOT_STARTED'
        );
      }

      const startedAtIso = new Date(nowMs).toISOString();
      const initialHw: ExamSessionHardwareState = {
        camera: incomingHw?.camera ?? false,
        microphone: incomingHw?.microphone ?? false,
        fullscreen: incomingHw?.fullscreen ?? false,
        flaggedQuestionIds: [],
        currentQuestionId: null,
      };

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('exam_sessions')
        .insert({
          exam_id: ctx.exam.id,
          student_id: actor.userId,
          tenant_id: actor.tenantId,
          status: 'in_progress',
          started_at: startedAtIso,
          hardware_status: initialHw,
          ip_address: meta?.ipAddress ?? null,
          user_agent: meta?.userAgent ?? null,
        })
        .select(
          'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at, updated_at'
        )
        .single();

      if (insErr) {
        // Concurrent double-start race (`23505` unique violation) -> reload existing row
        if (insErr.code === '23505') {
          const { data: raced } = await supabaseAdmin
            .from('exam_sessions')
            .select(
              'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at, updated_at'
            )
            .eq('exam_id', ctx.exam.id)
            .eq('student_id', actor.userId)
            .single();
          if (!raced) {
            throw new ExamSessionError('Unable to initialize examination session.', 500);
          }
          session = raced as RawSessionRow;
        } else {
          throw new ExamSessionError(
            `Failed to start examination session: ${insErr.message}`,
            500,
            'SESSION_START_FAILED'
          );
        }
      } else {
        session = inserted as RawSessionRow;

        await supabaseAdmin.from('audit_logs').insert({
          tenant_id: actor.tenantId,
          user_id: actor.userId,
          action: 'SESSION_STARTED',
          entity_type: 'exam_session',
          entity_id: session.id,
          ip_address: meta?.ipAddress ?? null,
          user_agent: meta?.userAgent ?? null,
          details: {
            examId: ctx.exam.id,
            examTitle: ctx.exam.title,
            startedAt: startedAtIso,
          },
        });
      }
    } else if (session.status === 'not_started' || !session.started_at) {
      const startedAtIso = session.started_at || new Date(nowMs).toISOString();
      const prevHw = parseHardwareState(session.hardware_status);
      const mergedHw: ExamSessionHardwareState = {
        ...prevHw,
        ...(incomingHw || {}),
      };
      const { data: activated, error: actErr } = await supabaseAdmin
        .from('exam_sessions')
        .update({
          status: 'in_progress',
          started_at: startedAtIso,
          hardware_status: mergedHw,
        })
        .eq('id', session.id)
        .eq('student_id', actor.userId)
        .select(
          'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at, updated_at'
        )
        .single();

      if (actErr || !activated) {
        throw new ExamSessionError('Failed to resume examination session.', 500);
      }
      session = activated as RawSessionRow;
    } else if (incomingHw) {
      // Refresh hardware snapshot on resume
      const prevHw = parseHardwareState(session.hardware_status);
      const mergedHw: ExamSessionHardwareState = {
        ...prevHw,
        ...(typeof incomingHw.camera === 'boolean' ? { camera: incomingHw.camera } : {}),
        ...(typeof incomingHw.microphone === 'boolean' ? { microphone: incomingHw.microphone } : {}),
        ...(typeof incomingHw.fullscreen === 'boolean' ? { fullscreen: incomingHw.fullscreen } : {}),
      };
      await supabaseAdmin
        .from('exam_sessions')
        .update({ hardware_status: mergedHw })
        .eq('id', session.id)
        .eq('student_id', actor.userId);
      session.hardware_status = mergedHw;
    }

    // 5. Fetch student-safe paper + saved answers in parallel
    const [paper, answersRes] = await Promise.all([
      ExamEngineService.getStudentExamPaper(ctx.exam.id),
      supabaseAdmin
        .from('session_answers')
        .select('question_id, selected_option_id, selected_option_ids, response_text, updated_at')
        .eq('session_id', session.id),
    ]);

    if (answersRes.error) {
      throw new ExamSessionError('Failed to restore saved answers.', 500, 'ANSWER_RESTORE_FAILED');
    }

    return {
      alreadySubmitted: false,
      serverNow: new Date().toISOString(),
      paper,
      session: buildActiveSessionView(session, ctx.exam),
      answers: mapSavedAnswers((answersRes.data || []) as RawAnswerRow[]),
      receipt: null,
    };
  }

  /**
   * Updates non-answer session progress (`flaggedQuestionIds`, `currentQuestionId`, `hardwareStatus`).
   */
  static async updateSessionProgress(examId: string, rawInput: unknown): Promise<void> {
    const actor = await requireRoleActor(['student']);
    const ctx = await loadExamContext(examId, actor);

    const parsed = updateSessionProgressSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ExamSessionError('Invalid session progress update.', 400, 'INVALID_PAYLOAD');
    }

    if (!ctx.session || ctx.session.status !== 'in_progress') {
      throw new ExamSessionError('No active examination session found.', 409, 'SESSION_NOT_ACTIVE');
    }

    const { data: qRows } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('exam_id', ctx.exam.id);
    const validQuestionIds = new Set(((qRows || []) as { id: string }[]).map((q) => q.id));

    const prevHw = parseHardwareState(ctx.session.hardware_status);
    const nextHw: ExamSessionHardwareState = {
      ...prevHw,
    };

    if (parsed.data.flaggedQuestionIds !== undefined) {
      nextHw.flaggedQuestionIds = Array.from(
        new Set(parsed.data.flaggedQuestionIds.filter((id) => validQuestionIds.has(id)))
      );
    }

    if (parsed.data.currentQuestionId !== undefined) {
      nextHw.currentQuestionId =
        parsed.data.currentQuestionId && validQuestionIds.has(parsed.data.currentQuestionId)
          ? parsed.data.currentQuestionId
          : null;
    }

    if (parsed.data.hardwareStatus) {
      if (typeof parsed.data.hardwareStatus.camera === 'boolean') {
        nextHw.camera = parsed.data.hardwareStatus.camera;
      }
      if (typeof parsed.data.hardwareStatus.microphone === 'boolean') {
        nextHw.microphone = parsed.data.hardwareStatus.microphone;
      }
      if (typeof parsed.data.hardwareStatus.fullscreen === 'boolean') {
        nextHw.fullscreen = parsed.data.hardwareStatus.fullscreen;
      }
    }

    const { error } = await supabaseAdmin
      .from('exam_sessions')
      .update({ hardware_status: nextHw })
      .eq('id', ctx.session.id)
      .eq('student_id', actor.userId)
      .eq('status', 'in_progress');

    if (error) {
      throw new ExamSessionError(`Failed to update session progress: ${error.message}`, 500);
    }
  }

  /**
   * Idempotently saves or clears a candidate's MCQ answer (or a recovery batch).
   * Validates session ownership, active timer window, question membership, and option membership.
   */
  static async saveAnswers(
    examId: string,
    rawInput: unknown,
    options?: { allowSubmitGrace?: boolean }
  ): Promise<SaveAnswerResult | BatchSaveAnswersResult> {
    const actor = await requireRoleActor(['student']);
    const ctx = await loadExamContext(examId, actor);

    if (!ctx.session) {
      throw new ExamSessionError('Examination session has not started.', 404, 'SESSION_NOT_FOUND');
    }

    if (ctx.session.status !== 'in_progress') {
      throw new ExamSessionError(
        'Cannot save answers after the examination has been submitted.',
        409,
        'SESSION_ALREADY_SUBMITTED'
      );
    }

    const startedAt = ctx.session.started_at || ctx.session.created_at;
    const expiresAtMs = Date.parse(
      computeExpiresAtIso(startedAt, ctx.exam.duration_minutes, ctx.exam.end_time)
    );
    const graceMs = options?.allowSubmitGrace ? SUBMIT_OFFLINE_FLUSH_GRACE_MS : AUTOSAVE_GRACE_MS;

    if (Date.now() > expiresAtMs + graceMs) {
      throw new ExamSessionError(
        'Examination time has elapsed. Answers are locked.',
        409,
        'SESSION_EXPIRED'
      );
    }

    const isBatch =
      typeof rawInput === 'object' &&
      rawInput !== null &&
      'answers' in rawInput &&
      Array.isArray((rawInput as { answers?: unknown }).answers);

    const items = isBatch
      ? (() => {
          const res = batchSaveAnswersSchema.safeParse(rawInput);
          if (!res.success) {
            throw new ExamSessionError('Invalid batch answer payload.', 400, 'INVALID_PAYLOAD');
          }
          return res.data.answers;
        })()
      : (() => {
          const res = saveAnswerSchema.safeParse(rawInput);
          if (!res.success) {
            throw new ExamSessionError('Invalid answer payload.', 400, 'INVALID_PAYLOAD');
          }
          return [res.data];
        })();

    // Deduplicate batch by questionId (last entry wins)
    const deduped = new Map<string, { questionId: string; selectedOptionId?: string | null; responseText?: string | null }>();
    for (const item of items) {
      deduped.set(item.questionId, {
        questionId: item.questionId,
        selectedOptionId: item.selectedOptionId,
        responseText: item.responseText,
      });
    }
    const normalizedItems = Array.from(deduped.values());
    const targetQuestionIds = normalizedItems.map((i) => i.questionId);

    // Verify all questionIds belong to this exam and options belong to those questions (using student-safe view)
    const [{ data: validQuestions, error: qErr }, { data: validOptions, error: oErr }] =
      await Promise.all([
        supabaseAdmin
          .from('questions')
          .select('id, type')
          .eq('exam_id', ctx.exam.id)
          .in('id', targetQuestionIds),
        supabaseAdmin
          .from('question_options_student_view')
          .select('id, question_id')
          .in('question_id', targetQuestionIds),
      ]);

    if (qErr || oErr) {
      throw new ExamSessionError('Failed to verify question reference.', 500);
    }

    const validQuestionMap = new Map(((validQuestions || []) as { id: string; type: string }[]).map((q) => [q.id, q]));
    const optionsByQuestion = new Map<string, Set<string>>();
    for (const o of (validOptions || []) as { id: string; question_id: string }[]) {
      const set = optionsByQuestion.get(o.question_id) || new Set<string>();
      set.add(o.id);
      optionsByQuestion.set(o.question_id, set);
    }

    const upsertRows: {
      session_id: string;
      question_id: string;
      selected_option_id: string | null;
      selected_option_ids: string[];
      response_text: string | null;
    }[] = [];
    const clearQuestionIds: string[] = [];

    for (const item of normalizedItems) {
      const questionMeta = validQuestionMap.get(item.questionId);
      if (!questionMeta) {
        throw new ExamSessionError(
          'Question does not belong to this examination.',
          400,
          'INVALID_QUESTION'
        );
      }

      const hasText = typeof item.responseText === 'string' && item.responseText.trim().length > 0;
      const hasOption = Boolean(item.selectedOptionId);

      if (!hasText && !hasOption) {
        clearQuestionIds.push(item.questionId);
      } else {
        if (hasOption && item.selectedOptionId) {
          const allowedOpts = optionsByQuestion.get(item.questionId);
          if (!allowedOpts || !allowedOpts.has(item.selectedOptionId)) {
            throw new ExamSessionError(
              'Selected answer option does not belong to this question.',
              400,
              'INVALID_OPTION'
            );
          }
        }
        upsertRows.push({
          session_id: ctx.session.id,
          question_id: item.questionId,
          selected_option_id: item.selectedOptionId || null,
          selected_option_ids: item.selectedOptionId ? [item.selectedOptionId] : [],
          response_text: hasText ? item.responseText! : null,
        });
      }
    }

    if (upsertRows.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from('session_answers')
        .upsert(upsertRows, { onConflict: 'session_id,question_id' });
      if (upsertErr) {
        throw new ExamSessionError(`Failed to save answers: ${upsertErr.message}`, 500, 'SAVE_FAILED');
      }
    }

    if (clearQuestionIds.length > 0) {
      const { error: delErr } = await supabaseAdmin
        .from('session_answers')
        .delete()
        .eq('session_id', ctx.session.id)
        .in('question_id', clearQuestionIds);
      if (delErr) {
        throw new ExamSessionError(`Failed to clear answer selection: ${delErr.message}`, 500);
      }
    }

    const serverNow = new Date().toISOString();
    if (isBatch) {
      return {
        savedCount: normalizedItems.length,
        serverNow,
      };
    }

    const single = normalizedItems[0]!;
    return {
      saved: true,
      questionId: single.questionId,
      selectedOptionId: single.selectedOptionId ?? null,
      cleared: single.selectedOptionId === null && !single.responseText,
      serverNow,
    };
  }

  /**
   * Idempotently submits the candidate's active examination, prevents duplicate
   * submissions, grades MCQs on the server, and returns a submission receipt.
   */
  static async submitExam(
    examId: string,
    rawInput?: unknown,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<ExamSubmissionReceipt> {
    const actor = await requireRoleActor(['student']);
    const ctx = await loadExamContext(examId, actor);

    const parsed = submitExamSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      throw new ExamSessionError('Invalid examination submission payload.', 400, 'INVALID_PAYLOAD');
    }

    if (!ctx.session) {
      throw new ExamSessionError(
        'Cannot submit: no active examination session exists.',
        404,
        'SESSION_NOT_FOUND'
      );
    }

    // Duplicate submission protection: return idempotent confirmation receipt immediately.
    if (TERMINAL_SESSION_STATUSES.includes(ctx.session.status)) {
      return buildReceiptFromSession({
        session: ctx.session,
        exam: ctx.exam,
        course: ctx.course,
        totalQuestions: ctx.questionCount,
        alreadySubmitted: true,
      });
    }

    if (ctx.session.status !== 'in_progress') {
      throw new ExamSessionError('Examination session is not active.', 409, 'INVALID_STATE');
    }

    // Flush any queued offline answers sent alongside submission within reasonable grace
    if (parsed.data.pendingAnswers && parsed.data.pendingAnswers.length > 0) {
      try {
        await this.saveAnswers(
          examId,
          { answers: parsed.data.pendingAnswers },
          { allowSubmitGrace: true }
        );
      } catch (err: unknown) {
        // Ignore expiry error only if flushing expired offline packets would otherwise block auto-submit
        if (!(err instanceof ExamSessionError && err.code === 'SESSION_EXPIRED')) {
          throw err;
        }
      }
    }

    const startedAt = ctx.session.started_at || ctx.session.created_at;
    const expiresAtMs = Date.parse(
      computeExpiresAtIso(startedAt, ctx.exam.duration_minutes, ctx.exam.end_time)
    );
    const autoSubmitted = parsed.data.autoSubmitted || Date.now() >= expiresAtMs;

    return finalizeAndGradeSession({
      actor,
      exam: ctx.exam,
      course: ctx.course,
      session: ctx.session,
      autoSubmitted,
      flaggedQuestionIds: parsed.data.flaggedQuestionIds,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}

