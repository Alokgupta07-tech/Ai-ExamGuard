import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ProctorMonitoringEventType, ExamIntegrityPolicy } from '@/types/proctoring'

export const DEFAULT_EXAM_POLICY: ExamIntegrityPolicy = {
  examId: '',
  tenantId: '',
  maxWarnings: 3,
  fullscreenRequired: true,
  tabSwitchStrike: true,
  phoneDetectionStrike: true,
  multipleFacesStrike: true,
  additionalPersonStrike: true,
  audioVadStrike: true,
  gazeDeviationStrike: false,
  warningCooldownSeconds: 20,
  autoSubmissionEnabled: true,
  version: 1,
}

/**
 * Event types that qualify for misconduct warnings under standard policy.
 * Technical incidents (camera disconnected, mic permission denied, internet blip, ambient noise)
 * are NEVER counted as misconduct warnings.
 */
export const STRIKE_ELIGIBLE_EVENT_TYPES: Set<ProctorMonitoringEventType> = new Set([
  'PHONE_DETECTED',
  'MULTIPLE_DEVICES_DETECTED',
  'ADDITIONAL_PERSON_DETECTED',
  'MULTIPLE_FACES_DETECTED',
  'TAB_HIDDEN',
  'FULLSCREEN_EXIT',
  'SUSTAINED_SPEECH_ACTIVITY',
])

export interface EvaluateWarningResult {
  isStrike: boolean
  strikeNumber: number
  maxStrikes: number
  autoSubmitted: boolean
  cooldownActive: boolean
  warningTitle: string | null
  warningMessage: string | null
  policyVersion: number
}

export class WarningPolicyEngine {
  /**
   * Loads policy for an exam, creating default if not yet customized.
   */
  static async getExamPolicy(examId: string, tenantId: string): Promise<ExamIntegrityPolicy> {
    const { data, error } = await supabaseAdmin
      .from('exam_policies')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle()

    if (!error && data) {
      return {
        id: data.id,
        examId: data.exam_id,
        tenantId: data.tenant_id,
        maxWarnings: data.max_warnings ?? 3,
        fullscreenRequired: data.fullscreen_required ?? true,
        tabSwitchStrike: data.tab_switch_strike ?? true,
        phoneDetectionStrike: data.phone_detection_strike ?? true,
        multipleFacesStrike: data.multiple_faces_strike ?? true,
        additionalPersonStrike: data.additional_person_strike ?? true,
        audioVadStrike: data.audio_vad_strike ?? true,
        gazeDeviationStrike: data.gaze_deviation_strike ?? false,
        warningCooldownSeconds: data.warning_cooldown_seconds ?? 20,
        autoSubmissionEnabled: data.auto_submission_enabled ?? true,
        version: data.version ?? 1,
      }
    }

    return {
      ...DEFAULT_EXAM_POLICY,
      examId,
      tenantId,
    }
  }

  /**
   * Determines if an incoming event qualifies for a policy violation strike.
   */
  static isEventEligibleForStrike(
    eventType: ProctorMonitoringEventType,
    policy: ExamIntegrityPolicy
  ): boolean {
    if (!STRIKE_ELIGIBLE_EVENT_TYPES.has(eventType)) {
      return false
    }

    if (eventType === 'PHONE_DETECTED' || eventType === 'MULTIPLE_DEVICES_DETECTED') {
      return policy.phoneDetectionStrike
    }
    if (eventType === 'ADDITIONAL_PERSON_DETECTED') {
      return policy.additionalPersonStrike
    }
    if (eventType === 'MULTIPLE_FACES_DETECTED') {
      return policy.multipleFacesStrike
    }
    if (eventType === 'TAB_HIDDEN') {
      return policy.tabSwitchStrike
    }
    if (eventType === 'FULLSCREEN_EXIT') {
      return policy.fullscreenRequired
    }
    if (eventType === 'SUSTAINED_SPEECH_ACTIVITY') {
      return policy.audioVadStrike
    }
    if (eventType === 'PROLONGED_OFFSCREEN_GAZE' || eventType === 'REPEATED_HEAD_DEVIATION') {
      return policy.gazeDeviationStrike
    }

    return false
  }

  /**
   * Builds the official, timestamped warning dialog text for the student.
   */
  static formatWarningMessage(
    strikeNumber: number,
    maxStrikes: number,
    eventType: string,
    reason: string
  ): { title: string; message: string } {
    if (strikeNumber >= maxStrikes) {
      return {
        title: `Warning ${strikeNumber} of ${maxStrikes} — Examination Automatically Submitted`,
        message:
          `Examination automatically submitted under the configured monitoring policy. Reason: ${reason}. All completed answers have been flushed and safely recorded.`,
      }
    }

    if (strikeNumber === maxStrikes - 1) {
      return {
        title: `Warning ${strikeNumber} of ${maxStrikes} — Final Warning`,
        message:
          `Final warning. Another qualifying policy violation will automatically submit your examination. Issue: ${reason}. Please maintain strict compliance with examination guidelines.`,
      }
    }

    return {
      title: `Warning ${strikeNumber} of ${maxStrikes} — Examination Integrity Notice`,
      message:
        `An examination integrity event has been detected: ${reason}. Please return to the permitted examination environment. Continued non-compliance will lead to automatic submission.`,
    }
  }

  /**
   * Processes an incoming verified monitoring event, enforces cooldown,
   * registers the strike in `session_warning_events`, and triggers atomic auto-submission
   * if the strike limit (default 3) is reached.
   */
  static async evaluateAndApplyStrike(params: {
    sessionId: string
    examId: string
    studentId: string
    tenantId: string
    eventType: ProctorMonitoringEventType
    reason: string
    confidence?: number | null
    details?: Record<string, unknown>
  }): Promise<EvaluateWarningResult> {
    const policy = await this.getExamPolicy(params.examId, params.tenantId)

    if (!this.isEventEligibleForStrike(params.eventType, policy)) {
      return {
        isStrike: false,
        strikeNumber: 0,
        maxStrikes: policy.maxWarnings,
        autoSubmitted: false,
        cooldownActive: false,
        warningTitle: null,
        warningMessage: null,
        policyVersion: policy.version,
      }
    }

    // Check last warning timestamp on this session for cooldown
    const { data: lastWarning } = await supabaseAdmin
      .from('session_warning_events')
      .select('created_at, strike_number')
      .eq('session_id', params.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const now = Date.now()
    if (lastWarning) {
      const lastAt = Date.parse(lastWarning.created_at)
      const elapsedSec = (now - lastAt) / 1000
      if (elapsedSec < policy.warningCooldownSeconds) {
        // Cooldown active — suppress repeated strike for the same continuous incident
        return {
          isStrike: false,
          strikeNumber: lastWarning.strike_number,
          maxStrikes: policy.maxWarnings,
          autoSubmitted: false,
          cooldownActive: true,
          warningTitle: null,
          warningMessage: null,
          policyVersion: policy.version,
        }
      }
    }

    // Get current session warning count
    const { data: sessionRow, error: sessErr } = await supabaseAdmin
      .from('exam_sessions')
      .select('id, warning_count, max_warnings, status')
      .eq('id', params.sessionId)
      .maybeSingle()

    if (sessErr || !sessionRow || sessionRow.status !== 'in_progress') {
      return {
        isStrike: false,
        strikeNumber: sessionRow?.warning_count ?? 0,
        maxStrikes: policy.maxWarnings,
        autoSubmitted: sessionRow?.status === 'submitted',
        cooldownActive: false,
        warningTitle: null,
        warningMessage: null,
        policyVersion: policy.version,
      }
    }

    const nextStrike = (sessionRow.warning_count || 0) + 1
    const shouldAutoSubmit = policy.autoSubmissionEnabled && nextStrike >= policy.maxWarnings

    // Record the strike in session_warning_events
    await supabaseAdmin.from('session_warning_events').insert({
      session_id: params.sessionId,
      exam_id: params.examId,
      student_id: params.studentId,
      tenant_id: params.tenantId,
      strike_number: nextStrike,
      event_type: params.eventType,
      source_module: 'warning_policy_engine',
      severity: nextStrike >= policy.maxWarnings ? 'critical' : 'high',
      confidence: params.confidence,
      reason: params.reason,
      details: params.details || {},
      server_validated: true,
    })

    const text = this.formatWarningMessage(
      nextStrike,
      policy.maxWarnings,
      params.eventType,
      params.reason
    )

    // Update exam_sessions warning count and trigger auto_submit if reached
    if (shouldAutoSubmit) {
      const nowIso = new Date().toISOString()
      await supabaseAdmin
        .from('exam_sessions')
        .update({
          warning_count: nextStrike,
          max_warnings: policy.maxWarnings,
          status: 'submitted',
          auto_submitted: true,
          auto_submission_reason: `Automatic submission triggered by ${policy.maxWarnings} integrity violation warnings. Trigger: ${params.reason}`,
          auto_submitted_at: nowIso,
          submitted_at: nowIso,
        })
        .eq('id', params.sessionId)
        .eq('status', 'in_progress')

      // Record in audit log
      await supabaseAdmin.from('exam_submission_audit').insert({
        session_id: params.sessionId,
        exam_id: params.examId,
        student_id: params.studentId,
        tenant_id: params.tenantId,
        submission_type: 'auto_policy_strikes',
        warning_count: nextStrike,
        triggering_event: {
          eventType: params.eventType,
          reason: params.reason,
          confidence: params.confidence,
          details: params.details,
        },
      })
    } else {
      await supabaseAdmin
        .from('exam_sessions')
        .update({
          warning_count: nextStrike,
          max_warnings: policy.maxWarnings,
        })
        .eq('id', params.sessionId)
    }

    return {
      isStrike: true,
      strikeNumber: nextStrike,
      maxStrikes: policy.maxWarnings,
      autoSubmitted: shouldAutoSubmit,
      cooldownActive: false,
      warningTitle: text.title,
      warningMessage: text.message,
      policyVersion: policy.version,
    }
  }
}
