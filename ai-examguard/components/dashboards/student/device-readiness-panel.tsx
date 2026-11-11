'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Maximize2, Mic, RefreshCw, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';

interface HardwareState {
  camera: 'idle' | 'ready' | 'denied' | 'unsupported';
  microphone: 'idle' | 'ready' | 'denied' | 'unsupported';
  fullscreenSupported: boolean;
  audioRms: number;
}

/**
 * Real browser camera, microphone RMS, and fullscreen readiness tester.
 */
export function DeviceReadinessPanel({ compact = false }: { compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [testing, setTesting] = useState(false);
  const [state, setState] = useState<HardwareState>(() => ({
    camera: 'idle',
    microphone: 'idle',
    fullscreenSupported:
      typeof document !== 'undefined' ? Boolean(document.fullscreenEnabled) : true,
    audioRms: 0,
  }));

  const stopDevices = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setTesting(false);
  };

  useEffect(() => {
    return () => {
      stopDevices();
    };
  }, []);

  const runDiagnostics = async () => {
    stopDevices();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({
        ...prev,
        camera: 'unsupported',
        microphone: 'unsupported',
      }));
      return;
    }

    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      // Web Audio RMS meter
      if (audioTracks.length > 0 && typeof AudioContext !== 'undefined') {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.fftSize);

        const tick = () => {
          analyser.getByteTimeDomainData(buffer);
          let sumSq = 0;
          for (let i = 0; i < buffer.length; i++) {
            const sample = buffer[i] ?? 128;
            const norm = (sample - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.min(100, Math.round(Math.sqrt(sumSq / buffer.length) * 320));
          setState((prev) => ({ ...prev, audioRms: rms }));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }

      setState({
        camera: videoTracks.length > 0 ? 'ready' : 'unsupported',
        microphone: audioTracks.length > 0 ? 'ready' : 'unsupported',
        fullscreenSupported: Boolean(document.fullscreenEnabled),
        audioRms: 0,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        camera: 'denied',
        microphone: 'denied',
      }));
      setTesting(false);
    }
  };

  const renderBadge = (status: HardwareState['camera']) => {
    if (status === 'ready') {
      return (
        <StatusBadge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>
          Verified
        </StatusBadge>
      );
    }
    if (status === 'denied' || status === 'unsupported') {
      return (
        <StatusBadge tone="critical" icon={<XCircle className="h-3 w-3" />}>
          {status === 'denied' ? 'Permission Denied' : 'Unsupported'}
        </StatusBadge>
      );
    }
    return <StatusBadge tone="neutral">Not Tested</StatusBadge>;
  };

  return (
    <div className="rounded-xl border border-[#243249] bg-[#111B2D] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-[#F8FAFC]">
            Browser Device Readiness
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Runs locally via browser MediaDevices & Web Audio API—nothing is uploaded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {testing ? (
            <Button size="sm" variant="outline" onClick={stopDevices}>
              Stop Test
            </Button>
          ) : (
            <Button size="sm" onClick={runDiagnostics}>
              <RefreshCw className="h-3.5 w-3.5" />
              Test Devices
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[#243249] bg-[#0B1220] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-[#F8FAFC]">
            <Camera className="h-4 w-4 text-[#38BDF8]" />
            <span>Webcam</span>
          </div>
          {renderBadge(state.camera)}
        </div>

        <div className="rounded-lg border border-[#243249] bg-[#0B1220] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-[#F8FAFC]">
            <Mic className="h-4 w-4 text-[#2DD4BF]" />
            <span>Microphone</span>
          </div>
          {renderBadge(state.microphone)}
        </div>

        <div className="rounded-lg border border-[#243249] bg-[#0B1220] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-[#F8FAFC]">
            <Maximize2 className="h-4 w-4 text-[#8B5CF6]" />
            <span>Fullscreen API</span>
          </div>
          <StatusBadge tone={state.fullscreenSupported ? 'success' : 'warning'}>
            {state.fullscreenSupported ? 'Available' : 'Restricted'}
          </StatusBadge>
        </div>
      </div>

      {!compact && testing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="rounded-lg border border-[#243249] bg-[#080D18] overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
          <div className="rounded-lg border border-[#243249] bg-[#0B1220] p-4 flex flex-col justify-center space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Live Microphone Energy (RMS)</span>
              <span className="font-mono text-[#2DD4BF]">{state.audioRms}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-[#17243A] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] transition-all duration-75"
                style={{ width: `${state.audioRms}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3B8]">
              Speak normally to verify microphone level calibration before launching an assessment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
