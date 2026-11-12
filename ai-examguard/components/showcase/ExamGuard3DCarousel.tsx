'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  Monitor,
  ScanFace,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Video,
} from 'lucide-react';
import {
  ExamGuardFeatureCard,
  type FeatureCardData,
} from './ExamGuardFeatureCard';
import { ExamGuardCarouselControls } from './ExamGuardCarouselControls';

const FEATURE_CARDS: FeatureCardData[] = [
  {
    id: 'live-proctoring',
    index: 0,
    badge: 'LIVE WEBRTC SURVEILLANCE',
    title: 'Live Video Surveillance',
    shortDesc: 'LiveKit SFU streaming with strict publisher-subscriber isolation.',
    status: { label: 'WebRTC Live', tone: 'success' },
    back: {
      title: 'Live Media Transport & SFU',
      description:
        'Engineered for low-latency live video streaming. Students publish single camera and mic streams without peer-to-peer visibility, while authorized invigilators subscribe to live feeds in an adaptive resolution grid.',
      capabilities: [
        'Strict role isolation: Candidates cannot view or intercept peer video packets.',
        'Adaptive simulcast: Grid downscales to 180p spatial layers, full 720p on inspection.',
        'Ephemeral media: Zero continuous video recording persisted to databases.',
      ],
      techSpec: 'LiveKit SFU · H.264 / VP8 · <80ms WebRTC Latency',
      privacyNote: 'GDPR / FERPA Ephemeral Media Standard',
      moduleIcon: Video,
    },
  },
  {
    id: 'face-gaze',
    index: 1,
    badge: 'FACEMESH & 3D POSE',
    title: 'Face & Gaze Intelligence',
    shortDesc: '478-point landmark tracking with calibrated glance boundaries.',
    status: { label: 'Calibrated', tone: 'teal' },
    back: {
      title: 'Edge Face & Gaze Tracking',
      description:
        'Client-side MediaPipe landmark inference calculating 3D Euler angles (Yaw, Pitch, Roll) and iris center-fixation with personalized 3-second pre-flight calibration.',
      capabilities: [
        '3D Head Euler angles evaluated locally with zero frame uploads.',
        'Pre-flight center-fixation baseline calculating individual glance bounds.',
        'Temporal hysteresis filter eliminating single-frame false alarms.',
      ],
      techSpec: 'MediaPipe FaceLandmarker · 478 Mesh Points · 120ms Buffer',
      privacyNote: 'Local WASM Execution · No Biometric Persistence',
      moduleIcon: ScanFace,
    },
  },
  {
    id: 'phone-detection',
    index: 2,
    badge: 'EDGE OBJECT CLASSIFICATION',
    title: 'Device & Object Detection',
    shortDesc: 'Hardware-accelerated mobile phone and unauthorized aid detection.',
    status: { label: '1.8s Filter Active', tone: 'warning' },
    back: {
      title: 'Real-Time Hardware & Mobile Detection',
      description:
        'Lightweight vision classifier running locally inside the student browser via ONNX Runtime Web to detect mobile phones, secondary computers, and unauthorized items.',
      capabilities: [
        'Multi-class object detection: Flagging phones, laptops, and multiple individuals.',
        '1.8s–2.5s sustained verification threshold preventing momentary false positives.',
        'Hardware acceleration via WebGPU with multi-threaded WASM SIMD fallback.',
      ],
      techSpec: 'ONNX Runtime Web · EfficientDet-Lite0 · WebGPU/WASM',
      privacyNote: 'Zero Server Video Storage · Client Inferences Only',
      moduleIcon: Smartphone,
    },
  },
  {
    id: 'audio-intelligence',
    index: 3,
    badge: 'SPECTRAL AUDIO VAD',
    title: 'Spectral Audio Intelligence',
    shortDesc: 'Frequency-domain voice activity detection isolating vocal formants.',
    status: { label: 'Formant Filtered', tone: 'teal' },
    back: {
      title: 'Acoustic & Spectral Analysis',
      description:
        'Web Audio API FFT spectral energy analysis isolating human vocal formant frequencies (300Hz–3.4kHz) while discarding ambient room noise and keyboard strokes.',
      capabilities: [
        'Vocal energy band ratio differentiating conversation from typing sounds.',
        'Zero audio recording: Mathematically evaluates spectral energy without saving voice.',
        'Continuous ambient baseline calibration adapting to local room acoustics.',
      ],
      techSpec: 'Web Audio API · 2048-pt FFT · Spectral Band Isolation',
      privacyNote: 'Zero Raw Audio Storage · Mathematical Energy Telemetry Only',
      moduleIcon: Mic,
    },
  },
  {
    id: 'secure-exam',
    index: 4,
    badge: 'DESKTOP LOCKDOWN',
    title: 'Cross-Platform Lockdown',
    shortDesc: 'Native Tauri 2 + Rust OS lockdown with Safe Exam Browser validation.',
    status: { label: 'Tauri 2 / SEB', tone: 'success' },
    back: {
      title: 'Native Client & Environment Lockdown',
      description:
        'For high-stakes examinations, AI ExamGuard provides dedicated desktop lockdown clients with low-level OS hooks, plus native Safe Exam Browser (SEB) configuration support.',
      capabilities: [
        'Native OS hooks blocking Alt+Tab, Win, Cmd+Tab, Mission Control, and shortcuts.',
        'Safe Exam Browser XML configuration with Browser Exam Key (BEK) HMAC verification.',
        'Multi-platform support for Windows Kiosk, macOS AppKit, and Linux Wayland.',
      ],
      techSpec: 'Tauri 2 · Rust Platform Core · SEB 3.7+ XML Integration',
      privacyNote: 'Cryptographic Attestation · Zero Peripheral Snooping',
      moduleIcon: Monitor,
    },
  },
  {
    id: 'integrity-intelligence',
    index: 5,
    badge: 'PROGRESSIVE INTEGRITY ENGINE',
    title: 'Integrity Intelligence',
    shortDesc: 'Server-authoritative 3-strike warning engine with human audit trail.',
    status: { label: 'Progressive Policy', tone: 'neutral' },
    back: {
      title: 'Multi-Sensor Corroboration & Warnings',
      description:
        'Correlates multi-modal telemetry to prevent single-sensor false flags. Operates an institutional Three-Strike warning policy with automatic submission safeguards.',
      capabilities: [
        'Cross-sensor incident validation: Corroborates gaze, audio, and device events.',
        'Server-signed warning increments with candidate notification dialogues.',
        'Automatic submission on Strike 3 with instant answer state preservation.',
      ],
      techSpec: 'PostgreSQL RLS · SHA-256 Audit Chain · Server-Authoritative',
      privacyNote: 'Human-in-the-Loop Review · Institutional Override Support',
      moduleIcon: ShieldAlert,
    },
  },
];

export function ExamGuard3DCarousel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cylinderRef = useRef<HTMLDivElement | null>(null);

  // Animation values stored in mutable refs to guarantee 0 React re-renders at 60 FPS
  const currentAngleRef = useRef<number>(0);
  const targetAngleRef = useRef<number>(0);
  const currentTiltXRef = useRef<number>(0);
  const targetTiltXRef = useRef<number>(0);
  const currentTiltYRef = useRef<number>(0);
  const targetTiltYRef = useRef<number>(0);

  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartAngleRef = useRef<number>(0);
  const isHoveredRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isVisibleRef = useRef<boolean>(true);
  const rafIdRef = useRef<number | null>(null);
  const lastActiveIndexRef = useRef<number>(0);

  // High-level UI state (updated only on discrete transitions, NOT every frame)
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Attach change listeners for prefers-reduced-motion and window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaMotion.addEventListener('change', handleMotionChange);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);

    return () => {
      mediaMotion.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Responsive cylindrical radius: 380px on desktop, 290px on mobile
  const radius = useMemo(() => {
    return isMobile ? 290 : 380;
  }, [isMobile]);

  // Handle active card flip toggle
  const toggleFlip = useCallback((cardIndex: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardIndex]: !prev[cardIndex],
    }));
  }, []);

  // Rotate to specific card index
  const selectIndex = useCallback((newIndex: number) => {
    const total = FEATURE_CARDS.length;
    const currentNorm = ((-Math.round(targetAngleRef.current / 60) % total) + total) % total;
    let diff = (newIndex - currentNorm) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    targetAngleRef.current -= diff * 60;
  }, []);

  const handleNext = useCallback(() => {
    targetAngleRef.current = Math.round(targetAngleRef.current / 60) * 60 - 60;
  }, []);

  const handlePrev = useCallback(() => {
    targetAngleRef.current = Math.round(targetAngleRef.current / 60) * 60 + 60;
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      return next;
    });
  }, []);

  // Continuous animation loop using requestAnimationFrame
  useEffect(() => {
    if (prefersReducedMotion) return;

    let running = true;

    const loop = () => {
      if (!running) return;

      // 1. Ambient Slow Auto-Rotation (when not hovered, not dragged, not paused, and visible)
      if (
        !isPausedRef.current &&
        !isHoveredRef.current &&
        !isDraggingRef.current &&
        isVisibleRef.current
      ) {
        targetAngleRef.current -= 0.04;
      }

      // 2. Smooth LERP interpolation for rotation angle
      const angleDelta = targetAngleRef.current - currentAngleRef.current;
      currentAngleRef.current += angleDelta * 0.085;

      // 3. Smooth LERP interpolation for mouse tilt (X and Y)
      const tiltXDelta = targetTiltXRef.current - currentTiltXRef.current;
      currentTiltXRef.current += tiltXDelta * 0.08;

      const tiltYDelta = targetTiltYRef.current - currentTiltYRef.current;
      currentTiltYRef.current += tiltYDelta * 0.08;

      // 4. Update cylinder DOM transform directly (Bypasses React reconciliation for pure 60-120fps)
      if (cylinderRef.current) {
        const tiltX = currentTiltXRef.current;
        const tiltY = currentTiltYRef.current;
        const rotY = currentAngleRef.current + tiltY;
        cylinderRef.current.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }

      // 5. Calculate closest front-facing card index
      const total = FEATURE_CARDS.length;
      const normalizedAngle = ((-currentAngleRef.current % 360) + 360) % 360;
      const computedIndex = Math.round(normalizedAngle / 60) % total;

      if (computedIndex !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = computedIndex;
        setActiveIndex(computedIndex);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [prefersReducedMotion]);

  // IntersectionObserver: Pause animation loop when out of viewport to preserve CPU/battery
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Document visibility listener: pause when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Mouse tilt handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isDraggingRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. +0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 .. +0.5

    targetTiltXRef.current = -ny * 10; // Max tilt X: ±5°
    targetTiltYRef.current = nx * 12; // Max tilt Y: ±6°
  }, []);

  const handleMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    targetTiltXRef.current = 0;
    targetTiltYRef.current = 0;
    isDraggingRef.current = false;
  }, []);

  // Drag & Touch interaction handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = targetAngleRef.current;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    targetAngleRef.current = dragStartAngleRef.current + deltaX * 0.32;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    // Snap cleanly to the nearest 60-degree card angle
    targetAngleRef.current = Math.round(targetAngleRef.current / 60) * 60;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process when container or child is focused or mouse is over carousel
      if (!isHoveredRef.current && document.activeElement !== containerRef.current) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFlip(lastActiveIndexRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, togglePause, toggleFlip]);

  return (
    <section
      id="features-3d"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full py-20 sm:py-28 overflow-hidden bg-background border-b border-border/80 select-none"
      aria-label="Interactive 3D AI ExamGuard Feature Showcase"
    >
      {/* Background Ambience & Lighting */}
      <div className="pointer-events-none absolute inset-0 bg-ambient-grid opacity-35" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-primary/5 rounded-full blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 space-y-12 sm:space-y-14">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>INTERACTIVE MULTIMODAL ARCHITECTURE</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Precision AI Engine in 360° Perspective.
          </h2>
          <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
            Rotate the cylindrical engine to inspect how live media streaming, edge computer vision,
            formant audio intelligence, and native desktop lockdown harmonize to protect assessment integrity.
          </p>
        </div>

        {/* ================= REDUCED MOTION STATIC HORIZONTAL FALLBACK ================= */}
        {prefersReducedMotion ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURE_CARDS.map((card) => (
              <div key={card.id} className="relative h-[440px]">
                <ExamGuardFeatureCard
                  card={card}
                  isActive={card.index === activeIndex}
                  isFlipped={Boolean(flippedCards[card.index])}
                  onFlip={() => toggleFlip(card.index)}
                  onClick={() => setActiveIndex(card.index)}
                  style={{ position: 'relative', width: '100%' }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* ================= 3D CYLINDRICAL CAROUSEL VIEWPORT ================= */
          <div
            className="relative w-full h-[540px] sm:h-[580px] flex items-center justify-center overflow-visible cursor-grab active:cursor-grabbing perspective-cylinder"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* 3D Rotating Cylinder Stage */}
            <div
              ref={cylinderRef}
              className="relative w-[280px] sm:w-[320px] h-[420px] sm:h-[440px] preserve-3d transform-gpu"
              style={{
                transform: 'rotateX(0deg) rotateY(0deg)',
              }}
            >
              {FEATURE_CARDS.map((card, idx) => {
                const angle = idx * 60; // 0, 60, 120, 180, 240, 300
                const isCurrent = idx === activeIndex;

                return (
                  <ExamGuardFeatureCard
                    key={card.id}
                    card={card}
                    isActive={isCurrent}
                    isFlipped={Boolean(flippedCards[card.index])}
                    onFlip={() => toggleFlip(card.index)}
                    onClick={() => {
                      if (isCurrent) {
                        toggleFlip(card.index);
                      } else {
                        selectIndex(card.index);
                      }
                    }}
                    style={{
                      transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Carousel Navigation & Control Strip */}
        <ExamGuardCarouselControls
          cards={FEATURE_CARDS}
          activeIndex={activeIndex}
          isPaused={isPaused}
          isFlipped={Boolean(flippedCards[activeIndex])}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelectIndex={selectIndex}
          onTogglePause={togglePause}
          onToggleFlip={() => toggleFlip(activeIndex)}
        />
      </div>
    </section>
  );
}
