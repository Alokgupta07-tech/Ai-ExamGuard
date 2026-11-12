import type { EventSeverity, EventType } from '@/types/database'
import type {
  CanonicalMonitoringEvent,
  ContextualRiskIndicator,
  EventOrigin,
  EventReviewStatus,
  EventSourceModule,
  RiskCategory,
  SessionRiskAssessment,
  TemporalCorrelationHit,
} from '@/types/proctoring'

export const MAX_FUTURE_SKEW_MS = 30_000
export const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000
export const PRE_SESSION_TOLERANCE_MS = 5 * 60_000
export const EPISODE_GAP_MS = 90_000
export const CORRELATION_WINDOW_MS = 120_000
export const CLUSTER_WINDOW_MS = 300_000

export interface TimestampValidationResult {
  valid: boolean
  occurredAtIso: string
  occurredAtMs: number
  skewMs: number
  errorCode?: 'INVALID_TIMESTAMP' | 'CLIENT_TIMESTAMP_IN_FUTURE' | 'STALE_EVENT_TIMESTAMP' | 'EVENT_PRECEDES_SESSION'
  errorMessage?: string
}

export function validateEventTimestamp(
  rawTimestamp: string | number | null | undefined,
  serverNowMs: number,
  sessionStartedAtMs?: number | null
): TimestampValidationResult {
  if (rawTimestamp === null || rawTimestamp === undefined || rawTimestamp === '') {
    return {
      valid: false,
      occurredAtIso: new Date(serverNowMs).toISOString(),
      occurredAtMs: serverNowMs,
      skewMs: 0,
      errorCode: 'INVALID_TIMESTAMP',
      errorMessage: 'Monitoring events require a valid occurrence timestamp.',
    }
  }

  const parsedMs =
    typeof rawTimestamp === 'number' ? rawTimestamp : Date.parse(String(rawTimestamp))

  if (!Number.isFinite(parsedMs)) {
    return {
      valid: false,
      occurredAtIso: new Date(serverNowMs).toISOString(),
      occurredAtMs: serverNowMs,
      skewMs: 0,
      errorCode: 'INVALID_TIMESTAMP',
      errorMessage: 'Event timestamp must be a valid ISO-8601 timestamp or epoch millisecond value.',
    }
  }

  const skewMs = parsedMs - serverNowMs
  if (skewMs > MAX_FUTURE_SKEW_MS) {
    return {
      valid: false,
      occurredAtIso: new Date(serverNowMs).toISOString(),
      occurredAtMs: serverNowMs,
      skewMs,
      errorCode: 'CLIENT_TIMESTAMP_IN_FUTURE',
      errorMessage: `Event timestamp is ${Math.round(skewMs / 1000)}s ahead of server clock (max 30s allowed).`,
    }
  }

  if (serverNowMs - parsedMs > MAX_EVENT_AGE_MS) {
    return {
      valid: false,
      occurredAtIso: new Date(serverNowMs).toISOString(),
      occurredAtMs: serverNowMs,
      skewMs,
      errorCode: 'STALE_EVENT_TIMESTAMP',
      errorMessage: 'Event timestamp exceeds the 24-hour ingestion retention window.',
    }
  }

  if (
    typeof sessionStartedAtMs === 'number' &&
    Number.isFinite(sessionStartedAtMs) &&
    parsedMs < sessionStartedAtMs - PRE_SESSION_TOLERANCE_MS
  ) {
    return {
      valid: false,
      occurredAtIso: new Date(serverNowMs).toISOString(),
      occurredAtMs: serverNowMs,
      skewMs,
      errorCode: 'EVENT_PRECEDES_SESSION',
      errorMessage: 'Active-exam monitoring timestamp precedes the authorized session start time.',
    }
  }

  // Clamp minor clock lead (<= 30s) safely to server time so chronological sorting stays consistent
  const safeMs = Math.min(parsedMs, serverNowMs)
  return {
    valid: true,
    occurredAtIso: new Date(safeMs).toISOString(),
    occurredAtMs: safeMs,
    skewMs,
  }
}

export function normalizeEventTypeName(rawType: string): string {
  switch (rawType) {
    case 'NO_FACE_DETECTED':
      return 'FACE_NOT_VISIBLE'
    case 'TAB_SWITCH':
      return 'TAB_HIDDEN'
    case 'AUDIO_ANOMALY':
      return 'AUDIO_ACTIVITY'
    default:
      return rawType
  }
}

export function resolveAuthoritativeSourceModule(
  eventType: string,
  claimedSource?: string | null
): EventSourceModule {
  const normalized = normalizeEventTypeName(eventType)
  if (
    normalized === 'PHONE_DETECTED' ||
    normalized === 'MULTIPLE_DEVICES_DETECTED' ||
    normalized === 'OBJECT_DETECTION_UNAVAILABLE' ||
    normalized === 'ADDITIONAL_PERSON_DETECTED'
  ) {
    return 'object_detector'
  }
  if (
    normalized === 'FACE_NOT_VISIBLE' ||
    normalized === 'MULTIPLE_FACES_DETECTED' ||
    normalized === 'CAMERA_DISCONNECTED' ||
    normalized === 'CAMERA_PERMISSION_DENIED' ||
    normalized === 'FACE_OCCLUDED' ||
    normalized === 'FACE_OBSTRUCTED' ||
    normalized === 'HEAD_MOVEMENT_OBSERVED' ||
    normalized === 'PROLONGED_OFFSCREEN_GAZE' ||
    normalized === 'REPEATED_HEAD_DEVIATION' ||
    normalized === 'GAZE_ESTIMATION_UNAVAILABLE'
  ) {
    return 'mediapipe_face'
  }
  if (
    normalized === 'AUDIO_ACTIVITY' ||
    normalized === 'SPEECH_ACTIVITY_DETECTED' ||
    normalized === 'SUSTAINED_SPEECH_ACTIVITY' ||
    normalized === 'MICROPHONE_DISCONNECTED' ||
    normalized === 'MICROPHONE_PERMISSION_DENIED'
  ) {
    return 'web_audio'
  }
  if (
    normalized === 'TAB_HIDDEN' ||
    normalized === 'FULLSCREEN_EXIT' ||
    normalized === 'WINDOW_BLUR' ||
    normalized === 'CLIPBOARD_PASTE' ||
    normalized === 'CONTEXT_MENU' ||
    normalized === 'DEVTOOLS_DETECTED'
  ) {
    return 'browser_visibility'
  }
  if (normalized === 'SESSION_CONNECTION_INTERRUPTED') {
    return claimedSource === 'browser_visibility' ? 'browser_visibility' : 'server_session'
  }
  return 'browser_visibility'
}

export interface AuthoritativeEventSpec {
  canonicalType: string
  sourceModule: EventSourceModule
  severity: EventSeverity
  weight: number
  isEnvironmentalOrTechnical: boolean
  diminishingFactorSet: 'environmental' | 'technical' | 'behavioral'
}

/**
 * Computes server-authoritative severity and bounded episode weight purely from
 * verified event type, sustained duration, and verified signal basis.
 * Client-supplied severity and confidence are NEVER trusted for risk escalation.
 */
export function deriveAuthoritativeEventSpec(
  eventType: string,
  durationMs: number | null,
  details?: Record<string, unknown> | null
): AuthoritativeEventSpec {
  const canonicalType = normalizeEventTypeName(eventType)
  const sourceModule = resolveAuthoritativeSourceModule(
    canonicalType,
    typeof details?.sourceModule === 'string' ? details.sourceModule : undefined
  )
  const dur = typeof durationMs === 'number' && durationMs >= 0 ? durationMs : 0

  switch (canonicalType) {
    case 'PHONE_DETECTED': {
      const weight = dur >= 4_000 ? 35 : 28
      return {
        canonicalType,
        sourceModule,
        severity: 'critical',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'MULTIPLE_DEVICES_DETECTED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'high',
        weight: 25,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'ADDITIONAL_PERSON_DETECTED': {
      const weight = dur >= 5_000 ? 26 : 18
      return {
        canonicalType,
        sourceModule,
        severity: 'high',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'FACE_OBSTRUCTED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'medium',
        weight: 10,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'PROLONGED_OFFSCREEN_GAZE': {
      const weight = dur >= 8_000 ? 12 : 6
      return {
        canonicalType,
        sourceModule,
        severity: dur >= 8_000 ? 'medium' : 'low',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'HEAD_MOVEMENT_OBSERVED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'low',
        weight: 4,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'REPEATED_HEAD_DEVIATION': {
      return {
        canonicalType,
        sourceModule,
        severity: 'medium',
        weight: 14,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'SPEECH_ACTIVITY_DETECTED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'medium',
        weight: 12,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'SUSTAINED_SPEECH_ACTIVITY': {
      const weight = dur >= 6_000 ? 22 : 16
      return {
        canonicalType,
        sourceModule,
        severity: 'high',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'OBJECT_DETECTION_UNAVAILABLE':
    case 'GAZE_ESTIMATION_UNAVAILABLE': {
      return {
        canonicalType,
        sourceModule,
        severity: 'low',
        weight: 0,
        isEnvironmentalOrTechnical: true,
        diminishingFactorSet: 'technical',
      }
    }
    case 'MULTIPLE_FACES_DETECTED': {
      const weight = dur >= 8_000 ? 25 : 18
      return {
        canonicalType,
        sourceModule,
        severity: 'high',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'FACE_NOT_VISIBLE':
    case 'FACE_OCCLUDED': {
      const weight = dur >= 30_000 ? 18 : dur >= 10_000 ? 12 : 8
      return {
        canonicalType,
        sourceModule,
        severity: dur >= 30_000 ? 'high' : 'medium',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'TAB_HIDDEN':
    case 'FULLSCREEN_EXIT': {
      const weight = dur >= 30_000 ? 17 : dur >= 10_000 ? 11 : 7
      return {
        canonicalType,
        sourceModule,
        severity: dur >= 30_000 ? 'high' : 'medium',
        weight,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'WINDOW_BLUR': {
      return {
        canonicalType,
        sourceModule,
        severity: 'low',
        weight: 4,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'CAMERA_DISCONNECTED':
    case 'MICROPHONE_DISCONNECTED': {
      const weight = dur >= 15_000 ? 12 : 8
      return {
        canonicalType,
        sourceModule,
        severity: 'medium',
        weight,
        isEnvironmentalOrTechnical: true,
        diminishingFactorSet: 'technical',
      }
    }
    case 'CAMERA_PERMISSION_DENIED':
    case 'MICROPHONE_PERMISSION_DENIED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'medium',
        weight: 6,
        isEnvironmentalOrTechnical: true,
        diminishingFactorSet: 'technical',
      }
    }
    case 'AUDIO_ACTIVITY': {
      const isVadConfirmed = details?.measurementBasis === 'vad_model' && details?.isSpeechClassified === true
      const weight = isVadConfirmed
        ? dur >= 5_000
          ? 10
          : 7
        : dur >= 8_000
          ? 6
          : 4
      return {
        canonicalType,
        sourceModule,
        severity: isVadConfirmed && dur >= 5_000 ? 'medium' : 'low',
        weight,
        isEnvironmentalOrTechnical: !isVadConfirmed,
        diminishingFactorSet: 'environmental',
      }
    }
    case 'SESSION_CONNECTION_INTERRUPTED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'low',
        weight: 2,
        isEnvironmentalOrTechnical: true,
        diminishingFactorSet: 'technical',
      }
    }
    case 'DEVTOOLS_DETECTED': {
      return {
        canonicalType,
        sourceModule,
        severity: 'high',
        weight: 14,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    case 'CLIPBOARD_PASTE':
    case 'CONTEXT_MENU': {
      return {
        canonicalType,
        sourceModule,
        severity: 'low',
        weight: 5,
        isEnvironmentalOrTechnical: false,
        diminishingFactorSet: 'behavioral',
      }
    }
    default: {
      return {
        canonicalType,
        sourceModule,
        severity: 'low',
        weight: 3,
        isEnvironmentalOrTechnical: true,
        diminishingFactorSet: 'technical',
      }
    }
  }
}

export interface RiskInputEvent {
  eventId: string
  eventType: string
  occurredAt: string
  durationMs: number | null
  details?: Record<string, unknown> | null
}

interface CoalescedEpisode {
  canonicalType: string
  events: Array<{ event: RiskInputEvent; spec: AuthoritativeEventSpec; tsMs: number }>
  startMs: number
  endMs: number
  maxWeight: number
  maxDurationMs: number
  isEnvironmentalOrTechnical: boolean
}

function formatDurationSeconds(durationMs: number | null | undefined): string | null {
  if (typeof durationMs !== 'number' || durationMs <= 0) return null
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`
  return `${(durationMs / 1000).toFixed(1)}s`
}

export function buildEventExplanation(params: {
  canonicalType: string
  durationMs: number | null
  details?: Record<string, unknown> | null
  isContinuationOfEpisode: boolean
  correlationsForEvent: TemporalCorrelationHit[]
}): string {
  const durStr = formatDurationSeconds(params.durationMs)
  const isVad =
    params.details?.measurementBasis === 'vad_model' &&
    params.details?.isSpeechClassified === true

  let base = ''
  switch (params.canonicalType) {
    case 'PHONE_DETECTED':
      base = durStr
        ? `Mobile phone / cellular device detected in the examination camera frame for ${durStr}.`
        : 'Mobile phone / cellular device detected in the examination camera frame.'
      break
    case 'MULTIPLE_DEVICES_DETECTED':
      base = 'Multiple electronic devices (secondary laptop/phone/tablet) detected in candidate workspace.'
      break
    case 'ADDITIONAL_PERSON_DETECTED':
      base = durStr
        ? `Additional person detected in the candidate environment for ${durStr}.`
        : 'Additional person detected in the candidate environment.'
      break
    case 'FACE_OBSTRUCTED':
      base = 'Candidate face appeared partially obscured or obstructed from camera view.'
      break
    case 'PROLONGED_OFFSCREEN_GAZE':
      base = durStr
        ? `Candidate attention or gaze remained continuously directed away from screen for ${durStr}.`
        : 'Prolonged off-screen attention detected via head pose and gaze estimation.'
      break
    case 'HEAD_MOVEMENT_OBSERVED':
      base = 'Noticeable head movement or angle deviation observed in candidate video feed.'
      break
    case 'REPEATED_HEAD_DEVIATION':
      base = 'Repeated head rotation away from the screen observed across multiple sampling intervals.'
      break
    case 'SPEECH_ACTIVITY_DETECTED':
    case 'SUSTAINED_SPEECH_ACTIVITY':
      base = durStr
        ? `Sustained human speech activity detected in candidate environment for ${durStr}.`
        : 'Human speech activity detected via voice activity analysis.'
      break
    case 'FACE_NOT_VISIBLE':
    case 'FACE_OCCLUDED':
      base = durStr
        ? `Primary candidate face was absent from the local camera frame for ${durStr}.`
        : 'Primary candidate face was not detected in the local camera preview.'
      break
    case 'MULTIPLE_FACES_DETECTED':
      base = durStr
        ? `More than one face remained visible in the webcam frame for ${durStr}.`
        : 'More than one face was detected in the candidate webcam frame.'
      break
    case 'CAMERA_DISCONNECTED':
      base = 'Webcam video track ended or disconnected mid-session; local face monitoring paused until reconnected.'
      break
    case 'CAMERA_PERMISSION_DENIED':
      base = 'Browser denied or revoked webcam permission; local camera monitoring could not run.'
      break
    case 'AUDIO_ACTIVITY':
      base = isVad
        ? `Voice activity detector observed sustained speech-band activity${durStr ? ` for ${durStr}` : ''}. This requires human review and does not prove misconduct.`
        : `Sustained ambient acoustic sound energy detected locally${durStr ? ` for ${durStr}` : ''} without speech/speaker classification; background noise is not treated as cheating.`
      break
    case 'MICROPHONE_DISCONNECTED':
      base = 'Microphone audio track disconnected mid-session; acoustic monitoring paused.'
      break
    case 'MICROPHONE_PERMISSION_DENIED':
      base = 'Browser denied or revoked microphone permission; audio energy monitoring could not initialize.'
      break
    case 'TAB_HIDDEN':
      base = durStr
        ? `Examination browser tab was hidden or switched away for ${durStr}.`
        : 'Examination browser tab transitioned to a hidden visibility state.'
      break
    case 'FULLSCREEN_EXIT':
      base = durStr
        ? `Candidate exited fullscreen mode and remained outside fullscreen for ${durStr}.`
        : 'Candidate exited browser fullscreen examination mode.'
      break
    case 'SESSION_CONNECTION_INTERRUPTED':
      base = durStr
        ? `Examination network connectivity was interrupted for ${durStr}; locally queued responses synced on recovery.`
        : 'Temporary network connection interruption detected inside the exam tab.'
      break
    default:
      base = `Advisory monitoring indicator (${params.canonicalType}) recorded for human oversight.`
  }

  const parts = [base]
  if (params.isContinuationOfEpisode) {
    parts.push(
      'Coalesced into the ongoing continuous episode so repeated frames do not permanently inflate risk.'
    )
  }
  if (params.correlationsForEvent.length > 0) {
    const corrLabels = params.correlationsForEvent.map((c) => c.title).join('; ')
    parts.push(`Temporal correlation observed: ${corrLabels}.`)
  }
  parts.push('Advisory telemetry only — never an automated finding of academic misconduct.')

  return parts.join(' ')
}

export interface EvaluateRiskResult {
  assessment: SessionRiskAssessment
  incomingEventExplanation: string
  incomingIsContinuation: boolean
  incomingAuthoritativeSpec: AuthoritativeEventSpec
  incomingCorrelations: TemporalCorrelationHit[]
}

/**
 * Evaluates session risk deterministically over canonical event history.
 * - Coalesces continuous repeated frames into bounded episodes (never inflates risk per frame)
 * - Detects explainable multi-signal temporal correlations
 * - Produces human-readable explanations and non-punitive review categories
 */
export function evaluateSessionRiskAndCorrelations(params: {
  sessionId: string
  examId: string
  universityId: string
  priorEvents: RiskInputEvent[]
  incomingEvent?: RiskInputEvent | null
  nowIso?: string
}): EvaluateRiskResult {
  const evaluatedAt = params.nowIso ?? new Date().toISOString()
  const allEvents = [
    ...params.priorEvents,
    ...(params.incomingEvent ? [params.incomingEvent] : []),
  ]
    .map((ev) => {
      const parsedMs = Date.parse(ev.occurredAt)
      const tsMs = Number.isFinite(parsedMs) ? parsedMs : Date.now()
      const spec = deriveAuthoritativeEventSpec(ev.eventType, ev.durationMs, ev.details)
      return { event: ev, spec, tsMs }
    })
    .sort((a, b) => a.tsMs - b.tsMs)

  // 1. Episode coalescing per canonical event type within EPISODE_GAP_MS
  const episodesByType = new Map<string, CoalescedEpisode[]>()
  const eventToEpisodeMap = new Map<string, { episodeIndexInType: number; isContinuation: boolean }>()

  for (const item of allEvents) {
    const list = episodesByType.get(item.spec.canonicalType) ?? []
    const lastEp = list[list.length - 1]
    const dur = item.event.durationMs ?? 0

    if (lastEp && item.tsMs - lastEp.endMs <= EPISODE_GAP_MS) {
      lastEp.events.push(item)
      lastEp.endMs = item.tsMs
      if (item.spec.weight > lastEp.maxWeight) {
        lastEp.maxWeight = item.spec.weight
      }
      if (dur > lastEp.maxDurationMs) {
        lastEp.maxDurationMs = dur
      }
      eventToEpisodeMap.set(item.event.eventId, {
        episodeIndexInType: list.length - 1,
        isContinuation: true,
      })
    } else {
      const ep: CoalescedEpisode = {
        canonicalType: item.spec.canonicalType,
        events: [item],
        startMs: item.tsMs,
        endMs: item.tsMs,
        maxWeight: item.spec.weight,
        maxDurationMs: dur,
        isEnvironmentalOrTechnical: item.spec.isEnvironmentalOrTechnical,
      }
      list.push(ep)
      episodesByType.set(item.spec.canonicalType, list)
      eventToEpisodeMap.set(item.event.eventId, {
        episodeIndexInType: list.length - 1,
        isContinuation: false,
      })
    }
  }

  const allEpisodes: CoalescedEpisode[] = []
  for (const list of episodesByType.values()) {
    allEpisodes.push(...list)
  }

  // Compute bounded episode score with diminishing returns across repeated minor/technical episodes
  let baseRiskScore = 0
  let audioRiskTotal = 0
  let connectivityRiskTotal = 0

  for (const [type, list] of episodesByType.entries()) {
    list.forEach((ep, idx) => {
      const decay =
        type === 'AUDIO_ACTIVITY' || type === 'SESSION_CONNECTION_INTERRUPTED'
          ? idx === 0
            ? 1
            : idx === 1
              ? 0.5
              : 0.25
          : ep.isEnvironmentalOrTechnical
            ? idx === 0
              ? 1
              : 0.5
            : idx === 0
              ? 1
              : idx === 1
                ? 0.85
                : 0.65

      const pts = Number((ep.maxWeight * decay).toFixed(2))
      if (type === 'AUDIO_ACTIVITY') {
        const remainingCap = Math.max(0, 12 - audioRiskTotal)
        const added = Math.min(pts, remainingCap)
        audioRiskTotal += added
        baseRiskScore += added
      } else if (type === 'SESSION_CONNECTION_INTERRUPTED') {
        const remainingCap = Math.max(0, 6 - connectivityRiskTotal)
        const added = Math.min(pts, remainingCap)
        connectivityRiskTotal += added
        baseRiskScore += added
      } else {
        baseRiskScore += pts
      }
    })
  }

  // 2. Temporal correlation rules across distinct signals
  const correlations: TemporalCorrelationHit[] = []

  const faceAbsentEps = episodesByType.get('FACE_NOT_VISIBLE') ?? []
  const multiFaceEps = episodesByType.get('MULTIPLE_FACES_DETECTED') ?? []
  const tabHiddenEps = [
    ...(episodesByType.get('TAB_HIDDEN') ?? []),
    ...(episodesByType.get('FULLSCREEN_EXIT') ?? []),
  ]
  const audioEps = episodesByType.get('AUDIO_ACTIVITY') ?? []
  const sensorDropEps = [
    ...(episodesByType.get('CAMERA_DISCONNECTED') ?? []),
    ...(episodesByType.get('MICROPHONE_DISCONNECTED') ?? []),
  ]

  const findPairWithinWindow = (
    epsA: CoalescedEpisode[],
    epsB: CoalescedEpisode[],
    windowMs: number
  ): { a: CoalescedEpisode; b: CoalescedEpisode; deltaSec: number } | null => {
    for (const a of epsA) {
      for (const b of epsB) {
        const gap = Math.max(0, Math.max(a.startMs, b.startMs) - Math.min(a.endMs, b.endMs))
        if (gap <= windowMs) {
          return { a, b, deltaSec: Math.round(gap / 1000) }
        }
      }
    }
    return null
  }

  const episodeLeadEventId = (ep: CoalescedEpisode): string | undefined => ep.events[0]?.event.eventId

  const faceTabPair = findPairWithinWindow(faceAbsentEps, tabHiddenEps, CORRELATION_WINDOW_MS)
  if (faceTabPair) {
    correlations.push({
      ruleId: 'OFF_SCREEN_TAB_COMBINATION',
      title: 'Face Absence Correlated With Navigation',
      description: `Face visibility dropped within ${faceTabPair.deltaSec}s of a browser tab hide or fullscreen exit.`,
      bonusPoints: 14,
      eventIds: [
        episodeLeadEventId(faceTabPair.a),
        episodeLeadEventId(faceTabPair.b),
      ].filter((id): id is string => Boolean(id)),
      windowSeconds: CORRELATION_WINDOW_MS / 1000,
    })
  }

  const multiAudioPair = findPairWithinWindow(multiFaceEps, audioEps, CORRELATION_WINDOW_MS)
  if (multiAudioPair) {
    correlations.push({
      ruleId: 'MULTI_PERSON_ACOUSTIC_OVERLAP',
      title: 'Multiple Faces With Acoustic Overlap',
      description: `Sustained acoustic activity occurred within ${multiAudioPair.deltaSec}s of multiple faces appearing on camera.`,
      bonusPoints: 18,
      eventIds: [
        episodeLeadEventId(multiAudioPair.a),
        episodeLeadEventId(multiAudioPair.b),
      ].filter((id): id is string => Boolean(id)),
      windowSeconds: CORRELATION_WINDOW_MS / 1000,
    })
  }

  const sensorNavPair = findPairWithinWindow(sensorDropEps, tabHiddenEps, CORRELATION_WINDOW_MS)
  if (sensorNavPair) {
    correlations.push({
      ruleId: 'SENSOR_DROP_WITH_NAVIGATION',
      title: 'Sensor Interruption Near Focus Change',
      description: `Camera or microphone feed disconnected within ${sensorNavPair.deltaSec}s of a tab or fullscreen change.`,
      bonusPoints: 12,
      eventIds: [
        episodeLeadEventId(sensorNavPair.a),
        episodeLeadEventId(sensorNavPair.b),
      ].filter((id): id is string => Boolean(id)),
      windowSeconds: CORRELATION_WINDOW_MS / 1000,
    })
  }

  // Cluster of 3+ distinct tab/fullscreen exit episodes within 5 minutes
  const sortedNavEps = [...tabHiddenEps].sort((a, b) => a.startMs - b.startMs)
  if (sortedNavEps.length >= 3) {
    for (let i = 0; i <= sortedNavEps.length - 3; i += 1) {
      const thirdEp = sortedNavEps[i + 2]
      const firstEp = sortedNavEps[i]
      if (!thirdEp || !firstEp) continue
      const span = thirdEp.startMs - firstEp.startMs
      if (span <= CLUSTER_WINDOW_MS) {
        correlations.push({
          ruleId: 'REPEATED_NAVIGATION_CLUSTER',
          title: 'Repeated Browser Navigation Cluster',
          description: `Three distinct tab-switch or fullscreen-exit episodes occurred within ${Math.max(1, Math.round(span / 1000))}s.`,
          bonusPoints: 10,
          eventIds: sortedNavEps
            .slice(i, i + 3)
            .map((e) => episodeLeadEventId(e))
            .filter((id): id is string => Boolean(id)),
          windowSeconds: CLUSTER_WINDOW_MS / 1000,
        })
        break
      }
    }
  }

  const correlationBonus = correlations.reduce((acc, c) => acc + c.bonusPoints, 0)
  const riskScore = Math.min(100, Math.round(baseRiskScore + correlationBonus))
  const trustScore = Math.max(0, Math.round(100 - riskScore))

  // 3. Contextual Risk Indicators
  const contextualIndicators: ContextualRiskIndicator[] = []
  for (const corr of correlations) {
    contextualIndicators.push({
      code: corr.ruleId,
      label: corr.title,
      impact: 'elevated',
      detail: corr.description,
    })
  }

  const hasSustainedMultiFace = multiFaceEps.some((ep) => ep.maxDurationMs >= 8_000)
  const hasSustainedAbsence = faceAbsentEps.some((ep) => ep.maxDurationMs >= 15_000)
  const hasSustainedNav = tabHiddenEps.some((ep) => ep.maxDurationMs >= 15_000)

  if (allEvents.length > 0 && correlations.length === 0 && riskScore < 25) {
    contextualIndicators.push({
      code: 'ISOLATED_ENVIRONMENTAL_OR_TECHNICAL',
      label: 'Isolated Environmental / Technical Context',
      impact: 'mitigating',
      detail:
        'Observed signals lack cross-channel behavioral correlation (for example, ambient background audio or brief connectivity loss).',
    })
  }

  const repeatedFramesSuppressed = allEvents.length - allEpisodes.length
  if (repeatedFramesSuppressed > 0) {
    contextualIndicators.push({
      code: 'CONTINUOUS_EPISODE_COALESCED',
      label: 'Continuous Frame Coalescing Applied',
      impact: 'neutral',
      detail: `${repeatedFramesSuppressed} continuation event${repeatedFramesSuppressed === 1 ? '' : 's'} merged into ${allEpisodes.length} distinct episode${allEpisodes.length === 1 ? '' : 's'} to prevent repetitive risk inflation.`,
    })
  }

  // 4. Risk Category Determination (NORMAL | REVIEW_SUGGESTED | PRIORITY_REVIEW)
  let riskCategory: RiskCategory = 'NORMAL'
  if (
    riskScore >= 55 ||
    correlations.length >= 2 ||
    (hasSustainedMultiFace && correlations.length >= 1)
  ) {
    riskCategory = 'PRIORITY_REVIEW'
  } else if (
    riskScore >= 25 ||
    correlations.length >= 1 ||
    multiFaceEps.length > 0 ||
    hasSustainedAbsence ||
    hasSustainedNav ||
    tabHiddenEps.length >= 2
  ) {
    riskCategory = 'REVIEW_SUGGESTED'
  }

  const summaryExplanation =
    riskCategory === 'PRIORITY_REVIEW'
      ? `Priority human review suggested (risk ${riskScore}/100 across ${allEpisodes.length} distinct episode${allEpisodes.length === 1 ? '' : 's'} and ${correlations.length} temporal correlation${correlations.length === 1 ? '' : 's'}). Advisory only; requires human invigilator assessment.`
      : riskCategory === 'REVIEW_SUGGESTED'
        ? `Contextual review suggested (risk ${riskScore}/100 across ${allEpisodes.length} distinct episode${allEpisodes.length === 1 ? '' : 's'}). Review timeline details before making any academic determination.`
        : allEvents.length === 0
          ? 'Normal baseline — no monitoring anomalies recorded for this session.'
          : `Normal contextual baseline (risk ${riskScore}/100 across ${allEpisodes.length} distinct episode${allEpisodes.length === 1 ? '' : 's'}). No corroborated integrity concerns detected.`

  const assessment: SessionRiskAssessment = {
    sessionId: params.sessionId,
    examId: params.examId,
    universityId: params.universityId,
    riskCategory,
    riskScore,
    trustScore,
    episodeCount: allEpisodes.length,
    rawEventCount: allEvents.length,
    correlations,
    contextualIndicators,
    summaryExplanation,
    evaluatedAt,
    autoDisqualified: false,
  }

  // Per-event explanation for incoming event
  let incomingEventExplanation = ''
  let incomingIsContinuation = false
  let incomingAuthoritativeSpec = deriveAuthoritativeEventSpec('SESSION_CONNECTION_INTERRUPTED', 0, null)
  let incomingCorrelations: TemporalCorrelationHit[] = []

  if (params.incomingEvent) {
    const incomingMeta = eventToEpisodeMap.get(params.incomingEvent.eventId)
    incomingIsContinuation = Boolean(incomingMeta?.isContinuation)
    incomingAuthoritativeSpec = deriveAuthoritativeEventSpec(
      params.incomingEvent.eventType,
      params.incomingEvent.durationMs,
      params.incomingEvent.details
    )
    incomingCorrelations = correlations.filter((c) =>
      c.eventIds.includes(params.incomingEvent!.eventId)
    )
    incomingEventExplanation = buildEventExplanation({
      canonicalType: incomingAuthoritativeSpec.canonicalType,
      durationMs: params.incomingEvent.durationMs,
      details: params.incomingEvent.details,
      isContinuationOfEpisode: incomingIsContinuation,
      correlationsForEvent: incomingCorrelations,
    })
  }

  return {
    assessment,
    incomingEventExplanation,
    incomingIsContinuation,
    incomingAuthoritativeSpec,
    incomingCorrelations,
  }
}

export function normalizeReviewStatus(value: unknown): EventReviewStatus {
  if (
    value === 'pending_review' ||
    value === 'acknowledged' ||
    value === 'cleared' ||
    value === 'flagged' ||
    value === 'dismissed'
  ) {
    return value
  }
  return 'pending_review'
}

export interface RawProctorEventRow {
  id: string
  session_id: string
  tenant_id: string
  event_type: EventType
  severity: EventSeverity
  confidence: number | null
  details: Record<string, unknown> | null
  created_at: string
}

export function resolveLogicalEventType(
  row: Pick<RawProctorEventRow, 'event_type' | 'details'>
): EventType {
  const details = row.details
  const p9 = typeof details?.phase9EventType === 'string' ? details.phase9EventType : undefined
  const p8 = typeof details?.phase8EventType === 'string' ? details.phase8EventType : undefined
  const canonical =
    typeof (details?.canonicalEvent as Record<string, unknown> | undefined)?.eventType === 'string'
      ? ((details?.canonicalEvent as Record<string, unknown>).eventType as string)
      : undefined
  return (canonical || p9 || p8 || row.event_type) as EventType
}

export function resolveEventOrigin(
  sourceModule: EventSourceModule,
  details?: Record<string, unknown> | null
): { eventOrigin: EventOrigin; isSimulated: boolean } {
  const isSimulated =
    details?.isSimulated === true ||
    details?.simulated === true ||
    details?.eventOrigin === 'simulated_demo' ||
    details?.origin === 'simulated_demo'
  if (isSimulated) {
    return { eventOrigin: 'simulated_demo', isSimulated: true }
  }
  if (
    sourceModule === 'mediapipe_face' ||
    (sourceModule === 'web_audio' && details?.measurementBasis === 'vad_model')
  ) {
    return { eventOrigin: 'ai_detection', isSimulated: false }
  }
  return { eventOrigin: 'browser_telemetry', isSimulated: false }
}

export function mapRowToCanonicalEvent(
  row: RawProctorEventRow,
  examIdFallback = ''
): CanonicalMonitoringEvent {
  const details = (row.details ?? {}) as Record<string, unknown>
  const embedded = (details.canonicalEvent ?? {}) as Record<string, unknown>
  const logicalType = resolveLogicalEventType(row)
  const durationMs =
    typeof embedded.durationMs === 'number'
      ? embedded.durationMs
      : typeof details.durationMs === 'number'
        ? details.durationMs
        : typeof details.sustainedDurationMs === 'number'
          ? details.sustainedDurationMs
          : null

  const occurredAt =
    typeof embedded.timestamp === 'string'
      ? embedded.timestamp
      : typeof details.occurredAt === 'string'
        ? details.occurredAt
        : row.created_at

  const spec = deriveAuthoritativeEventSpec(logicalType, durationMs, details)
  const sourceModule: EventSourceModule =
    typeof embedded.sourceModule === 'string'
      ? (embedded.sourceModule as EventSourceModule)
      : spec.sourceModule

  const { eventOrigin, isSimulated } = resolveEventOrigin(sourceModule, {
    ...details,
    ...(embedded ?? {}),
  })

  const explanation =
    typeof embedded.explanation === 'string' && embedded.explanation.trim().length > 0
      ? embedded.explanation
      : typeof details.explanation === 'string' && details.explanation.trim().length > 0
        ? details.explanation
        : buildEventExplanation({
            canonicalType: spec.canonicalType,
            durationMs,
            details,
            isContinuationOfEpisode: Boolean(
              (details.serverRiskEvaluation as Record<string, unknown> | undefined)
                ?.suppressTrustPenalty
            ),
            correlationsForEvent: [],
          })

  const reviewStatus: EventReviewStatus = normalizeReviewStatus(
    embedded.reviewStatus ?? details.reviewStatus
  )

  return {
    eventId: row.id,
    clientEventId:
      typeof embedded.clientEventId === 'string'
        ? embedded.clientEventId
        : typeof details.clientEventId === 'string'
          ? details.clientEventId
          : row.id,
    universityId: row.tenant_id,
    examId:
      typeof embedded.examId === 'string'
        ? embedded.examId
        : typeof details.examId === 'string'
          ? details.examId
          : examIdFallback,
    sessionId: row.session_id,
    eventType: logicalType,
    sourceModule,
    eventOrigin,
    isSimulated,
    timestamp: occurredAt,
    ingestedAt: row.created_at,
    durationMs,
    modelVersion:
      typeof embedded.modelVersion === 'string'
        ? embedded.modelVersion
        : typeof details.modelVersion === 'string'
          ? details.modelVersion
          : null,
    confidence: row.confidence !== null ? Number(row.confidence) : null,
    severity: row.severity,
    explanation,
    reviewStatus,
    reviewNote:
      typeof embedded.reviewNote === 'string'
        ? embedded.reviewNote
        : typeof details.reviewNote === 'string'
          ? details.reviewNote
          : null,
    reviewedAt:
      typeof embedded.reviewedAt === 'string'
        ? embedded.reviewedAt
        : typeof details.reviewedAt === 'string'
          ? details.reviewedAt
          : null,
    reviewedBy:
      typeof embedded.reviewedBy === 'string'
        ? embedded.reviewedBy
        : typeof details.reviewedBy === 'string'
          ? details.reviewedBy
          : null,
    metadata: details,
  }
}

