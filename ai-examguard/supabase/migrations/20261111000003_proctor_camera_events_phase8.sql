-- AI ExamGuard Database Schema
-- Migration 016: Phase 8 — Camera & Face Monitoring Events
-- Created: 2026-11-11
-- Description: Extend event_type enum with explicit local MediaPipe camera/face
--              monitoring events and align trust score penalty modifiers.

ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'FACE_NOT_VISIBLE';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'CAMERA_DISCONNECTED';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'CAMERA_PERMISSION_DENIED';

CREATE OR REPLACE FUNCTION public.calculate_trust_score_penalty(
  p_event_type public.event_type,
  p_severity public.event_severity
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  penalty DECIMAL(5,2);
BEGIN
  penalty := CASE p_severity
    WHEN 'low' THEN 2.00
    WHEN 'medium' THEN 5.00
    WHEN 'high' THEN 12.00
    WHEN 'critical' THEN 25.00
  END;

  penalty := penalty * CASE p_event_type
    WHEN 'MULTIPLE_FACES_DETECTED' THEN 1.5
    WHEN 'DEVTOOLS_DETECTED' THEN 1.3
    WHEN 'CAMERA_DISCONNECTED' THEN 1.2
    WHEN 'CAMERA_PERMISSION_DENIED' THEN 1.2
    WHEN 'FACE_NOT_VISIBLE' THEN 1.0
    WHEN 'WINDOW_BLUR' THEN 0.5
    ELSE 1.0
  END;

  RETURN penalty;
END;
$$;

