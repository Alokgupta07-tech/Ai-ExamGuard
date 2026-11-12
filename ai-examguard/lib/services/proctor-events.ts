import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRoleActor } from '@/lib/services/dashboard'
import { ExamSessionError } from '@/lib/services/exam-session'
import {
  buildEventExplanation,
  deriveAuthoritativeEventSpec,
  evaluateSessionRiskAndCorrelations,
  mapRowToCanonicalEvent,
  normalizeEventTypeName,
  resolveAuthoritativeSourceModule,
  resolveEventOrigin,
  resolveLogicalEventType,
  validateEventTimestamp,
  type RawProctorEventRow,
  type RiskInputEvent,
} from '@/lib/proctoring/risk-engine'
import { extractRequestMeta } from '@/lib/utils/request-meta'
import { WarningPolicyEngine, type EvaluateWarningResult } from '@/lib/proctoring/warning-engine'
import {
  assertNoRawFramePayload,
  eventReviewUpdateSchema,
  proctorEventPayloadSchema,
  simulateDemoEventSchema,
  type ProctorEventInput,
} from '@/lib/validators/proctor-events'
import type { EventType } from '@/types/database'
import type {
  ProctorEventView,
  ReviewActionHistoryEntry,
  ReviewCaseView,
  SessionView,
} from '@/types/dashboard'
import type {
  CanonicalMonitoringEvent,
  EventReviewStatus,
  ProctorMonitoringEventType,
  RiskCategory,
  SessionRiskAssessment,
} from '@/types/proctoring'

export { mapRowToCanonicalEvent, resolveLogicalEventType, type RawProctorEventRow }

type RequestMetadata = ReturnType<typeof extractRequestMeta>

const uuidSchema = z.string().uuid()
const DEDUP_WINDOW_MS = 10_000

const LEGACY_ENUM_FALLBACK: Record<ProctorMonitoringEventType, EventType> = {
  FACE_NOT_VISIBLE: 'NO_FACE_DETECTED',
  MULTIPLE_FACES_DETECTED: 'MULTIPLE_FACES_DETECTED',
  FACE_OBSTRUCTED: 'FACE_OCCLUDED',
  CAMERA_DISCONNECTED: 'FACE_OCCLUDED',
  CAMERA_PERMISSION_DENIED: 'FACE_OCCLUDED',
  PHONE_DETECTED: 'PHONE_DETECTED',
  MULTIPLE_DEVICES_DETECTED: 'MULTIPLE_DEVICES_DETECTED',
  OBJECT_DETECTION_UNAVAILABLE: 'OBJECT_DETECTION_UNAVAILABLE',
  ADDITIONAL_PERSON_DETECTED: 'ADDITIONAL_PERSON_DETECTED',
  HEAD_MOVEMENT_OBSERVED: 'HEAD_MOVEMENT_OBSERVED',
  PROLONGED_OFFSCREEN_GAZE: 'PROLONGED_OFFSCREEN_GAZE',
  REPEATED_HEAD_DEVIATION: 'REPEATED_HEAD_DEVIATION',
  GAZE_ESTIMATION_UNAVAILABLE: 'GAZE_ESTIMATION_UNAVAILABLE',
  AUDIO_ACTIVITY: 'AUDIO_ANOMALY',
  SPEECH_ACTIVITY_DETECTED: 'SPEECH_ACTIVITY_DETECTED',
  SUSTAINED_SPEECH_ACTIVITY: 'SUSTAINED_SPEECH_ACTIVITY',
  MICROPHONE_DISCONNECTED: 'AUDIO_ANOMALY',
  MICROPHONE_PERMISSION_DENIED: 'AUDIO_ANOMALY',
  TAB_HIDDEN: 'TAB_SWITCH',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  SESSION_CONNECTION_INTERRUPTED: 'WINDOW_BLUR',
}

export interface RecordProctorEventResult {
  recorded: boolean
  deduplicated: boolean
  dedupReason?: 'CLIENT_EVENT_UUID_EXISTS' | 'COOLDOWN_WINDOW_ACTIVE'
  storage: 'proctor_events' | 'audit_logs'
  eventId: string | null
  clientEventId: string
  eventType: ProctorMonitoringEventType
  persistedAs: string | null
  canonicalEvent?: CanonicalMonitoringEvent
  riskAssessment?: SessionRiskAssessment
  realtimeNotified: boolean
  advisoryOnly: true
  warningEvaluation?: EvaluateWarningResult
}

async function emitRealtimeMonitoringNotification(
  tenantId: string,
  event: CanonicalMonitoringEvent,
  assessment?: SessionRiskAssessment | null
): Promise<boolean> {
  const channel = supabaseAdmin.channel(`monitoring:tenant:${tenantId}`)
  try {
    const res = await channel.httpSend('monitoring_event', {
      eventId: event.eventId,
      clientEventId: event.clientEventId,
      examId: event.examId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      sourceModule: event.sourceModule,
      eventOrigin: event.eventOrigin,
      isSimulated: event.isSimulated,
      severity: event.severity,
      riskCategory: assessment?.riskCategory ?? 'NORMAL',
      riskScore: assessment?.riskScore ?? 0,
      trustScore: assessment?.trustScore ?? 100,
      explanation: event.explanation,
      timestamp: event.timestamp,
      reviewStatus: event.reviewStatus,
    })
    return Boolean(res && res.success !== false)
  } catch {
    return false
  } finally {
    await supabaseAdmin.removeChannel(channel).catch(() => {})
  }
}

function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    Boolean(err.message && /column .* does not exist|Could not find .* column/i.test(err.message))
  )
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
    const serverNowMs = Date.now()
    const durationMs = input.durationMs ?? input.sustainedDurationMs ?? null
    const mergedMetadata: Record<string, unknown> = {
      ...(input.details ?? {}),
      ...(input.metadata ?? {}),
    }

    // Verify exam exists in student's university (tenant)
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
      started_at: string | null
      hardware_status: Record<string, unknown> | null
    } | null = null

    if (input.sessionId) {
      const { data, error } = await supabaseAdmin
        .from('exam_sessions')
        .select('id, student_id, exam_id, tenant_id, status, started_at, hardware_status')
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
        started_at: data.started_at,
        hardware_status: (data.hardware_status as Record<string, unknown> | null) ?? null,
      }
    } else {
      const { data } = await supabaseAdmin
        .from('exam_sessions')
        .select('id, status, started_at, hardware_status')
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
          started_at: data.started_at,
          hardware_status: (data.hardware_status as Record<string, unknown> | null) ?? null,
        }
      }
    }

    // Validate client timestamp against server clock and session start
    const sessionStartMs =
      sessionRow?.started_at ? Date.parse(sessionRow.started_at) : null
    const tsValidation = validateEventTimestamp(
      input.timestamp,
      serverNowMs,
      input.context === 'active_exam' ? sessionStartMs : null
    )
    if (!tsValidation.valid) {
      throw new ExamSessionError(
        tsValidation.errorMessage ?? 'Invalid monitoring event timestamp.',
        400,
        tsValidation.errorCode ?? 'INVALID_TIMESTAMP'
      )
    }

    // Treat client severity and confidence strictly as untrusted inputs
    const untrustedClientInput = {
      claimedSeverity: input.severity ?? null,
      claimedConfidence: input.confidence ?? null,
      claimedSourceModule: input.sourceModule ?? null,
      rawTimestamp: input.timestamp,
      timestampSkewMs: tsValidation.skewMs,
    }
    const sanitizedConfidence =
      typeof input.confidence === 'number' && Number.isFinite(input.confidence)
        ? Number(Math.min(1, Math.max(0, input.confidence)).toFixed(3))
        : null

    const authoritativeSourceModule = resolveAuthoritativeSourceModule(
      input.eventType,
      input.sourceModule
    )
    const spec = deriveAuthoritativeEventSpec(input.eventType, durationMs, mergedMetadata)

    if (!sessionRow) {
      const [{ data: assignmentRows }, { data: enrollmentRow }] = await Promise.all([
        supabaseAdmin.from('exam_assignments').select('student_id').eq('exam_id', examId),
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
        assignedIds.size > 0 ? assignedIds.has(actor.userId) : Boolean(enrollmentRow)

      if (!isAuthorizedForExam) {
        throw new ExamSessionError('You are not assigned to this examination.', 403, 'NOT_ASSIGNED')
      }

      if (input.context !== 'preflight') {
        throw new ExamSessionError(
          'Active examination session required to log live proctoring events.',
          409,
          'NO_ACTIVE_SESSION'
        )
      }

      const preflightExplanation = buildEventExplanation({
        canonicalType: spec.canonicalType,
        durationMs,
        details: mergedMetadata,
        isContinuationOfEpisode: false,
        correlationsForEvent: [],
      })

      const { data: auditRow, error: auditErr } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          tenant_id: actor.tenantId,
          user_id: actor.userId,
          action: 'VIOLATION_LOGGED',
          entity_type: 'exam',
          entity_id: examId,
          details: {
            clientEventId: input.clientEventId,
            examId,
            phase9EventType: input.eventType,
            phase8EventType: input.eventType,
            sourceModule: authoritativeSourceModule,
            occurredAt: tsValidation.occurredAtIso,
            durationMs,
            modelVersion: input.modelVersion ?? null,
            explanation: preflightExplanation,
            reviewStatus: 'pending_review',
            context: 'preflight',
            advisoryOnly: true,
            severity: spec.severity,
            confidence: sanitizedConfidence,
            untrustedClientInput,
            ...mergedMetadata,
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
        clientEventId: input.clientEventId,
        eventType: input.eventType,
        persistedAs: 'audit_logs:VIOLATION_LOGGED',
        realtimeNotified: false,
        advisoryOnly: true,
      }
    }

    if (sessionRow.status !== 'in_progress' && sessionRow.status !== 'not_started') {
      return {
        recorded: false,
        deduplicated: false,
        storage: 'proctor_events',
        eventId: null,
        clientEventId: input.clientEventId,
        eventType: input.eventType,
        persistedAs: null,
        realtimeNotified: false,
        advisoryOnly: true,
      }
    }

    // Fetch existing session events for client UUID idempotency, cooldown dedup, and temporal correlation
    const { data: sessionEventRows } = await supabaseAdmin
      .from('proctor_events')
      .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
      .eq('session_id', sessionRow.id)
      .eq('tenant_id', actor.tenantId)
      .order('created_at', { ascending: true })
      .limit(250)

    const existingRows = (sessionEventRows ?? []) as RawProctorEventRow[]

    // 1) Idempotent clientEventId check
    const existingByClientId = existingRows.find((row) => {
      const details = row.details
      const embeddedId =
        typeof (details?.canonicalEvent as Record<string, unknown> | undefined)?.clientEventId ===
        'string'
          ? ((details?.canonicalEvent as Record<string, unknown>).clientEventId as string)
          : typeof details?.clientEventId === 'string'
            ? details.clientEventId
            : undefined
      return embeddedId === input.clientEventId
    })

    if (existingByClientId) {
      return {
        recorded: false,
        deduplicated: true,
        dedupReason: 'CLIENT_EVENT_UUID_EXISTS',
        storage: 'proctor_events',
        eventId: existingByClientId.id,
        clientEventId: input.clientEventId,
        eventType: input.eventType,
        persistedAs: existingByClientId.event_type,
        canonicalEvent: mapRowToCanonicalEvent(existingByClientId, examId),
        realtimeNotified: false,
        advisoryOnly: true,
      }
    }

    // 2) Continuous cooldown window deduplication per logical event type
    const incomingCanonicalType = normalizeEventTypeName(input.eventType)
    const duplicateInWindow = [...existingRows].reverse().find((row) => {
      const rowCanonical = normalizeEventTypeName(resolveLogicalEventType(row))
      if (rowCanonical !== incomingCanonicalType) return false
      const rowTimeIso =
        typeof (row.details?.canonicalEvent as Record<string, unknown> | undefined)?.timestamp ===
        'string'
          ? ((row.details?.canonicalEvent as Record<string, unknown>).timestamp as string)
          : row.created_at
      const rowMs = Date.parse(rowTimeIso)
      if (!Number.isFinite(rowMs)) return false
      return Math.abs(tsValidation.occurredAtMs - rowMs) <= DEDUP_WINDOW_MS
    })

    if (duplicateInWindow) {
      return {
        recorded: false,
        deduplicated: true,
        dedupReason: 'COOLDOWN_WINDOW_ACTIVE',
        storage: 'proctor_events',
        eventId: duplicateInWindow.id,
        clientEventId: input.clientEventId,
        eventType: input.eventType,
        persistedAs: duplicateInWindow.event_type,
        canonicalEvent: mapRowToCanonicalEvent(duplicateInWindow, examId),
        realtimeNotified: false,
        advisoryOnly: true,
      }
    }

    // 3) Evaluate temporal correlation + episode-coalesced risk + human-readable explanation
    const priorRiskInputs: RiskInputEvent[] = existingRows.map((row) => {
      const mapped = mapRowToCanonicalEvent(row, examId)
      return {
        eventId: mapped.eventId,
        eventType: mapped.eventType,
        occurredAt: mapped.timestamp,
        durationMs: mapped.durationMs,
        details: row.details,
      }
    })

    const ingestedAtIso = new Date(serverNowMs).toISOString()
    const tempIncomingId = `pending:${input.clientEventId}`

    const riskEval = evaluateSessionRiskAndCorrelations({
      sessionId: sessionRow.id,
      examId,
      universityId: actor.tenantId,
      priorEvents: priorRiskInputs,
      incomingEvent: {
        eventId: tempIncomingId,
        eventType: input.eventType,
        occurredAt: tsValidation.occurredAtIso,
        durationMs,
        details: {
          ...mergedMetadata,
          sourceModule: authoritativeSourceModule,
        },
      },
      nowIso: ingestedAtIso,
    })

    const isCameraEvent = authoritativeSourceModule === 'mediapipe_face'
    const isAudioEvent = authoritativeSourceModule === 'web_audio'
    const { eventOrigin, isSimulated } = resolveEventOrigin(
      authoritativeSourceModule,
      mergedMetadata
    )

    const canonicalDraft: Omit<CanonicalMonitoringEvent, 'eventId'> = {
      clientEventId: input.clientEventId,
      universityId: actor.tenantId,
      examId,
      sessionId: sessionRow.id,
      eventType: input.eventType,
      sourceModule: authoritativeSourceModule,
      eventOrigin,
      isSimulated,
      timestamp: tsValidation.occurredAtIso,
      ingestedAt: ingestedAtIso,
      durationMs,
      modelVersion: input.modelVersion ?? null,
      confidence: sanitizedConfidence,
      severity: riskEval.incomingAuthoritativeSpec.severity,
      explanation: riskEval.incomingEventExplanation,
      reviewStatus: 'pending_review',
      metadata: {
        ...mergedMetadata,
        context: input.context,
        untrustedClientInput,
        correlations: riskEval.incomingCorrelations.map((c) => ({
          ruleId: c.ruleId,
          title: c.title,
          windowSeconds: c.windowSeconds,
        })),
      },
    }

    const enrichedDetails: Record<string, unknown> = {
      ...(isCameraEvent
        ? { phase8EventType: input.eventType }
        : { phase9EventType: input.eventType }),
      clientEventId: input.clientEventId,
      examId,
      sourceModule: authoritativeSourceModule,
      occurredAt: tsValidation.occurredAtIso,
      durationMs,
      modelVersion: input.modelVersion ?? null,
      explanation: riskEval.incomingEventExplanation,
      reviewStatus: 'pending_review',
      context: input.context,
      advisoryOnly: true,
      untrustedClientInput,
      canonicalEvent: canonicalDraft,
      serverRiskEvaluation: {
        riskCategory: riskEval.assessment.riskCategory,
        riskScore: riskEval.assessment.riskScore,
        trustScore: riskEval.assessment.trustScore,
        episodeCount: riskEval.assessment.episodeCount,
        suppressTrustPenalty: riskEval.incomingIsContinuation,
        correlations: riskEval.assessment.correlations,
        contextualIndicators: riskEval.assessment.contextualIndicators,
      },
      ...mergedMetadata,
    }

    const baseInsert = {
      session_id: sessionRow.id,
      tenant_id: actor.tenantId,
      event_type: input.eventType as EventType,
      severity: riskEval.incomingAuthoritativeSpec.severity,
      confidence: sanitizedConfidence,
      details: enrichedDetails,
    }

    const extendedInsert = {
      ...baseInsert,
      client_event_id: input.clientEventId,
      exam_id: examId,
      source_module: authoritativeSourceModule,
      occurred_at: tsValidation.occurredAtIso,
      duration_ms: durationMs,
      model_version: input.modelVersion ?? null,
      explanation: riskEval.incomingEventExplanation,
      review_status: 'pending_review',
    }

    let persistedAs: EventType = input.eventType
    let useExtendedColumns = true
    let { data: inserted, error: insertErr } = await supabaseAdmin
      .from('proctor_events')
      .insert(extendedInsert)
      .select('id, event_type, created_at')
      .single()

    if (isMissingColumnError(insertErr)) {
      useExtendedColumns = false
      const fallbackInsert = await supabaseAdmin
        .from('proctor_events')
        .insert(baseInsert)
        .select('id, event_type, created_at')
        .single()
      inserted = fallbackInsert.data
      insertErr = fallbackInsert.error
    }

    if (insertErr && insertErr.code === '22P02') {
      persistedAs = LEGACY_ENUM_FALLBACK[input.eventType]
      const retryPayload = useExtendedColumns
        ? { ...extendedInsert, event_type: persistedAs }
        : { ...baseInsert, event_type: persistedAs }
      const retry = await supabaseAdmin
        .from('proctor_events')
        .insert(retryPayload)
        .select('id, event_type, created_at')
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

    const canonicalEvent: CanonicalMonitoringEvent = {
      ...canonicalDraft,
      eventId: inserted.id,
      ingestedAt: inserted.created_at,
    }

    // Replace temporary pending event ID inside assessment correlations if present
    const finalizedAssessment: SessionRiskAssessment = {
      ...riskEval.assessment,
      correlations: riskEval.assessment.correlations.map((c) => ({
        ...c,
        eventIds: c.eventIds.map((id) => (id === tempIncomingId ? inserted.id : id)),
      })),
    }

    // Update session non-punitive hardware health + episode-coalesced risk & trust score
    const hardwarePatch: Record<string, unknown> = {
      ...(sessionRow.hardware_status ?? {}),
      lastProctorSignalType: input.eventType,
      lastProctorSignalAt: ingestedAtIso,
      riskAssessment: finalizedAssessment,
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

    const baseSessionUpdate = {
      trust_score: finalizedAssessment.trustScore,
      hardware_status: hardwarePatch,
      updated_at: ingestedAtIso,
    }

    const { error: sessUpErr } = await supabaseAdmin
      .from('exam_sessions')
      .update({
        ...baseSessionUpdate,
        risk_category: finalizedAssessment.riskCategory,
        risk_score: finalizedAssessment.riskScore,
        risk_summary: finalizedAssessment,
      })
      .eq('id', sessionRow.id)
      .eq('student_id', actor.userId)
      .eq('tenant_id', actor.tenantId)

    if (isMissingColumnError(sessUpErr)) {
      await supabaseAdmin
        .from('exam_sessions')
        .update(baseSessionUpdate)
        .eq('id', sessionRow.id)
        .eq('student_id', actor.userId)
        .eq('tenant_id', actor.tenantId)
    }

    // Advisory review case upsert (never terminates session or auto-declares cheating)
    if (
      finalizedAssessment.riskCategory === 'REVIEW_SUGGESTED' ||
      finalizedAssessment.riskCategory === 'PRIORITY_REVIEW'
    ) {
      const desiredPriority = finalizedAssessment.riskCategory === 'PRIORITY_REVIEW' ? 1 : 4
      const { data: existingCase } = await supabaseAdmin
        .from('review_cases')
        .select('id, status, priority')
        .eq('session_id', sessionRow.id)
        .maybeSingle()

      if (!existingCase) {
        await supabaseAdmin.from('review_cases').insert({
          session_id: sessionRow.id,
          tenant_id: actor.tenantId,
          status: 'pending',
          priority: desiredPriority,
          summary: finalizedAssessment.summaryExplanation,
        })
      } else if (existingCase.status !== 'cleared' || finalizedAssessment.riskCategory === 'PRIORITY_REVIEW') {
        await supabaseAdmin
          .from('review_cases')
          .update({
            priority: Math.min(existingCase.priority ?? 5, desiredPriority),
            summary: finalizedAssessment.summaryExplanation,
          })
          .eq('id', existingCase.id)
      }
    }

    const realtimeNotified = await emitRealtimeMonitoringNotification(
      actor.tenantId,
      canonicalEvent,
      finalizedAssessment
    )

    // Evaluate 3-strike warning policy for active student exam sessions
    const warningEvaluation = await WarningPolicyEngine.evaluateAndApplyStrike({
      sessionId: sessionRow.id,
      examId,
      studentId: actor.userId,
      tenantId: actor.tenantId,
      eventType: input.eventType,
      reason: riskEval.incomingEventExplanation,
      confidence: sanitizedConfidence,
      details: enrichedDetails,
    }).catch(() => undefined)

    return {
      recorded: true,
      deduplicated: false,
      storage: 'proctor_events',
      eventId: inserted.id,
      clientEventId: input.clientEventId,
      eventType: input.eventType,
      persistedAs: inserted.event_type,
      canonicalEvent,
      riskAssessment: finalizedAssessment,
      realtimeNotified,
      advisoryOnly: true,
      warningEvaluation,
    }
  }

  static async getTenantEventHistory(filters: {
    examId?: string | null
    sessionId?: string | null
    riskCategory?: RiskCategory | null
    reviewStatus?: EventReviewStatus | null
    limit?: number
  }): Promise<{
    events: CanonicalMonitoringEvent[]
    riskAssessments: SessionRiskAssessment[]
    totalCount: number
  }> {
    const actor = await requireRoleActor(['invigilator', 'instructor', 'admin'])
    const limit = Math.min(200, Math.max(1, filters.limit ?? 100))

    let sessionsQuery = supabaseAdmin
      .from('exam_sessions')
      .select('id, exam_id, tenant_id, hardware_status')
      .eq('tenant_id', actor.tenantId)

    if (filters.examId && uuidSchema.safeParse(filters.examId).success) {
      sessionsQuery = sessionsQuery.eq('exam_id', filters.examId)
    }
    if (filters.sessionId && uuidSchema.safeParse(filters.sessionId).success) {
      sessionsQuery = sessionsQuery.eq('id', filters.sessionId)
    }

    const { data: sessRows, error: sessErr } = await sessionsQuery
    if (sessErr) {
      throw new ExamSessionError(
        `Failed to query tenant sessions: ${sessErr.message}`,
        500,
        'EVENT_HISTORY_QUERY_FAILED'
      )
    }

    const sessions = (sessRows ?? []) as Array<{
      id: string
      exam_id: string
      tenant_id: string
      hardware_status: Record<string, unknown> | null
    }>

    if (sessions.length === 0) {
      return { events: [], riskAssessments: [], totalCount: 0 }
    }

    const sessionToExamMap = new Map(sessions.map((s) => [s.id, s.exam_id]))
    const sessionIds = sessions.map((s) => s.id)

    const { data: rawEvents, error: evErr } = await supabaseAdmin
      .from('proctor_events')
      .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
      .eq('tenant_id', actor.tenantId)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (evErr) {
      throw new ExamSessionError(
        `Failed to query event history: ${evErr.message}`,
        500,
        'EVENT_HISTORY_QUERY_FAILED'
      )
    }

    const mappedEvents = ((rawEvents ?? []) as RawProctorEventRow[]).map((row) =>
      mapRowToCanonicalEvent(row, sessionToExamMap.get(row.session_id) ?? '')
    )

    // Group events by session to compute deterministic SessionRiskAssessment
    const eventsBySession = new Map<string, CanonicalMonitoringEvent[]>()
    for (const ev of mappedEvents) {
      const arr = eventsBySession.get(ev.sessionId) ?? []
      arr.push(ev)
      eventsBySession.set(ev.sessionId, arr)
    }

    const riskAssessments: SessionRiskAssessment[] = []
    const allowedSessionIds = new Set<string>()

    for (const sess of sessions) {
      const sessEvents = eventsBySession.get(sess.id) ?? []
      const evalRes = evaluateSessionRiskAndCorrelations({
        sessionId: sess.id,
        examId: sess.exam_id,
        universityId: sess.tenant_id,
        priorEvents: sessEvents.map((e) => ({
          eventId: e.eventId,
          eventType: e.eventType,
          occurredAt: e.timestamp,
          durationMs: e.durationMs,
          details: e.metadata,
        })),
      })

      if (!filters.riskCategory || evalRes.assessment.riskCategory === filters.riskCategory) {
        riskAssessments.push(evalRes.assessment)
        allowedSessionIds.add(sess.id)
      }
    }

    const filteredEvents = mappedEvents.filter((ev) => {
      if (filters.riskCategory && !allowedSessionIds.has(ev.sessionId)) return false
      if (filters.reviewStatus && ev.reviewStatus !== filters.reviewStatus) return false
      return true
    })

    return {
      events: filteredEvents,
      riskAssessments,
      totalCount: filteredEvents.length,
    }
  }

  static async updateEventReviewStatus(
    eventId: string,
    rawBody: unknown,
    meta: RequestMetadata
  ): Promise<CanonicalMonitoringEvent> {
    if (!uuidSchema.safeParse(eventId).success) {
      throw new ExamSessionError('Invalid monitoring event identifier.', 400, 'INVALID_EVENT_ID')
    }

    const parsed = eventReviewUpdateSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new ExamSessionError(
        parsed.error.issues[0]?.message ?? 'Invalid review status payload.',
        400,
        'INVALID_REVIEW_PAYLOAD'
      )
    }

    const actor = await requireRoleActor(['invigilator', 'instructor', 'admin'])

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('proctor_events')
      .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
      .eq('id', eventId)
      .eq('tenant_id', actor.tenantId)
      .maybeSingle()

    if (fetchErr || !row) {
      throw new ExamSessionError('Monitoring event not found in your institution.', 404, 'EVENT_NOT_FOUND')
    }

    const typedRow = row as RawProctorEventRow
    const details = { ...(typedRow.details ?? {}) }
    const canonical = (details.canonicalEvent as Record<string, unknown> | undefined) ?? {}
    const reviewedAtIso = new Date().toISOString()
    const cleanNote = parsed.data.reviewNote?.trim() || null
    const existingHistory = Array.isArray(details.reviewHistory)
      ? (details.reviewHistory as Array<Record<string, unknown>>)
      : []

    const nextHistory = [
      ...existingHistory,
      {
        reviewStatus: parsed.data.reviewStatus,
        reviewerId: actor.userId,
        reviewerName: actor.fullName,
        reviewNote: cleanNote,
        escalated: Boolean(parsed.data.escalate || parsed.data.reviewStatus === 'flagged'),
        reviewedAt: reviewedAtIso,
      },
    ]

    details.reviewStatus = parsed.data.reviewStatus
    details.reviewedBy = actor.userId
    details.reviewedByName = actor.fullName
    details.reviewedAt = reviewedAtIso
    details.reviewHistory = nextHistory
    if (cleanNote !== null) details.reviewNote = cleanNote
    details.canonicalEvent = {
      ...canonical,
      reviewStatus: parsed.data.reviewStatus,
      reviewedBy: actor.userId,
      reviewedAt: reviewedAtIso,
      reviewNote: cleanNote ?? canonical.reviewNote ?? null,
    }

    let { error: updateErr } = await supabaseAdmin
      .from('proctor_events')
      .update({
        review_status: parsed.data.reviewStatus,
        details,
      })
      .eq('id', eventId)
      .eq('tenant_id', actor.tenantId)

    if (isMissingColumnError(updateErr)) {
      const retry = await supabaseAdmin
        .from('proctor_events')
        .update({ details })
        .eq('id', eventId)
        .eq('tenant_id', actor.tenantId)
      updateErr = retry.error
    }

    if (updateErr) {
      throw new ExamSessionError(
        `Failed to update event review status: ${updateErr.message}`,
        500,
        'EVENT_REVIEW_UPDATE_FAILED'
      )
    }

    // Escalate or synchronize review case & log review_actions trail in Postgres
    const shouldEscalate = Boolean(parsed.data.escalate || parsed.data.reviewStatus === 'flagged')
    const shouldLogDismissal = parsed.data.reviewStatus === 'dismissed'
    if (shouldEscalate || shouldLogDismissal) {
      const { data: existingCase } = await supabaseAdmin
        .from('review_cases')
        .select('id, status')
        .eq('session_id', typedRow.session_id)
        .eq('tenant_id', actor.tenantId)
        .maybeSingle()

      if (shouldEscalate) {
        let caseId = existingCase?.id ?? null
        if (!caseId) {
          const { data: insertedCase } = await supabaseAdmin
            .from('review_cases')
            .insert({
              session_id: typedRow.session_id,
              tenant_id: actor.tenantId,
              assigned_to: actor.userId,
              status: 'escalated',
              priority: 1,
              summary:
                cleanNote ??
                `Invigilator escalated ${resolveLogicalEventType(typedRow).replace(/_/g, ' ')} for formal review.`,
              reviewed_at: reviewedAtIso,
            })
            .select('id')
            .maybeSingle()
          caseId = insertedCase?.id ?? null
        } else {
          await supabaseAdmin
            .from('review_cases')
            .update({
              status: 'escalated',
              priority: 1,
              assigned_to: actor.userId,
              reviewed_at: reviewedAtIso,
            })
            .eq('id', caseId)
        }

        if (caseId) {
          await supabaseAdmin.from('review_actions').insert({
            review_case_id: caseId,
            session_id: typedRow.session_id,
            reviewer_id: actor.userId,
            action_type: 'CASE_ESCALATED',
            message:
              cleanNote ??
              `Escalated event ${resolveLogicalEventType(typedRow).replace(/_/g, ' ')} from Invigilator Command Centre.`,
          })
        }
      } else if (existingCase?.id && shouldLogDismissal) {
        await supabaseAdmin.from('review_actions').insert({
          review_case_id: existingCase.id,
          session_id: typedRow.session_id,
          reviewer_id: actor.userId,
          action_type: 'MANUAL_FLAG_REMOVED',
          message:
            cleanNote ??
            `Dismissed event ${resolveLogicalEventType(typedRow).replace(/_/g, ' ')} after invigilator inspection.`,
        })
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'REVIEW_ACTION_TAKEN',
      entity_type: 'proctor_event',
      entity_id: eventId,
      details: {
        reviewStatus: parsed.data.reviewStatus,
        reviewNote: cleanNote,
        escalated: shouldEscalate,
        sessionId: typedRow.session_id,
      },
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    })

    const updatedCanonical = mapRowToCanonicalEvent({ ...typedRow, details })
    await emitRealtimeMonitoringNotification(actor.tenantId, updatedCanonical, null)
    return updatedCanonical
  }

  static async getSessionMonitoringDetail(sessionId: string): Promise<{
    session: SessionView
    events: ProctorEventView[]
    reviewCase: ReviewCaseView | null
    reviewActions: ReviewActionHistoryEntry[]
  }> {
    if (!uuidSchema.safeParse(sessionId).success) {
      throw new ExamSessionError('Invalid examination session identifier.', 400, 'INVALID_SESSION_ID')
    }

    const actor = await requireRoleActor(['invigilator', 'instructor', 'admin'])

    let { data: sessionRow, error: sessErr } = await supabaseAdmin
      .from('exam_sessions')
      .select(
        'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, warning_count, max_warnings, auto_submitted, auto_submission_reason, created_at'
      )
      .eq('id', sessionId)
      .eq('tenant_id', actor.tenantId)
      .maybeSingle()

    if (isMissingColumnError(sessErr)) {
      const fallback = await supabaseAdmin
        .from('exam_sessions')
        .select(
          'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at'
        )
        .eq('id', sessionId)
        .eq('tenant_id', actor.tenantId)
        .maybeSingle()
      sessionRow = fallback.data as typeof sessionRow
      sessErr = fallback.error
    }

    if (sessErr || !sessionRow) {
      throw new ExamSessionError('Candidate session not found in your institution.', 404, 'SESSION_NOT_FOUND')
    }

    const [{ data: examRow }, { data: studentProfile }, { data: rawEvents }, { data: rcRow }, { data: questionRows }, { data: answerRows }] =
      await Promise.all([
        supabaseAdmin
          .from('exams')
          .select('id, title, course_id, duration_minutes, end_time')
          .eq('id', sessionRow.exam_id)
          .maybeSingle(),
        supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', sessionRow.student_id)
          .maybeSingle(),
        supabaseAdmin
          .from('proctor_events')
          .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
          .eq('session_id', sessionId)
          .eq('tenant_id', actor.tenantId)
          .order('created_at', { ascending: false })
          .limit(500),
        supabaseAdmin
          .from('review_cases')
          .select('id, session_id, assigned_to, status, priority, summary, created_at, reviewed_at')
          .eq('session_id', sessionId)
          .eq('tenant_id', actor.tenantId)
          .maybeSingle(),
        supabaseAdmin.from('questions').select('id').eq('exam_id', sessionRow.exam_id),
        supabaseAdmin.from('session_answers').select('id').eq('session_id', sessionId),
      ])

    const courseRow = examRow?.course_id
      ? (
          await supabaseAdmin
            .from('courses')
            .select('code, name')
            .eq('id', examRow.course_id)
            .maybeSingle()
        ).data
      : null

    const { data: rawActions } = await supabaseAdmin
      .from('review_actions')
      .select('id, review_case_id, session_id, reviewer_id, action_type, message, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(100)

    const reviewerIds = Array.from(
      new Set(((rawActions ?? []) as { reviewer_id: string }[]).map((a) => a.reviewer_id))
    )
    const { data: reviewerProfiles } =
      reviewerIds.length > 0
        ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', reviewerIds)
        : { data: [] }

    const reviewerMap = new Map<string, string>(
      ((reviewerProfiles ?? []) as { id: string; full_name: string | null }[]).map((p) => [
        p.id,
        p.full_name || 'Invigilator',
      ])
    )

    const canonicalList = ((rawEvents ?? []) as RawProctorEventRow[]).map((r) =>
      mapRowToCanonicalEvent(r, sessionRow.exam_id)
    )

    const events: ProctorEventView[] = canonicalList.map((c) => ({
      id: c.eventId,
      clientEventId: c.clientEventId,
      universityId: c.universityId,
      examId: c.examId,
      sessionId: c.sessionId,
      examTitle: examRow?.title || 'Examination',
      studentName: studentProfile?.full_name || 'Candidate',
      eventType: c.eventType as EventType,
      sourceModule: c.sourceModule,
      eventOrigin: c.eventOrigin,
      isSimulated: c.isSimulated,
      severity: c.severity,
      confidence: c.confidence,
      occurredAt: c.timestamp,
      durationMs: c.durationMs,
      modelVersion: c.modelVersion,
      explanation: c.explanation,
      reviewStatus: c.reviewStatus,
      reviewNote: c.reviewNote ?? null,
      reviewedAt: c.reviewedAt ?? null,
      reviewedBy: c.reviewedBy ?? null,
      details: c.metadata,
      createdAt: c.ingestedAt,
    }))

    const evalRes = evaluateSessionRiskAndCorrelations({
      sessionId: sessionRow.id,
      examId: sessionRow.exam_id,
      universityId: sessionRow.tenant_id,
      priorEvents: events.map((ev) => ({
        eventId: ev.id,
        eventType: ev.eventType,
        occurredAt: ev.occurredAt,
        durationMs: ev.durationMs,
        details: ev.details,
      })),
    })

    const session: SessionView = {
      id: sessionRow.id,
      examId: sessionRow.exam_id,
      examTitle: examRow?.title || 'Examination',
      courseCode: courseRow?.code || 'COURSE',
      studentId: sessionRow.student_id,
      studentName: studentProfile?.full_name || 'Candidate',
      studentEmail: studentProfile?.email || 'N/A',
      status: sessionRow.status,
      startedAt: sessionRow.started_at,
      submittedAt: sessionRow.submitted_at,
      durationMinutes: examRow?.duration_minutes ?? undefined,
      endTime: examRow?.end_time ?? null,
      answeredCount: (answerRows ?? []).length,
      totalQuestionCount: (questionRows ?? []).length,
      score: sessionRow.score !== null ? Number(sessionRow.score) : null,
      trustScore: Number(sessionRow.trust_score ?? evalRes.assessment.trustScore ?? 100),
      riskCategory: evalRes.assessment.riskCategory,
      riskScore: evalRes.assessment.riskScore,
      riskAssessment: evalRes.assessment,
      hardwareStatus:
        (sessionRow.hardware_status as SessionView['hardwareStatus'] | null) ?? {},
      warningCount: ((sessionRow as unknown as Record<string, unknown>).warning_count as number | null) ?? 0,
      maxWarnings: ((sessionRow as unknown as Record<string, unknown>).max_warnings as number | null) ?? 3,
      autoSubmitted: Boolean((sessionRow as unknown as Record<string, unknown>).auto_submitted),
      autoSubmissionReason: ((sessionRow as unknown as Record<string, unknown>).auto_submission_reason as string | null) ?? null,
      createdAt: sessionRow.created_at,
    }

    const reviewCase: ReviewCaseView | null = rcRow
      ? {
          id: rcRow.id,
          sessionId: rcRow.session_id,
          examTitle: session.examTitle,
          courseCode: session.courseCode,
          studentId: session.studentId,
          studentName: session.studentName,
          studentEmail: session.studentEmail,
          status: rcRow.status,
          priority: rcRow.priority,
          trustScore: session.trustScore,
          riskCategory: session.riskCategory,
          riskScore: session.riskScore,
          riskAssessment: session.riskAssessment,
          summary: rcRow.summary || evalRes.assessment.summaryExplanation,
          assignedTo: rcRow.assigned_to,
          createdAt: rcRow.created_at,
          reviewedAt: rcRow.reviewed_at,
          events,
        }
      : null

    const reviewActions: ReviewActionHistoryEntry[] = (
      (rawActions ?? []) as {
        id: string
        review_case_id: string
        session_id: string
        reviewer_id: string
        action_type: ReviewActionHistoryEntry['actionType']
        message: string | null
        created_at: string
      }[]
    ).map((a) => ({
      id: a.id,
      reviewCaseId: a.review_case_id,
      sessionId: a.session_id,
      reviewerId: a.reviewer_id,
      reviewerName: reviewerMap.get(a.reviewer_id) ?? 'Invigilator',
      actionType: a.action_type,
      message: a.message,
      createdAt: a.created_at,
    }))

    return { session, events, reviewCase, reviewActions }
  }

  static async createSimulatedDemoEvent(
    rawBody: unknown,
    meta: RequestMetadata
  ): Promise<{ event: CanonicalMonitoringEvent; realtimeNotified: boolean }> {
    const parsed = simulateDemoEventSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new ExamSessionError(
        parsed.error.issues[0]?.message ?? 'Invalid simulated event request.',
        400,
        'INVALID_SIMULATE_PAYLOAD'
      )
    }

    const actor = await requireRoleActor(['invigilator', 'instructor', 'admin'])
    const { data: sessRow, error: sessErr } = await supabaseAdmin
      .from('exam_sessions')
      .select('id, exam_id, tenant_id')
      .eq('id', parsed.data.sessionId)
      .eq('tenant_id', actor.tenantId)
      .maybeSingle()

    if (sessErr || !sessRow) {
      throw new ExamSessionError('Candidate session not found in your institution.', 404, 'SESSION_NOT_FOUND')
    }

    const nowIso = new Date().toISOString()
    const clientEventId = randomUUID()
    const durationMs = 12_000
    const spec = deriveAuthoritativeEventSpec(parsed.data.eventType, durationMs, null)
    const explanation = `[SIMULATED DEMO] ${buildEventExplanation({
      canonicalType: spec.canonicalType,
      durationMs,
      details: null,
      isContinuationOfEpisode: false,
      correlationsForEvent: [],
    })} Triggered by ${actor.fullName} for command-centre verification.`

    const details: Record<string, unknown> = {
      isSimulated: true,
      eventOrigin: 'simulated_demo',
      simulationTriggeredBy: actor.userId,
      simulationTriggeredByName: actor.fullName,
      clientEventId,
      examId: sessRow.exam_id,
      sourceModule: spec.sourceModule,
      occurredAt: nowIso,
      durationMs,
      modelVersion: 'simulation-harness-v1',
      explanation,
      reviewStatus: 'pending_review',
      phase9EventType: parsed.data.eventType,
      serverRiskEvaluation: {
        suppressTrustPenalty: true,
      },
      canonicalEvent: {
        clientEventId,
        universityId: actor.tenantId,
        examId: sessRow.exam_id,
        sessionId: sessRow.id,
        eventType: parsed.data.eventType,
        sourceModule: spec.sourceModule,
        eventOrigin: 'simulated_demo',
        isSimulated: true,
        timestamp: nowIso,
        ingestedAt: nowIso,
        durationMs,
        modelVersion: 'simulation-harness-v1',
        confidence: null,
        severity: spec.severity,
        explanation,
        reviewStatus: 'pending_review',
      },
    }

    const baseInsert = {
      session_id: sessRow.id,
      tenant_id: actor.tenantId,
      event_type: parsed.data.eventType as EventType,
      severity: spec.severity,
      confidence: null,
      details,
    }

    const extendedInsert = {
      ...baseInsert,
      client_event_id: clientEventId,
      exam_id: sessRow.exam_id,
      source_module: spec.sourceModule,
      occurred_at: nowIso,
      duration_ms: durationMs,
      model_version: 'simulation-harness-v1',
      explanation,
      review_status: 'pending_review',
    }

    let { data: inserted, error: insErr } = await supabaseAdmin
      .from('proctor_events')
      .insert(extendedInsert)
      .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
      .single()

    if (isMissingColumnError(insErr)) {
      const retry = await supabaseAdmin
        .from('proctor_events')
        .insert(baseInsert)
        .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
        .single()
      inserted = retry.data
      insErr = retry.error
    }

    if (insErr && insErr.code === '22P02') {
      const retry = await supabaseAdmin
        .from('proctor_events')
        .insert({
          ...baseInsert,
          event_type: LEGACY_ENUM_FALLBACK[parsed.data.eventType],
        })
        .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
        .single()
      inserted = retry.data
      insErr = retry.error
    }

    if (insErr || !inserted) {
      throw new ExamSessionError(
        `Failed to create simulated monitoring event: ${insErr?.message ?? 'unknown error'}`,
        500,
        'SIMULATE_EVENT_FAILED'
      )
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'VIOLATION_LOGGED',
      entity_type: 'proctor_event',
      entity_id: inserted.id,
      details: { isSimulated: true, eventType: parsed.data.eventType, sessionId: sessRow.id },
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    })

    const canonical = mapRowToCanonicalEvent(inserted as RawProctorEventRow, sessRow.exam_id)
    const realtimeNotified = await emitRealtimeMonitoringNotification(actor.tenantId, canonical, null)
    return { event: canonical, realtimeNotified }
  }
}
