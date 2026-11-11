import { NextResponse } from 'next/server'
import { ProctorEventService } from '@/lib/services/proctor-events'
import { extractRequestMeta, handleExamSessionApiError } from '@/lib/utils/request-meta'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params
    const meta = extractRequestMeta(request)
    const body = await request.json().catch(() => ({}))
    const updated = await ProctorEventService.updateEventReviewStatus(eventId, body, meta)

    return NextResponse.json(
      { event: updated },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to update event review status.')
  }
}

