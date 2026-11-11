import { NextResponse } from 'next/server'
import { ProctorEventService } from '@/lib/services/proctor-events'
import { handleExamSessionApiError } from '@/lib/utils/request-meta'
import type { EventReviewStatus, RiskCategory } from '@/types/proctoring'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const examId = url.searchParams.get('examId')
    const sessionId = url.searchParams.get('sessionId')
    const riskCategoryParam = url.searchParams.get('riskCategory')
    const reviewStatusParam = url.searchParams.get('reviewStatus')
    const limitParam = url.searchParams.get('limit')

    const riskCategory: RiskCategory | null =
      riskCategoryParam === 'NORMAL' ||
      riskCategoryParam === 'REVIEW_SUGGESTED' ||
      riskCategoryParam === 'PRIORITY_REVIEW'
        ? riskCategoryParam
        : null

    const reviewStatus: EventReviewStatus | null =
      reviewStatusParam === 'pending_review' ||
      reviewStatusParam === 'acknowledged' ||
      reviewStatusParam === 'cleared' ||
      reviewStatusParam === 'flagged' ||
      reviewStatusParam === 'dismissed'
        ? reviewStatusParam
        : null

    const parsedLimit = limitParam ? Number(limitParam) : undefined

    const data = await ProctorEventService.getTenantEventHistory({
      examId,
      sessionId,
      riskCategory,
      reviewStatus,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    })

    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Unable to load monitoring event history.')
  }
}

