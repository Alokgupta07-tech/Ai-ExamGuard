import { NextResponse } from 'next/server';
import { ExamSessionService } from '@/lib/services/exam-session';
import { extractRequestMeta, handleExamSessionApiError } from '@/lib/utils/request-meta';

/**
 * GET /api/student/exams/[examId]/session
 * Loads an already-started active session (or terminal receipt) and restores saved answers.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const meta = extractRequestMeta(request);
    const bootstrap = await ExamSessionService.startOrResumeSession(examId, undefined, {
      ...meta,
      createIfMissing: false,
    });
    return NextResponse.json(bootstrap, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to load examination session.');
  }
}

/**
 * POST /api/student/exams/[examId]/session
 * Starts or resumes an authorized student examination session with server-controlled timing.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const meta = extractRequestMeta(request);
    const body = await request.json().catch(() => ({}));
    const bootstrap = await ExamSessionService.startOrResumeSession(examId, body, {
      ...meta,
      createIfMissing: true,
    });
    return NextResponse.json(bootstrap, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to start examination session.');
  }
}

/**
 * PATCH /api/student/exams/[examId]/session
 * Persists flagged questions, active question cursor, and browser hardware status.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const body = await request.json().catch(() => ({}));
    await ExamSessionService.updateSessionProgress(examId, body);
    return NextResponse.json(
      { ok: true, serverNow: new Date().toISOString() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to update session progress.');
  }
}

