import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRoleActor } from '@/lib/services/dashboard'
import { LiveKitService } from '@/lib/livekit/server'
import { extractRequestMeta, handleExamSessionApiError } from '@/lib/utils/request-meta'

const tokenRequestSchema = z.object({
  examId: z.string().uuid(),
  sessionId: z.string().uuid().optional().nullable(),
  roleOverride: z.enum(['student', 'invigilator']).optional(),
})

export async function POST(request: Request) {
  try {
    const actor = await requireRoleActor(['student', 'invigilator', 'instructor', 'admin'])
    const body = await request.json()
    const parsed = tokenRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid LiveKit token request parameters.' },
        { status: 400 }
      )
    }

    const { examId, sessionId } = parsed.data
    const isStaff = actor.roles.some((r) => r === 'invigilator' || r === 'instructor' || r === 'admin')
    const requestedRole: 'student' | 'invigilator' = isStaff ? 'invigilator' : 'student'

    // Verify examination exists in tenant
    const { data: exam, error: examErr } = await supabaseAdmin
      .from('exams')
      .select('id, title, tenant_id')
      .eq('id', examId)
      .eq('tenant_id', actor.tenantId)
      .maybeSingle()

    if (examErr || !exam) {
      return NextResponse.json(
        { error: 'Examination not found or unauthorized for your institution.' },
        { status: 404 }
      )
    }

    let activeSessionId = sessionId ?? null

    // If candidate, verify session authorization
    if (requestedRole === 'student') {
      const { data: session, error: sessErr } = await supabaseAdmin
        .from('exam_sessions')
        .select('id, status')
        .eq('exam_id', examId)
        .eq('student_id', actor.userId)
        .eq('tenant_id', actor.tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessErr || !session) {
        return NextResponse.json(
          { error: 'No active examination session found for this candidate.' },
          { status: 403 }
        )
      }

      if (session.status === 'submitted') {
        return NextResponse.json(
          { error: 'Examination has already been submitted. Live monitoring terminated.' },
          { status: 410 }
        )
      }
      activeSessionId = session.id
    }

    const roomName = await LiveKitService.getOrCreateRoomSession(examId, actor.tenantId)
    const { ipAddress: clientIp } = extractRequestMeta(request)

    const tokenResult = await LiveKitService.issueParticipantToken({
      roomName,
      participantIdentity: actor.userId,
      participantName: actor.fullName,
      role: requestedRole,
      tenantId: actor.tenantId,
      examId,
      sessionId: activeSessionId,
      metadata: {
        role: requestedRole,
        clientIp,
      },
    })

    return NextResponse.json(tokenResult, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return handleExamSessionApiError(error, 'Unable to initialize LiveKit media stream token.')
  }
}

