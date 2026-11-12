import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRoleActor } from '@/lib/services/dashboard'
import { WarningPolicyEngine, DEFAULT_EXAM_POLICY } from '@/lib/proctoring/warning-engine'

const policyUpdateSchema = z.object({
  maxWarnings: z.number().int().min(1).max(10).optional(),
  fullscreenRequired: z.boolean().optional(),
  tabSwitchStrike: z.boolean().optional(),
  phoneDetectionStrike: z.boolean().optional(),
  multipleFacesStrike: z.boolean().optional(),
  additionalPersonStrike: z.boolean().optional(),
  audioVadStrike: z.boolean().optional(),
  gazeDeviationStrike: z.boolean().optional(),
  warningCooldownSeconds: z.number().int().min(5).max(120).optional(),
  autoSubmissionEnabled: z.boolean().optional(),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const actor = await requireRoleActor(['instructor', 'admin', 'invigilator', 'student'])
    const { examId } = await context.params
    const policy = await WarningPolicyEngine.getExamPolicy(examId, actor.tenantId)
    return NextResponse.json(policy)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch exam policy' },
      { status: 400 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const actor = await requireRoleActor(['instructor', 'admin'])
    const { examId } = await context.params
    const body = await request.json()
    const parsed = policyUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid policy update' },
        { status: 400 }
      )
    }

    const current = await WarningPolicyEngine.getExamPolicy(examId, actor.tenantId)
    const next = {
      exam_id: examId,
      tenant_id: actor.tenantId,
      max_warnings: parsed.data.maxWarnings ?? current.maxWarnings,
      fullscreen_required: parsed.data.fullscreenRequired ?? current.fullscreenRequired,
      tab_switch_strike: parsed.data.tabSwitchStrike ?? current.tabSwitchStrike,
      phone_detection_strike: parsed.data.phoneDetectionStrike ?? current.phoneDetectionStrike,
      multiple_faces_strike: parsed.data.multipleFacesStrike ?? current.multipleFacesStrike,
      additional_person_strike: parsed.data.additionalPersonStrike ?? current.additionalPersonStrike,
      audio_vad_strike: parsed.data.audioVadStrike ?? current.audioVadStrike,
      gaze_deviation_strike: parsed.data.gazeDeviationStrike ?? current.gazeDeviationStrike,
      warning_cooldown_seconds: parsed.data.warningCooldownSeconds ?? current.warningCooldownSeconds,
      auto_submission_enabled: parsed.data.autoSubmissionEnabled ?? current.autoSubmissionEnabled,
      version: (current.version || 1) + 1,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabaseAdmin
      .from('exam_policies')
      .upsert(next, { onConflict: 'exam_id' })
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update exam policy: ${error.message}`)
    }

    return NextResponse.json(updated)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to update exam policy' },
      { status: 400 }
    )
  }
}
