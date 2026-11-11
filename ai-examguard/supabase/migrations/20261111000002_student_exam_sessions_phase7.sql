-- AI ExamGuard Database Schema
-- Migration 015: Phase 7 — Student Examination Session RLS Completion
-- Created: 2026-11-11
-- Description: Allow authenticated students to clear (DELETE) an answer row
--              from their own active in_progress session before submission.

CREATE POLICY answer_delete_own_student ON public.session_answers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
  )
);

COMMENT ON POLICY answer_delete_own_student ON public.session_answers IS 'Students may clear an optional answer during an active in_progress session';

