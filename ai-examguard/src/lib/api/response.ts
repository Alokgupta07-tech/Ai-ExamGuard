import { NextResponse } from 'next/server';

export type ApiResponse<T = unknown> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function apiError(
  message: string,
  status = 400,
  code?: string,
  details?: unknown
) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: { message, code, details },
    },
    { status }
  );
}

export function apiUnauthorized(message = 'Unauthorized') {
  return apiError(message, 401, 'UNAUTHORIZED');
}

export function apiForbidden(message = 'Forbidden') {
  return apiError(message, 403, 'FORBIDDEN');
}

export function apiNotFound(message = 'Resource not found') {
  return apiError(message, 404, 'NOT_FOUND');
}

export function apiServerError(message = 'Internal server error', details?: unknown) {
  return apiError(message, 500, 'INTERNAL_SERVER_ERROR', details);
}
