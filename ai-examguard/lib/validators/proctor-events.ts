import { z } from 'zod'

export const PROCTOR_MONITORING_EVENT_TYPES = [
  'FACE_NOT_VISIBLE',
  'MULTIPLE_FACES_DETECTED',
  'FACE_OBSTRUCTED',
  'CAMERA_DISCONNECTED',
  'CAMERA_PERMISSION_DENIED',
  'PHONE_DETECTED',
  'MULTIPLE_DEVICES_DETECTED',
  'OBJECT_DETECTION_UNAVAILABLE',
  'ADDITIONAL_PERSON_DETECTED',
  'HEAD_MOVEMENT_OBSERVED',
  'PROLONGED_OFFSCREEN_GAZE',
  'REPEATED_HEAD_DEVIATION',
  'GAZE_ESTIMATION_UNAVAILABLE',
  'AUDIO_ACTIVITY',
  'SPEECH_ACTIVITY_DETECTED',
  'SUSTAINED_SPEECH_ACTIVITY',
  'MICROPHONE_DISCONNECTED',
  'MICROPHONE_PERMISSION_DENIED',
  'TAB_HIDDEN',
  'FULLSCREEN_EXIT',
  'SESSION_CONNECTION_INTERRUPTED',
] as const

const FORBIDDEN_MEDIA_KEYS = new Set([
  'frame',
  'frames',
  'image',
  'imagedata',
  'base64',
  'blob',
  'video',
  'videodata',
  'screenshot',
  'pixeldata',
  'audio',
  'audiodata',
  'pcm',
  'wav',
  'webm',
  'ogg',
  'mp3',
  'recording',
  'voiceprint',
  'speakerid',
])

export const EVENT_SOURCE_MODULES = [
  'mediapipe_face',
  'object_detector',
  'web_audio',
  'browser_visibility',
  'server_session',
] as const

export const EVENT_REVIEW_STATUSES = [
  'pending_review',
  'acknowledged',
  'cleared',
  'flagged',
  'dismissed',
] as const

export const proctorEventPayloadSchema = z
  .object({
    clientEventId: z.string().uuid('clientEventId must be a valid UUID.'),
    sessionId: z.string().uuid().optional().nullable(),
    context: z.enum(['preflight', 'active_exam']).default('active_exam'),
    eventType: z.enum(PROCTOR_MONITORING_EVENT_TYPES),
    sourceModule: z.enum(EVENT_SOURCE_MODULES).optional(),
    timestamp: z.union([z.string().min(1), z.number().finite()]),
    durationMs: z.number().int().min(0).max(3_600_000).optional().nullable(),
    sustainedDurationMs: z.number().int().min(0).max(3_600_000).optional().nullable(),
    modelVersion: z.string().trim().min(1).max(120).optional().nullable(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    confidence: z.number().min(0).max(1).optional().nullable(),
    details: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const eventReviewUpdateSchema = z
  .object({
    reviewStatus: z.enum(EVENT_REVIEW_STATUSES),
    reviewNote: z.string().trim().max(500).optional().nullable(),
    escalate: z.boolean().optional(),
  })
  .strict()

export const simulateDemoEventSchema = z
  .object({
    sessionId: z.string().uuid('sessionId must be a valid UUID.'),
    eventType: z.enum(PROCTOR_MONITORING_EVENT_TYPES),
  })
  .strict()

export type ProctorEventInput = z.infer<typeof proctorEventPayloadSchema>
export type EventReviewUpdateInput = z.infer<typeof eventReviewUpdateSchema>
export type SimulateDemoEventInput = z.infer<typeof simulateDemoEventSchema>

export function assertNoRawFramePayload(rawBody: unknown): void {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) return

  const queue: unknown[] = [rawBody]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item)
      continue
    }

    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (FORBIDDEN_MEDIA_KEYS.has(key.toLowerCase())) {
        throw new Error(
          `Raw media/audio payload key "${key}" is not allowed; proctoring runs locally.`
        )
      }
      if (
        typeof value === 'string' &&
        (value.startsWith('data:image/') || value.startsWith('data:audio/'))
      ) {
        throw new Error(
          'Inline base64 image/audio payloads are prohibited; proctoring runs locally.'
        )
      }
      if (value && typeof value === 'object') {
        queue.push(value)
      }
    }
  }
}

