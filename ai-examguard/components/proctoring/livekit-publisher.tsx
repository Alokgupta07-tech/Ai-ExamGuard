'use client'

import React, { useEffect, useState } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { Radio, ShieldCheck, WifiOff } from 'lucide-react'

export interface LiveKitPublisherProps {
  examId: string
  sessionId?: string | null
  enabled: boolean
  onConnected?: () => void
  onError?: (err: Error) => void
}

interface TokenResponse {
  token: string
  wsUrl: string
  roomName: string
}

/**
 * Edge WebRTC media publisher for student examination surveillance.
 * Publishes permitted camera and microphone tracks to the authorised LiveKit room.
 * Candidate permissions strictly prohibit subscribing to any other candidate's stream.
 */
export function LiveKitPublisher({
  examId,
  sessionId,
  enabled,
  onConnected,
  onError,
}: LiveKitPublisherProps) {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'authorizing' | 'connected' | 'error' | 'disconnected'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus('idle')
      setTokenData(null)
      return
    }

    let cancelled = false
    setConnectionStatus('authorizing')

    const acquireToken = async () => {
      try {
        const res = await fetch('/api/monitoring/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId,
            sessionId: sessionId ?? null,
            roleOverride: 'student',
          }),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error || 'Failed to acquire surveillance media token.')
        }

        const data = (await res.json()) as TokenResponse
        if (!cancelled) {
          setTokenData(data)
          setConnectionStatus('connected')
          onConnected?.()
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = (err as Error).message || 'Unable to connect to live proctoring stream.'
          setErrorMessage(msg)
          setConnectionStatus('error')
          onError?.(err as Error)
        }
      }
    }

    void acquireToken()

    return () => {
      cancelled = true
    }
  }, [enabled, examId, onError, onConnected, sessionId])

  if (!enabled || !tokenData) {
    return null
  }

  return (
    <div className="relative">
      {/* Active LiveKit WebRTC Session (Audio + Video publishing enabled) */}
      <LiveKitRoom
        serverUrl={tokenData.wsUrl}
        token={tokenData.token}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={() => setConnectionStatus('disconnected')}
        onError={(e) => {
          setErrorMessage(e.message)
          setConnectionStatus('error')
        }}
        data-lk-theme="default"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border bg-surface-elevated/90 transition-all">
          {connectionStatus === 'connected' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Radio className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">Live Surveillance Active</span>
            </>
          ) : connectionStatus === 'authorizing' ? (
            <>
              <ShieldCheck className="h-3 w-3 text-muted-foreground animate-spin" />
              <span className="text-muted-foreground">Authorizing Stream...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-warning" />
              <span className="text-warning">Reconnecting Stream...</span>
            </>
          )}
        </div>
      </LiveKitRoom>

      {errorMessage && (
        <p className="sr-only" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

