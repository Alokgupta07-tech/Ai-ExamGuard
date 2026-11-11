import { NextResponse } from 'next/server'
import { ProctorEventService } from '@/lib/services/proctor-events'
import { extractRequestMeta, handleExamSessionApiError } from '@/lib/utils/request-meta'

/**
 * POST /api/student/exams/[examId]/proctor-events
 * Records local MediaPipe camera/face advisory monitoring events (never raw frames)
 * strictly for the authenticated student's own session or preflight check.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await context.params
    const meta = extractRequestMeta(request)
    const body = await request.json().catch(() => ({}))
    const result = await ProctorEventService.recordStudentEvent(examId, body, meta)
    return NextResponse.json(result, {
      status: result.recorded ? 201 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to record monitoring telemetry.')
  }
}

