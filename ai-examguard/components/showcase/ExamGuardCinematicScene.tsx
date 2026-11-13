'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ExamGuard3DObject } from './ExamGuard3DObject';

export interface ExamGuardCinematicSceneProps {
  progress: number; // 0..1 scroll progress
  isPaused?: boolean;
}

/**
 * Creates a soft procedural shadow texture for grounding the 3D sculpture in studio space
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(23, 107, 91, 0.22)');
    gradient.addColorStop(0.35, 'rgba(24, 35, 33, 0.14)');
    gradient.addColorStop(0.7, 'rgba(24, 35, 33, 0.04)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function ExamGuardCinematicScene({
  progress,
  isPaused = false,
}: ExamGuardCinematicSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const targetProgressRef = useRef<number>(progress);
  const currentProgressRef = useRef<number>(progress);
  const isPausedRef = useRef<boolean>(isPaused);

  // Sync latest target progress in effect to avoid render-phase ref mutations
  useEffect(() => {
    targetProgressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Mouse tilt refs
  const targetTiltXRef = useRef<number>(0);
  const targetTiltYRef = useRef<number>(0);
  const currentTiltXRef = useRef<number>(0);
  const currentTiltYRef = useRef<number>(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Setup Three.js Scene & Renderer
    const scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const isSmallScreen = width < 768;
    camera.position.set(0, 0.1, isSmallScreen ? 8.4 : 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 2. Studio Lighting (Soft Pearl / Warm Ivory Illumination)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2ece8, 1.2);
    scene.add(hemiLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfffdfa, 1.8);
    keyLight.position.set(5, 7, 5);
    scene.add(keyLight);

    // Fill Light (Soft Teal Subsurface Reflection)
    const fillLight = new THREE.DirectionalLight(0xe0f2ee, 0.85);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    // Rim / Backlight
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(0, 8, -5);
    scene.add(rimLight);

    // 3. Ground Contact Shadow Plane
    const shadowTexture = createContactShadowTexture();
    const shadowGeom = new THREE.PlaneGeometry(6.5, 6.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -2.35;
    scene.add(shadowMesh);

    // 4. Procedural 3D Transform Object
    const examGuardObject = new ExamGuard3DObject();
    scene.add(examGuardObject.group);

    // 5. Mouse Interaction Listeners
    const handlePointerMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1 .. +1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2; // -1 .. +1
      targetTiltXRef.current = -ny * 0.12; // subtle pitch
      targetTiltYRef.current = nx * 0.18; // subtle yaw
    };

    const handlePointerLeave = () => {
      targetTiltXRef.current = 0;
      targetTiltYRef.current = 0;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // 6. Responsive Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const mobile = w < 768;

      camera.aspect = w / h;
      camera.position.z = mobile ? 8.4 : 7.2;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 7. Continuous Animation Loop with LERP Scrubbing
    let running = true;
    let rafId: number | null = null;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!running) return;

      if (isPausedRef.current) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const elapsedTime = clock.getElapsedTime();

      // Smooth LERP scroll progress interpolation
      const targetP = targetProgressRef.current;
      currentProgressRef.current += (targetP - currentProgressRef.current) * 0.085;

      // Smooth LERP mouse tilt
      currentTiltXRef.current +=
        (targetTiltXRef.current - currentTiltXRef.current) * 0.06;
      currentTiltYRef.current +=
        (targetTiltYRef.current - currentTiltYRef.current) * 0.06;

      // Apply tilt to main object
      examGuardObject.group.rotation.x = currentTiltXRef.current;
      examGuardObject.group.rotation.y = currentTiltYRef.current;

      // Update the 3-state procedural morph
      examGuardObject.update(currentProgressRef.current, elapsedTime);

      renderer.render(scene, camera);

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    // 8. Cleanup & Resource Disposal
    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);

      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);

      examGuardObject.dispose();
      shadowGeom.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: 'hidden' }}
      aria-hidden="true"
    />
  );
}

