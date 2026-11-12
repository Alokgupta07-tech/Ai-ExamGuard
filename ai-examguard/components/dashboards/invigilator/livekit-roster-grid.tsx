'use client'

import React, { useMemo } from 'react'
import {
  isTrackReference,
  LiveKitRoom,
  useTracks,
  VideoTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import {
  AlertTriangle,
  Camera,
  Maximize2,
  Mic,
  ShieldAlert,
  UserCheck,
  VideoOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionView } from '@/types/dashboard'

export interface LiveKitRosterGridProps {
  examId: string
  token: string
  wsUrl: string
  sessions: SessionView[]
  onInspectCandidate: (session: SessionView) => void
}

/**
 * Inner grid component subscribed to active remote WebRTC camera tracks.
 */
function RemoteTracksGrid({
  sessions,
  onInspectCandidate,
}: {
  sessions: SessionView[]
  onInspectCandidate: (session: SessionView) => void
}) {
  // Subscribe to all camera tracks published in this exam room
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ])

  // Map participant identities (student UUIDs) to their active video track
  const trackByIdentity = useMemo(() => {
    const map = new Map<string, (typeof tracks)[0]>()
    for (const t of tracks) {
      if (t.participant?.identity) {
        map.set(t.participant.identity, t)
      }
    }
    return map
  }, [tracks])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sessions.map((session) => {
        const studentId = session.studentId
        const trackRef = trackByIdentity.get(studentId)
        const strikes = session.warningCount ?? 0
        const isTerminated = session.autoSubmitted || strikes >= 3
        const isWarning = strikes > 0 && !isTerminated

        return (
          <div
            key={session.id}
            onClick={() => onInspectCandidate(session)}
            className={`group relative rounded-xl border overflow-hidden transition-all cursor-pointer bg-surface-elevated flex flex-col ${
              isTerminated
                ? 'border-destructive/60 ring-1 ring-destructive/40 shadow-destructive/10'
                : isWarning
                  ? 'border-warning/60 ring-1 ring-warning/30'
                  : 'border-border hover:border-primary/50'
            }`}
          >
            {/* Live Video Feed / Awaiting Stream Viewport */}
            <div className="relative aspect-video w-full bg-black/90 flex items-center justify-center overflow-hidden">
              {trackRef && isTrackReference(trackRef) ? (
                <VideoTrack
                  trackRef={trackRef}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center text-muted-foreground">
                  <VideoOff className="h-6 w-6 opacity-40 text-muted-foreground" />
                  <span className="text-[11px] font-mono">
                    {session.status === 'submitted'
                      ? 'Exam Submitted'
                      : 'Connecting Video Stream…'}
                  </span>
                </div>
              )}

              {/* Status Pill Overlays */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                {isTerminated ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-destructive text-destructive-foreground shadow">
                    <ShieldAlert className="h-3 w-3" />
                    3/3 TERMINATED
                  </span>
                ) : isWarning ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-warning text-warning-foreground shadow">
                    <AlertTriangle className="h-3 w-3" />
                    {strikes}/3 STRIKES
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-600/90 text-white backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              {/* Expand Inspect Action Button */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded-lg bg-black/60 text-white hover:bg-black/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    onInspectCandidate(session)
                  }}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Inspect Candidate</span>
                </Button>
              </div>

              {/* Sensor telemetry status bar at bottom of video */}
              <div className="absolute bottom-0 inset-x-0 px-2.5 py-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-[10px] font-mono text-white/90">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Camera className="h-3 w-3 text-emerald-400" />
                    Cam
                  </span>
                  <span className="flex items-center gap-1">
                    <Mic className="h-3 w-3 text-emerald-400" />
                    Mic
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <span>Trust {session.trustScore.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Candidate Metadata Footer */}
            <div className="p-3 space-y-1 bg-surface-elevated">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground truncate">
                  {session.studentName}
                </p>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {session.courseCode}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                {session.studentEmail}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Invigilator Multi-Candidate Live Surveillance Grid.
 * Subscribes to real-time WebRTC streams distributed by LiveKit SFU.
 */
export function LiveKitRosterGrid({
  examId: _examId,
  token,
  wsUrl,
  sessions,
  onInspectCandidate,
}: LiveKitRosterGridProps) {
  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      video={false} // Invigilator does NOT publish camera
      audio={false} // Invigilator does NOT publish mic to entire room
      data-lk-theme="default"
      className="w-full"
    >
      <RemoteTracksGrid
        sessions={sessions}
        onInspectCandidate={onInspectCandidate}
      />
    </LiveKitRoom>
  )
}

