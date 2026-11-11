import { z } from 'zod'

export const PROCTOR_MONITORING_EVENT_TYPES = [
  'FACE_NOT_VISIBLE',
  'MULTIPLE_FACES_DETECTED',
  'CAMERA_DISCONNECTED',
  'CAMERA_PERMISSION_DENIED',
] as const

const FORBIDDEN_FRAME_KEYS = new Set([
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
])

export const proctorEventPayloadSchema = z
  .object({
    sessionId: z.string().uuid().optional().nullable(),
    context: z.enum(['preflight', 'active_exam']).default('active_exam'),
    eventType: z.enum(PROCTOR_MONITORING_EVENT_TYPES),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    confidence: z.number().min(0).max(1).default(0.9),
    sustainedDurationMs: z.number().int().min(0).max(600_000).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type ProctorEventInput = z.infer<typeof proctorEventPayloadSchema>

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
      if (FORBIDDEN_FRAME_KEYS.has(key.toLowerCase())) {
        throw new Error(`Raw media/frame key "${key}" is not allowed; proctoring runs locally.`)
      }
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        throw new Error('Inline base64 image payloads are prohibited; proctoring runs locally.')
      }
      if (value && typeof value === 'object') {
        queue.push(value)
      }
    }
  }
}

