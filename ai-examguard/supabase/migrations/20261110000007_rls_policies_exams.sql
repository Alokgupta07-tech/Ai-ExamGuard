-- AI ExamGuard Database Schema
-- Migration 007: RLS Policies - Exams and Questions
-- Created: 2026-11-10
-- Description: Security policies for exams, questions, and answer keys

-- ==============================================
-- EXAMS POLICIES
-- ==============================================

-- SELECT: Different rules for different roles
-- Instructors/admins: All exams in tenant
-- Invigilators: Published/active exams
-- Students: Published/active/completed exams in enrolled courses
CREATE POLICY exam_select_instructors ON public.exams
FOR SELECT
USING (
  private.has_any_role(tenant_id, 'instructor', 'admin')
);

CREATE POLICY exam_select_invigilators ON public.exams
FOR SELECT
USING (
  private.has_role(tenant_id, 'invigilator')
  AND status IN ('published', 'active', 'completed')
);

CREATE POLICY exam_select_students ON public.exams
FOR SELECT
USING (
  private.has_role(tenant_id, 'student')
  AND status IN ('published', 'active', 'completed')
  AND private.is_enrolled(course_id)
);

-- INSERT: Instructors can create exams for their courses
CREATE POLICY exam_insert_instructors ON public.exams
FOR INSERT
WITH CHECK (
  private.has_any_role(tenant_id, 'instructor', 'admin')
  AND (created_by = auth.uid() OR private.has_role(tenant_id, 'admin'))
  AND private.is_course_instructor(course_id) OR private.has_role(tenant_id, 'admin')
);

-- UPDATE: Exam creator or admin can update
CREATE POLICY exam_update_authorized ON public.exams
FOR UPDATE
USING (
  created_by = auth.uid() OR
  private.has_role(tenant_id, 'admin')
)
WITH CHECK (
  created_by = auth.uid() OR
  private.has_role(tenant_id, 'admin')
);

-- DELETE: Only exam creator or admin
CREATE POLICY exam_delete_authorized ON public.exams
FOR DELETE
USING (
  created_by = auth.uid() OR
  private.has_role(tenant_id, 'admin')
);

COMMENT ON POLICY exam_select_instructors ON public.exams IS 'Instructors/admins see all tenant exams';
COMMENT ON POLICY exam_select_students ON public.exams IS 'Students see published exams in enrolled courses';

-- ==============================================
-- QUESTIONS POLICIES
-- ==============================================

-- SELECT: Exam visibility drives question visibility
CREATE POLICY question_select_via_exam ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        -- Instructors/admins see all
        private.has_any_role(e.tenant_id, 'instructor', 'admin')
        OR
        -- Students see questions during active exam
        (
          private.has_role(e.tenant_id, 'student')
          AND e.status IN ('published', 'active', 'completed')
          AND private.is_enrolled(e.course_id)
        )
      )
  )
);

-- INSERT: Exam creator or admin can add questions
CREATE POLICY question_insert_authorized ON public.questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

-- UPDATE: Exam creator or admin can update questions
CREATE POLICY question_update_authorized ON public.questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

-- DELETE: Exam creator or admin
CREATE POLICY question_delete_authorized ON public.questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

-- ==============================================
-- QUESTION_ANSWER_KEYS POLICIES (CRITICAL SECURITY)
-- ==============================================

-- SELECT: ONLY instructors/admins can see answer keys
-- Students MUST NEVER see is_correct column
CREATE POLICY answer_key_select_instructors_only ON public.question_answer_keys
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exams e ON e.id = q.exam_id
    WHERE q.id = question_id
      AND private.has_any_role(e.tenant_id, 'instructor', 'admin')
  )
);

-- INSERT: Exam creator or admin only
CREATE POLICY answer_key_insert_authorized ON public.question_answer_keys
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exams e ON e.id = q.exam_id
    WHERE q.id = question_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

-- UPDATE: Exam creator or admin only
CREATE POLICY answer_key_update_authorized ON public.question_answer_keys
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exams e ON e.id = q.exam_id
    WHERE q.id = question_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exams e ON e.id = q.exam_id
    WHERE q.id = question_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

-- DELETE: Exam creator or admin only
CREATE POLICY answer_key_delete_authorized ON public.question_answer_keys
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exams e ON e.id = q.exam_id
    WHERE q.id = question_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

COMMENT ON POLICY answer_key_select_instructors_only ON public.question_answer_keys IS 'CRITICAL: Only instructors/admins see answer keys, NEVER students';

-- ==============================================
-- CREATE STUDENT-SAFE VIEW FOR QUESTION OPTIONS
-- ==============================================

-- View excludes is_correct column for safe student access
CREATE OR REPLACE VIEW public.question_options_student_view AS
SELECT 
  id,
  question_id,
  label,
  content,
  order_index,
  created_at
FROM public.question_answer_keys;

GRANT SELECT ON public.question_options_student_view TO authenticated;

COMMENT ON VIEW public.question_options_student_view IS 'Student-safe view of question options WITHOUT is_correct column';

-- ==============================================
-- EXAM_QUESTIONS POLICIES
-- ==============================================

CREATE POLICY exam_question_select_via_exam ON public.exam_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        private.has_any_role(e.tenant_id, 'instructor', 'admin')
        OR
        (
          private.has_role(e.tenant_id, 'student')
          AND e.status IN ('published', 'active', 'completed')
          AND private.is_enrolled(e.course_id)
        )
      )
  )
);

CREATE POLICY exam_question_insert_authorized ON public.exam_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

CREATE POLICY exam_question_delete_authorized ON public.exam_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

-- ==============================================
-- EXAM_ASSIGNMENTS POLICIES
-- ==============================================

CREATE POLICY exam_assignment_select_authorized ON public.exam_assignments
FOR SELECT
USING (
  student_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND private.has_any_role(e.tenant_id, 'instructor', 'admin', 'invigilator')
  )
);

CREATE POLICY exam_assignment_insert_instructors ON public.exam_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);

CREATE POLICY exam_assignment_delete_instructors ON public.exam_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
      AND (
        e.created_by = auth.uid() OR
        private.has_role(e.tenant_id, 'admin')
      )
  )
);
