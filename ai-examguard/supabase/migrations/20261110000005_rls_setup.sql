-- AI ExamGuard Database Schema
-- Migration 005: Row-Level Security (RLS) Setup
-- Created: 2026-11-10
-- Description: Security helper functions and base RLS policies

-- ==============================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================

-- Get authenticated user's role within a tenant
CREATE OR REPLACE FUNCTION private.get_user_role(target_tenant_id UUID)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.memberships
  WHERE tenant_id = target_tenant_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Check if user is member of tenant
CREATE OR REPLACE FUNCTION private.is_tenant_member(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE tenant_id = target_tenant_id
      AND user_id = auth.uid()
  );
$$;

-- Check if user has specific role in tenant
CREATE OR REPLACE FUNCTION private.has_role(target_tenant_id UUID, required_role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE tenant_id = target_tenant_id
      AND user_id = auth.uid()
      AND role = required_role
  );
$$;

-- Check if user has any of specified roles
CREATE OR REPLACE FUNCTION private.has_any_role(target_tenant_id UUID, VARIADIC roles public.user_role[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE tenant_id = target_tenant_id
      AND user_id = auth.uid()
      AND role = ANY(roles)
  );
$$;

-- Check if user is instructor of specific course
CREATE OR REPLACE FUNCTION private.is_course_instructor(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = target_course_id
      AND instructor_id = auth.uid()
  );
$$;

-- Check if user is enrolled in course
CREATE OR REPLACE FUNCTION private.is_enrolled(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE course_id = target_course_id
      AND student_id = auth.uid()
  );
$$;

-- Get tenant_id from course_id
CREATE OR REPLACE FUNCTION private.get_course_tenant(target_course_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id
  FROM public.courses
  WHERE id = target_course_id;
$$;

-- Get tenant_id from exam_id
CREATE OR REPLACE FUNCTION private.get_exam_tenant(target_exam_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id
  FROM public.exams
  WHERE id = target_exam_id;
$$;

-- Check if exam is currently active (between start and end time)
CREATE OR REPLACE FUNCTION private.is_exam_active(target_exam_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exams
    WHERE id = target_exam_id
      AND status = 'active'
      AND start_time <= now()
      AND end_time >= now()
  );
$$;

COMMENT ON FUNCTION private.get_user_role IS 'Get user role within tenant (SECURITY DEFINER)';
COMMENT ON FUNCTION private.is_tenant_member IS 'Check tenant membership (SECURITY DEFINER)';
COMMENT ON FUNCTION private.has_role IS 'Check specific role (SECURITY DEFINER)';
COMMENT ON FUNCTION private.has_any_role IS 'Check multiple roles (SECURITY DEFINER)';

-- ==============================================
-- ENABLE RLS ON ALL TABLES
-- ==============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
