import { ExamSessionError } from '@/lib/services/exam-session';
import { NextResponse } from 'next/server';

const SINGLE_IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

export function extractRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const rawCandidate = (forwardedFor?.split(',')[0] || realIp || '').trim();
  const ipAddress = rawCandidate && SINGLE_IP_RE.test(rawCandidate) ? rawCandidate : null;
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) || null;
  return { ipAddress, userAgent };
}

export function handleExamSessionApiError(
  error: unknown,
  fallbackMessage = 'Examination request failed.'
): NextResponse {
  if (error instanceof ExamSessionError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const msg = (error as Error)?.message || fallbackMessage;
  if (msg.startsWith('Unauthorized')) {
    return NextResponse.json(
      { error: msg, code: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (msg.startsWith('Forbidden')) {
    return NextResponse.json(
      { error: msg, code: 'FORBIDDEN' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return NextResponse.json(
    { error: msg, code: 'BAD_REQUEST' },
    { status: 400, headers: { 'Cache-Control': 'no-store' } }
  );
}

