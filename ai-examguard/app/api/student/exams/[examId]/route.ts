import { NextResponse } from 'next/server';
import { ExamEngineService } from '@/lib/services/exam-engine';

/**
 * GET /api/student/exams/[examId]
 *
 * Delivers an authenticated student's exam paper without any answer keys (`is_correct`)
 * or solution explanations. Reads options from `question_options_student_view` and
 * verifies enrollment + explicit `exam_assignments` roster access.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params;
    const paper = await ExamEngineService.getStudentExamPaper(examId);
    return NextResponse.json(paper, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const msg = (error as Error).message || 'Unable to load examination paper.';
    if (msg.startsWith('Unauthorized')) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (msg.startsWith('Forbidden')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

