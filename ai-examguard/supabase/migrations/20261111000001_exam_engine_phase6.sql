-- AI ExamGuard Database Schema
-- Migration 014: Phase 6 — Examination Management Engine
-- Created: 2026-11-11
-- Description: Exam authoring fields (instructions, scoring policy, randomisation)
--              and question classification (category, difficulty).

-- ==============================================
-- EXAMS: authoring + scoring policy columns
-- ==============================================

ALTER TABLE public.exams
    ADD COLUMN instructions TEXT;

-- Passing threshold. 0 means "no explicit pass mark" until scoring config is set.
ALTER TABLE public.exams
    ADD COLUMN passing_marks INTEGER NOT NULL DEFAULT 0;

-- Negative marking as a FRACTION of the question's points deducted per wrong
-- answer (0 = off, 0.25 = quarter point, 0.33, 0.5). Stored numerically so the
-- grading engine stays deterministic.
ALTER TABLE public.exams
    ADD COLUMN negative_marking NUMERIC(4, 2) NOT NULL DEFAULT 0
        CHECK (negative_marking >= 0 AND negative_marking <= 1);

-- Question/option randomisation flags delivered to the exam-taking client.
ALTER TABLE public.exams
    ADD COLUMN shuffle_questions BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.exams
    ADD COLUMN shuffle_options BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.exams
    ADD CONSTRAINT exams_passing_marks_valid
        CHECK (passing_marks >= 0 AND passing_marks <= total_points);

CREATE INDEX idx_exams_tenant_created ON public.exams(tenant_id, created_by, status);

COMMENT ON COLUMN public.exams.instructions IS 'Candidate-facing instructions shown during preflight (not visible to students before publish)';
COMMENT ON COLUMN public.exams.passing_marks IS 'Minimum points required to pass; validated against total_points';
COMMENT ON COLUMN public.exams.negative_marking IS 'Fraction of question points deducted per wrong answer (0 = disabled)';
COMMENT ON COLUMN public.exams.shuffle_questions IS 'Randomise question order per candidate at exam start';
COMMENT ON COLUMN public.exams.shuffle_options IS 'Randomise answer option order per candidate at exam start';

-- ==============================================
-- QUESTIONS: classification
-- ==============================================

CREATE TYPE public.question_difficulty AS ENUM ('easy', 'medium', 'hard');

ALTER TABLE public.questions
    ADD COLUMN category TEXT;

ALTER TABLE public.questions
    ADD COLUMN difficulty public.question_difficulty NOT NULL DEFAULT 'medium';

CREATE INDEX idx_questions_category ON public.questions(category);
CREATE INDEX idx_questions_difficulty ON public.questions(exam_id, difficulty);

COMMENT ON COLUMN public.questions.category IS 'Free-form topic tag used for filtering the question bank (e.g. Chapter 4, Thermodynamics)';
COMMENT ON COLUMN public.questions.difficulty IS 'Authored difficulty label used by analytics and future adaptive delivery';

-- ==============================================
-- GUARDRAIL: a published exam must carry at least one question.
-- Enforced here (not in the wizard) so any publish path stays safe.
-- ==============================================

CREATE OR REPLACE FUNCTION private.validate_exam_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  question_count INTEGER;
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    SELECT COUNT(*) INTO question_count FROM public.questions WHERE exam_id = NEW.id;

    IF question_count = 0 THEN
      RAISE EXCEPTION 'Cannot publish an examination without at least one question';
    END IF;

    IF NEW.passing_marks > NEW.total_points THEN
      RAISE EXCEPTION 'Cannot publish: passing marks exceed total points';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER exam_validate_publish
BEFORE UPDATE ON public.exams
FOR EACH ROW
WHEN (NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published')
EXECUTE FUNCTION private.validate_exam_publish();

COMMENT ON TRIGGER exam_validate_publish ON public.exams IS 'Block publishing exams with no questions or invalid pass thresholds';
