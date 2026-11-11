import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRoleActor } from '@/lib/services/dashboard'
import { ExamSessionError } from '@/lib/services/exam-session'
import { extractRequestMeta } from '@/lib/utils/request-meta'
import {
  assertNoRawFramePayload,
  proctorEventPayloadSchema,
  type ProctorEventInput,
} from '@/lib/validators/proctor-events'
import type { EventSeverity, EventType } from '@/types/database'
import type { ProctorMonitoringEventType } from '@/types/proctoring'

type RequestMetadata = ReturnType<typeof extractRequestMeta>

const uuidSchema = z.string().uuid()
const DEDUP_WINDOW_MS = 10_000

const DEFAULT_EVENT_SEVERITY: Record<ProctorMonitoringEventType, EventSeverity> = {
  FACE_NOT_VISIBLE: 'medium',
  MULTIPLE_FACES_DETECTED: 'high',
  CAMERA_DISCONNECTED: 'high',
  CAMERA_PERMISSION_DENIED: 'medium',
  AUDIO_ACTIVITY: 'low',
  MICROPHONE_DISCONNECTED: 'medium',
  MICROPHONE_PERMISSION_DENIED: 'medium',
  TAB_HIDDEN: 'medium',
  FULLSCREEN_EXIT: 'medium',
  SESSION_CONNECTION_INTERRUPTED: 'low',
}

const LEGACY_ENUM_FALLBACK: Record<ProctorMonitoringEventType, EventType> = {
  FACE_NOT_VISIBLE: 'NO_FACE_DETECTED',
  MULTIPLE_FACES_DETECTED: 'MULTIPLE_FACES_DETECTED',
  CAMERA_DISCONNECTED: 'FACE_OCCLUDED',
  CAMERA_PERMISSION_DENIED: 'FACE_OCCLUDED',
  AUDIO_ACTIVITY: 'AUDIO_ANOMALY',
  MICROPHONE_DISCONNECTED: 'AUDIO_ANOMALY',
  MICROPHONE_PERMISSION_DENIED: 'AUDIO_ANOMALY',
  TAB_HIDDEN: 'TAB_SWITCH',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  SESSION_CONNECTION_INTERRUPTED: 'WINDOW_BLUR',
}

export interface RecordProctorEventResult {
  recorded: boolean
  deduplicated: boolean
  storage: 'proctor_events' | 'audit_logs'
  eventId: string | null
  eventType: ProctorMonitoringEventType
  persistedAs: string | null
  advisoryOnly: true
}

export class ProctorEventService {
  static async recordStudentEvent(
    examId: string,
    rawBody: unknown,
    meta: RequestMetadata
  ): Promise<RecordProctorEventResult> {
    if (!uuidSchema.safeParse(examId).success) {
      throw new ExamSessionError('Invalid examination identifier.', 400, 'INVALID_EXAM_ID')
    }

    try {
      assertNoRawFramePayload(rawBody)
    } catch (error) {
      throw new ExamSessionError(
        error instanceof Error ? error.message : 'Raw frame payloads are prohibited.',
        400,
        'RAW_FRAME_FORBIDDEN'
      )
    }

    const parsed = proctorEventPayloadSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new ExamSessionError(
        parsed.error.issues[0]?.message ?? 'Invalid proctor monitoring event payload.',
        400,
        'INVALID_PROCTOR_PAYLOAD'
      )
    }

    const actor = await requireRoleActor(['student'])
    const input: ProctorEventInput = parsed.data
    const severity: EventSeverity =
      input.severity ?? DEFAULT_EVENT_SEVERITY[input.eventType]

    // Verify exam exists in the student's tenant and ensure the student is assigned
    const { data: examRow, error: examErr } = await supabaseAdmin
      .from('exams')
      .select('id, tenant_id, course_id')
      .eq('id', examId)
      .eq('tenant_id', actor.tenantId)
      .maybeSingle()

    if (examErr || !examRow) {
      throw new ExamSessionError('Examination not found in your institution.', 404, 'EXAM_NOT_FOUND')
    }

    let sessionRow: {
      id: string
      status: string
      hardware_status: Record<string, unknown> | null
    } | null = null

    if (input.sessionId) {
      const { data, error } = await supabaseAdmin
        .from('exam_sessions')
        .select('id, student_id, exam_id, tenant_id, status, hardware_status')
        .eq('id', input.sessionId)
        .maybeSingle()

      if (error || !data) {
        throw new ExamSessionError('Examination session not found.', 404, 'SESSION_NOT_FOUND')
      }
      if (
        data.student_id !== actor.userId ||
        data.exam_id !== examId ||
        data.tenant_id !== actor.tenantId
      ) {
        throw new ExamSessionError(
          'You are not authorized to record monitoring events for this session.',
          403,
          'FORBIDDEN_SESSION_ACCESS'
        )
      }
      sessionRow = {
        id: data.id,
        status: data.status,
        hardware_status: (data.hardware_status as Record<string, unknown> | null) ?? null,
      }
    } else {
      const { data } = await supabaseAdmin
        .from('exam_sessions')
        .select('id, status, hardware_status')
        .eq('exam_id', examId)
        .eq('student_id', actor.userId)
        .eq('tenant_id', actor.tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        sessionRow = {
          id: data.id,
          status: data.status,
          hardware_status: (data.hardware_status as Record<string, unknown> | null) ?? null,
        }
      }
    }

    if (!sessionRow) {
      // Confirm the student holds an assignment or course enrollment for preflight telemetry
      const [{ data: assignmentRows }, { data: enrollmentRow }] = await Promise.all([
        supabaseAdmin
          .from('exam_assignments')
          .select('student_id')
          .eq('exam_id', examId),
        supabaseAdmin
          .from('enrollments')
          .select('course_id')
          .eq('course_id', examRow.course_id)
          .eq('student_id', actor.userId)
          .maybeSingle(),
      ])

      const assignedIds = new Set(
        ((assignmentRows ?? []) as { student_id: string }[]).map((r) => r.student_id)
      )
      const isAuthorizedForExam =
        assignedIds.size > 0
          ? assignedIds.has(actor.userId)
          : Boolean(enrollmentRow)

      if (!isAuthorizedForExam) {
        throw new ExamSessionError(
          'You are not assigned to this examination.',
          403,
          'NOT_ASSIGNED'
        )
      }

      if (input.context !== 'preflight') {
        throw new ExamSessionError(
          'Active examination session required to log live proctoring events.',
          409,
          'NO_ACTIVE_SESSION'
        )
      }

      const { data: auditRow, error: auditErr } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          tenant_id: actor.tenantId,
          user_id: actor.userId,
          action: 'VIOLATION_LOGGED',
          entity_type: 'exam',
          entity_id: examId,
          details: {
            phase8EventType: input.eventType,
            context: 'preflight',
            advisoryOnly: true,
            source: 'mediapipe_local',
            severity,
            confidence: input.confidence,
            ...(input.details ?? {}),
          },
          ip_address: meta.ipAddress,
          user_agent: meta.userAgent,
        })
        .select('id')
        .single()

      if (auditErr) {
        throw new ExamSessionError(
          `Failed to persist preflight monitoring notice: ${auditErr.message}`,
          500,
          'PROCTOR_PERSIST_FAILED'
        )
      }

      return {
        recorded: true,
        deduplicated: false,
        storage: 'audit_logs',
        eventId: auditRow.id,
        eventType: input.eventType,
        persistedAs: 'audit_logs:VIOLATION_LOGGED',
        advisoryOnly: true,
      }
    }

    if (sessionRow.status !== 'in_progress' && sessionRow.status !== 'not_started') {
      return {
        recorded: false,
        deduplicated: false,
        storage: 'proctor_events',
        eventId: null,
        eventType: input.eventType,
        persistedAs: null,
        advisoryOnly: true,
      }
    }

    // Deduplicate identical event types within DEDUP_WINDOW_MS for the same session
    const cutoffIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    const { data: recentEvents } = await supabaseAdmin
      .from('proctor_events')
      .select('id, event_type, details')
      .eq('session_id', sessionRow.id)
      .eq('tenant_id', actor.tenantId)
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(10)

    const duplicate = (recentEvents ?? []).find((row) => {
      const details = row.details as Record<string, unknown> | null
      const logicalType =
        (details?.phase9EventType as string | undefined) ||
        (details?.phase8EventType as string | undefined) ||
        row.event_type
      return logicalType === input.eventType
    })

    if (duplicate) {
      return {
        recorded: false,
        deduplicated: true,
        storage: 'proctor_events',
        eventId: duplicate.id,
        eventType: input.eventType,
        persistedAs: duplicate.event_type,
        advisoryOnly: true,
      }
    }

    const isCameraEvent =
      input.eventType === 'FACE_NOT_VISIBLE' ||
      input.eventType === 'MULTIPLE_FACES_DETECTED' ||
      input.eventType === 'CAMERA_DISCONNECTED' ||
      input.eventType === 'CAMERA_PERMISSION_DENIED'

    const isAudioEvent =
      input.eventType === 'AUDIO_ACTIVITY' ||
      input.eventType === 'MICROPHONE_DISCONNECTED' ||
      input.eventType === 'MICROPHONE_PERMISSION_DENIED'

    const telemetrySource = isCameraEvent
      ? 'mediapipe_local'
      : isAudioEvent
        ? 'web_audio_local'
        : 'browser_visibility_local'

    const enrichedDetails: Record<string, unknown> = {
      ...(isCameraEvent ? { phase8EventType: input.eventType } : { phase9EventType: input.eventType }),
      context: input.context,
      advisoryOnly: true,
      source: telemetrySource,
      ...(input.sustainedDurationMs !== undefined
        ? { sustainedDurationMs: input.sustainedDurationMs }
        : {}),
      ...(input.details ?? {}),
    }

    let persistedAs: EventType = input.eventType
    let { data: inserted, error: insertErr } = await supabaseAdmin
      .from('proctor_events')
      .insert({
        session_id: sessionRow.id,
        tenant_id: actor.tenantId,
        event_type: input.eventType,
        severity,
        confidence: Number(input.confidence.toFixed(3)),
        details: enrichedDetails,
      })
      .select('id, event_type')
      .single()

    if (insertErr && insertErr.code === '22P02') {
      persistedAs = LEGACY_ENUM_FALLBACK[input.eventType]
      const retry = await supabaseAdmin
        .from('proctor_events')
        .insert({
          session_id: sessionRow.id,
          tenant_id: actor.tenantId,
          event_type: persistedAs,
          severity,
          confidence: Number(input.confidence.toFixed(3)),
          details: enrichedDetails,
        })
        .select('id, event_type')
        .single()
      inserted = retry.data
      insertErr = retry.error
    }

    if (insertErr || !inserted) {
      throw new ExamSessionError(
        `Failed to log proctoring event: ${insertErr?.message ?? 'unknown error'}`,
        500,
        'PROCTOR_INSERT_FAILED'
      )
    }

    // Update non-punitive hardware/browser health metadata for live invigilator visibility
    const hardwarePatch: Record<string, unknown> = {
      ...(sessionRow.hardware_status ?? {}),
      lastProctorSignalType: input.eventType,
      lastProctorSignalAt: new Date().toISOString(),
    }

    if (isCameraEvent) {
      const cameraOperational =
        input.eventType !== 'CAMERA_DISCONNECTED' &&
        input.eventType !== 'CAMERA_PERMISSION_DENIED'
      hardwarePatch.camera = cameraOperational
      hardwarePatch.webcamReady = cameraOperational
    } else if (isAudioEvent) {
      const micOperational =
        input.eventType !== 'MICROPHONE_DISCONNECTED' &&
        input.eventType !== 'MICROPHONE_PERMISSION_DENIED'
      hardwarePatch.microphone = micOperational
      hardwarePatch.microphoneReady = micOperational
    } else if (input.eventType === 'FULLSCREEN_EXIT') {
      hardwarePatch.fullscreen = false
    }

    await supabaseAdmin
      .from('exam_sessions')
      .update({
        hardware_status: hardwarePatch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionRow.id)
      .eq('student_id', actor.userId)
      .eq('tenant_id', actor.tenantId)

    return {
      recorded: true,
      deduplicated: false,
      storage: 'proctor_events',
      eventId: inserted.id,
      eventType: input.eventType,
      persistedAs: inserted.event_type,
      advisoryOnly: true,
    }
  }
}
