-- Phase 14 Security Hardening: Column-Level Protection on exam_sessions
-- Prevents students with row-level UPDATE access (session_update_own_student)
-- from directly tampering with graded scores, submission status, trust scores,
-- timestamps, or risk engine fields via direct PostgREST API calls.

CREATE OR REPLACE FUNCTION private.enforce_exam_session_column_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  jwt_role TEXT := COALESCE(auth.role(), '');
  db_role TEXT := COALESCE(current_user, '');
  is_staff BOOLEAN := FALSE;
BEGIN
  -- Allow privileged backend/service-role and database owner migrations
  IF jwt_role = 'service_role' OR db_role IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    is_staff := private.has_any_role(
      OLD.tenant_id,
      'admin'::public.user_role,
      'instructor'::public.user_role,
      'invigilator'::public.user_role
    );
  END IF;

  IF is_staff THEN
    RETURN NEW;
  END IF;

  -- Non-staff callers (e.g. students via PostgREST) cannot mutate immutable
  -- identity, scoring, status, submission, or server-computed risk columns.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
     OR (to_jsonb(NEW) -> 'risk_category') IS DISTINCT FROM (to_jsonb(OLD) -> 'risk_category')
     OR (to_jsonb(NEW) -> 'risk_score') IS DISTINCT FROM (to_jsonb(OLD) -> 'risk_score')
     OR (to_jsonb(NEW) -> 'risk_summary') IS DISTINCT FROM (to_jsonb(OLD) -> 'risk_summary')
     OR (to_jsonb(NEW) -> 'last_risk_evaluated_at') IS DISTINCT FROM (to_jsonb(OLD) -> 'last_risk_evaluated_at')
  THEN
    RAISE EXCEPTION 'Forbidden: direct modification of protected exam_sessions fields is not permitted.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_exam_session_column_security ON public.exam_sessions;

CREATE TRIGGER trg_enforce_exam_session_column_security
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW
EXECUTE FUNCTION private.enforce_exam_session_column_security();

