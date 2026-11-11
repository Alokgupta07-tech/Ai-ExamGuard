import { NextResponse } from 'next/server';
import { ExamSessionService } from '@/lib/services/exam-session';
import { handleExamSessionApiError } from '@/lib/utils/request-meta';

/**
 * GET /api/student/exams/[examId]/preflight
 * Returns eligibility, instructions, monitoring configuration, and existing session/receipt
 * without exposing questions or answer keys.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const payload = await ExamSessionService.getExamPreflight(examId);
    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to load examination pre-flight details.');
  }
}

