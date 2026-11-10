-- AI ExamGuard Database Schema
-- Migration 008: RLS Policies - Sessions and Monitoring
-- Created: 2026-11-10
-- Description: Security policies for sessions, answers, and proctor events

-- ==============================================
-- EXAM_SESSIONS POLICIES
-- ==============================================

-- SELECT: Students see own sessions, staff see tenant sessions
CREATE POLICY session_select_own_student ON public.exam_sessions
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY session_select_staff ON public.exam_sessions
FOR SELECT
USING (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

-- INSERT: Students can create session for active exams they're enrolled in
CREATE POLICY session_insert_student ON public.exam_sessions
FOR INSERT
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.enrollments en ON en.course_id = e.course_id
    WHERE e.id = exam_id
      AND en.student_id = auth.uid()
      AND e.status IN ('published', 'active')
      AND e.start_time <= now()
      AND e.end_time >= now()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.exam_id = exam_sessions.exam_id
      AND es.student_id = auth.uid()
  )
);

-- UPDATE: Students can update own session (submit), staff can update any
CREATE POLICY session_update_own_student ON public.exam_sessions
FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY session_update_staff ON public.exam_sessions
FOR UPDATE
USING (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
)
WITH CHECK (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

COMMENT ON POLICY session_insert_student ON public.exam_sessions IS 'Students create session for enrolled exams only';
COMMENT ON POLICY session_update_own_student ON public.exam_sessions IS 'Students update own session (submit)';

-- ==============================================
-- SESSION_ANSWERS POLICIES
-- ==============================================

-- SELECT: Student sees own answers, staff see all in tenant
CREATE POLICY answer_select_own_student ON public.session_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
  )
);

CREATE POLICY answer_select_staff ON public.session_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND private.has_any_role(es.tenant_id, 'instructor', 'admin', 'invigilator')
  )
);

-- INSERT: Student can insert answers to own session
CREATE POLICY answer_insert_own_student ON public.session_answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    JOIN public.exams e ON e.id = es.exam_id
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
      AND e.end_time >= now()
  )
);

-- UPDATE: Student can update own answers before submission
CREATE POLICY answer_update_own_student ON public.session_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
  )
);

-- Staff can update for grading
CREATE POLICY answer_update_staff ON public.session_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND private.has_any_role(es.tenant_id, 'instructor', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND private.has_any_role(es.tenant_id, 'instructor', 'admin')
  )
);

COMMENT ON POLICY answer_insert_own_student ON public.session_answers IS 'Students submit answers during active session';

-- ==============================================
-- PROCTOR_EVENTS POLICIES
-- ==============================================

-- SELECT: Staff only (students CANNOT see their own violations to prevent tampering)
CREATE POLICY proctor_event_select_staff_only ON public.proctor_events
FOR SELECT
USING (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

-- INSERT: Students can log events for own active session
CREATE POLICY proctor_event_insert_student ON public.proctor_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
  )
  AND tenant_id = (
    SELECT es.tenant_id
    FROM public.exam_sessions es
    WHERE es.id = session_id
  )
);

-- Staff can insert manual events
CREATE POLICY proctor_event_insert_staff ON public.proctor_events
FOR INSERT
WITH CHECK (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

-- NO UPDATE OR DELETE: Events are immutable
CREATE POLICY proctor_event_no_update ON public.proctor_events
FOR UPDATE
USING (false);

CREATE POLICY proctor_event_no_delete ON public.proctor_events
FOR DELETE
USING (false);

COMMENT ON POLICY proctor_event_select_staff_only ON public.proctor_events IS 'CRITICAL: Students CANNOT see violations to prevent tampering';

-- ==============================================
-- EVIDENCE_ASSETS POLICIES
-- ==============================================

-- SELECT: Staff only
CREATE POLICY evidence_select_staff_only ON public.evidence_assets
FOR SELECT
USING (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

-- INSERT: Students can upload evidence for own session
CREATE POLICY evidence_insert_student ON public.evidence_assets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
  )
  AND tenant_id = (
    SELECT es.tenant_id
    FROM public.exam_sessions es
    WHERE es.id = session_id
  )
);

-- NO UPDATE: Evidence is immutable
CREATE POLICY evidence_no_update ON public.evidence_assets
FOR UPDATE
USING (false);

-- DELETE: Admin only for GDPR compliance
CREATE POLICY evidence_delete_admin ON public.evidence_assets
FOR DELETE
USING (
  private.has_role(tenant_id, 'admin')
);

COMMENT ON POLICY evidence_select_staff_only ON public.evidence_assets IS 'Only staff can view evidence snapshots';
