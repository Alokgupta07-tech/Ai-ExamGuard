import { NextResponse } from 'next/server'
import { ProctorEventService } from '@/lib/services/proctor-events'
import { handleExamSessionApiError } from '@/lib/utils/request-meta'

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    const detail = await ProctorEventService.getSessionMonitoringDetail(sessionId)

    return NextResponse.json(detail, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to load candidate session monitoring detail.')
  }
}

