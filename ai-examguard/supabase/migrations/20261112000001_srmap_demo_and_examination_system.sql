-- AI ExamGuard Database Schema
-- Migration: SRM University-AP Demo Setup, Flexible Question Types, Academic Timetable, and Feedback
-- Created: 2026-11-12

-- ==============================================
-- 1. EXTEND QUESTION_TYPE ENUM
-- ==============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'question_type' AND e.enumlabel = 'mcq') THEN
    ALTER TYPE public.question_type ADD VALUE 'mcq';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'question_type' AND e.enumlabel = 'descriptive') THEN
    ALTER TYPE public.question_type ADD VALUE 'descriptive';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'question_type' AND e.enumlabel = 'long_answer') THEN
    ALTER TYPE public.question_type ADD VALUE 'long_answer';
  END IF;
END $$;

-- ==============================================
-- 2. ENHANCE EXAMS TABLE FOR PATTERNS & PROVISIONAL DRAFTS
-- ==============================================

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS max_questions_to_answer INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pattern_description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_provisional_draft BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS evaluation_type TEXT DEFAULT 'automated';

COMMENT ON COLUMN public.exams.exam_type IS 'Exam pattern type: mcq_cla3, written_midsem, written_endsem, or custom';
COMMENT ON COLUMN public.exams.max_questions_to_answer IS 'Max required questions to attempt (e.g. 5 for answer any 5 of 7)';
COMMENT ON COLUMN public.exams.evaluation_type IS 'automated (MCQ) or manual_faculty (written descriptive)';

-- ==============================================
-- 3. COURSE FACULTY ASSIGNMENTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.course_faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_course_faculty UNIQUE (course_id, faculty_id)
);

CREATE INDEX IF NOT EXISTS idx_course_faculty_course ON public.course_faculty(course_id);
CREATE INDEX IF NOT EXISTS idx_course_faculty_faculty ON public.course_faculty(faculty_id);
CREATE INDEX IF NOT EXISTS idx_course_faculty_tenant ON public.course_faculty(tenant_id);

ALTER TABLE public.course_faculty ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_faculty_select_tenant_members ON public.course_faculty
FOR SELECT
USING (private.is_tenant_member(tenant_id));

CREATE POLICY course_faculty_admin_modify ON public.course_faculty
FOR ALL
USING (private.has_role(tenant_id, 'admin'));

-- ==============================================
-- 4. ACADEMIC TIMETABLES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.academic_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 8),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_tenant_course_period UNIQUE (tenant_id, day_of_week, period_number, classroom)
);

CREATE INDEX IF NOT EXISTS idx_timetables_tenant ON public.academic_timetables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetables_course ON public.academic_timetables(course_id);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.academic_timetables(tenant_id, day_of_week);

ALTER TABLE public.academic_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY academic_timetables_select_members ON public.academic_timetables
FOR SELECT
USING (private.is_tenant_member(tenant_id));

CREATE POLICY academic_timetables_admin_modify ON public.academic_timetables
FOR ALL
USING (private.has_role(tenant_id, 'admin'));

-- ==============================================
-- 5. DEMONSTRATION FEEDBACK TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.demo_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    module_tested TEXT NOT NULL,
    rating_overall INTEGER NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
    rating_navigation INTEGER NOT NULL CHECK (rating_navigation BETWEEN 1 AND 5),
    rating_performance INTEGER NOT NULL CHECK (rating_performance BETWEEN 1 AND 5),
    bugs_encountered TEXT,
    suggestions TEXT,
    browser_info TEXT,
    is_reviewed BOOLEAN NOT NULL DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON public.demo_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed ON public.demo_feedback(tenant_id, is_reviewed);

ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;

-- Any authenticated tenant member can submit feedback
CREATE POLICY feedback_insert_member ON public.demo_feedback
FOR INSERT
WITH CHECK (private.is_tenant_member(tenant_id));

-- Users can view their own feedback, Admins can view all tenant feedback
CREATE POLICY feedback_select ON public.demo_feedback
FOR SELECT
USING (
  user_id = auth.uid() OR private.has_role(tenant_id, 'admin')
);

-- Only admins can update feedback (e.g. mark reviewed)
CREATE POLICY feedback_update_admin ON public.demo_feedback
FOR UPDATE
USING (private.has_role(tenant_id, 'admin'));

-- ==============================================
-- 6. AUTOMATIC IDEMPOTENT USER PROFILE & MEMBERSHIP TRIGGER
-- ==============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_tenant_id UUID;
  v_role public.user_role := 'student';
  v_tenant_slug TEXT;
  v_meta_role TEXT;
BEGIN
  -- Extract full_name and metadata
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- 1. Idempotently create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = now();

  -- 2. Determine target tenant (prefer srmap-demo or test-uni)
  v_tenant_slug := COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'srmap-demo');
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_tenant_slug LIMIT 1;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'test-uni' LIMIT 1;
  END IF;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 3. Determine role from user metadata
  v_meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_meta_role IN ('admin', 'instructor', 'invigilator', 'student') THEN
    v_role := v_meta_role::public.user_role;
  ELSIF v_meta_role = 'faculty' THEN
    v_role := 'instructor'::public.user_role;
  ELSE
    v_role := 'student'::public.user_role;
  END IF;

  -- 4. If tenant found, ensure membership exists
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.memberships (tenant_id, user_id, role)
    VALUES (v_tenant_id, NEW.id, v_role)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_created();

COMMENT ON FUNCTION public.handle_auth_user_created IS 'Automatically and idempotently provisions user profile and default tenant membership';

