import { NextResponse } from 'next/server';
import { ExamSessionService } from '@/lib/services/exam-session';
import { extractRequestMeta, handleExamSessionApiError } from '@/lib/utils/request-meta';

/**
 * POST /api/student/exams/[examId]/submit
 * Idempotently finalizes the candidate's exam session, prevents duplicate submissions,
 * scores responses server-side, and returns a confirmation receipt.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const meta = extractRequestMeta(request);
    const body = await request.json().catch(() => ({}));
    const receipt = await ExamSessionService.submitExam(examId, body, meta);
    return NextResponse.json(receipt, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to submit examination.');
  }
}

