import { NextResponse } from 'next/server'
import { ProctorEventService } from '@/lib/services/proctor-events'
import { extractRequestMeta, handleExamSessionApiError } from '@/lib/utils/request-meta'

export async function POST(request: Request) {
  try {
    const meta = extractRequestMeta(request)
    const body = await request.json().catch(() => ({}))
    const result = await ProctorEventService.createSimulatedDemoEvent(body, meta)

    return NextResponse.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to generate simulated demonstration alert.')
  }
}

