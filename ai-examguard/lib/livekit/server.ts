import { AccessToken, TrackSource } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface GenerateLiveKitTokenOptions {
  roomName: string
  participantIdentity: string
  participantName: string
  role: 'student' | 'invigilator'
  tenantId: string
  examId: string
  sessionId?: string | null
  metadata?: Record<string, unknown>
  ttlSeconds?: number
}

export interface LiveKitTokenResult {
  token: string
  wsUrl: string
  roomName: string
  participantIdentity: string
  role: 'student' | 'invigilator'
  expiresInSeconds: number
}

/**
 * Server-authoritative LiveKit token issuer and WebRTC room manager.
 * Strict Security Rules:
 * 1. Candidates are granted publish permissions ONLY (canPublish=true, canSubscribe=false).
 *    Candidates can NEVER subscribe to other candidates' video/audio streams.
 * 2. Invigilators are granted subscribe permissions (canPublish=false, canSubscribe=true)
 *    and can subscribe to assigned examination rooms.
 * 3. Secrets are never exposed to the client.
 */
export class LiveKitService {
  private static getCredentials() {
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey'
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret_examguard_livekit_mock_development_key_min32'
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || 'wss://livekit.examguard.internal'

    return { apiKey, apiSecret, wsUrl }
  }

  static formatRoomName(examId: string, shardIndex = 0): string {
    return shardIndex === 0 ? `exam_${examId}` : `exam_${examId}_shard_${shardIndex}`
  }

  static async issueParticipantToken(
    options: GenerateLiveKitTokenOptions
  ): Promise<LiveKitTokenResult> {
    const { apiKey, apiSecret, wsUrl } = this.getCredentials()
    const ttl = options.ttlSeconds ?? (options.role === 'invigilator' ? 6 * 3600 : 4 * 3600)

    const token = new AccessToken(apiKey, apiSecret, {
      identity: options.participantIdentity,
      name: options.participantName,
      ttl: `${ttl}s`,
      metadata: JSON.stringify({
        tenantId: options.tenantId,
        examId: options.examId,
        sessionId: options.sessionId ?? null,
        role: options.role,
        ...(options.metadata || {}),
      }),
    })

    if (options.role === 'student') {
      token.addGrant({
        room: options.roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: false, // ZERO subscriber access: cannot spy on other examinees
        canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE],
      })
    } else {
      // Invigilator / Faculty / Proctor
      token.addGrant({
        room: options.roomName,
        roomJoin: true,
        canPublish: false,
        canSubscribe: true, // Subscribes to candidates' feeds
        canPublishData: true, // Supports exam announcements / 1-on-1 assistance
      })
    }

    const jwt = await token.toJwt()

    // Log access in monitoring_access_audit if an invigilator requests a stream
    if (options.role === 'invigilator' && options.sessionId) {
      try {
        await supabaseAdmin
          .from('monitoring_access_audit')
          .insert({
            tenant_id: options.tenantId,
            exam_id: options.examId,
            session_id: options.sessionId,
            invigilator_id: options.participantIdentity,
            access_type: 'live_video_subscribe',
            metadata: { roomName: options.roomName },
          })
      } catch {
        // Logging is best effort without blocking stream token issuance
      }
    }

    return {
      token: jwt,
      wsUrl,
      roomName: options.roomName,
      participantIdentity: options.participantIdentity,
      role: options.role,
      expiresInSeconds: ttl,
    }
  }

  static async getOrCreateRoomSession(examId: string, tenantId: string): Promise<string> {
    const roomName = this.formatRoomName(examId)

    const { data: existing } = await supabaseAdmin
      .from('livekit_room_sessions')
      .select('room_name')
      .eq('exam_id', examId)
      .eq('status', 'active')
      .maybeSingle()

    if (existing?.room_name) {
      return existing.room_name
    }

    try {
      await supabaseAdmin
        .from('livekit_room_sessions')
        .insert({
          exam_id: examId,
          tenant_id: tenantId,
          room_name: roomName,
          status: 'active',
        })
    } catch {
      // Non-blocking fallback
    }

    return roomName
  }
}

