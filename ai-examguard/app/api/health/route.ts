import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Lightweight institutional health-check endpoint for uptime monitoring,
 * load balancers, and production CI/CD verification.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbStatus: 'connected' | 'degraded' | 'unreachable' = 'connected';
  let dbLatencyMs = 0;

  try {
    const t0 = Date.now();
    const { error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(1)
      .maybeSingle();

    dbLatencyMs = Date.now() - t0;
    if (error) {
      dbStatus = 'degraded';
    }
  } catch {
    dbStatus = 'unreachable';
  }

  const payload = {
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    version: '0.1.0',
    platform: 'AI ExamGuard Institutional Assessment System',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - startedAt,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      aiEngine: {
        status: 'ready',
        models: ['MediaPipe FaceLandmarker', 'MediaPipe ObjectDetector', 'WebAudio VAD'],
      },
      integrityEngine: {
        status: 'active',
        policy: 'Three-Strike Server-Authoritative Engine',
      },
    },
  };

  return NextResponse.json(payload, {
    status: dbStatus === 'connected' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

