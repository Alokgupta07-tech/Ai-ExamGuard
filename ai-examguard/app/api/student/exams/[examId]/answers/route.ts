import { NextResponse } from 'next/server';
import { ExamSessionService } from '@/lib/services/exam-session';
import { handleExamSessionApiError } from '@/lib/utils/request-meta';

/**
 * PUT /api/student/exams/[examId]/answers
 * Idempotently persists single or batched candidate answer selections in Supabase.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const body = await request.json().catch(() => null);
    const result = await ExamSessionService.saveAnswers(examId, body);
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to save examination answer.');
  }
}

