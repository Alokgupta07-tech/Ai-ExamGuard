-- AI ExamGuard Database Schema
-- Migration 002: Exam Management
-- Created: 2026-11-10
-- Description: Exams, questions, and assessment structures

-- ==============================================
-- 6. EXAMS
-- ==============================================

CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'active', 'completed', 'archived');

CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status public.exam_status NOT NULL DEFAULT 'draft',
    settings JSONB DEFAULT '{"require_camera": true, "require_audio": true, "require_fullscreen": true, "max_violations_threshold": 10}'::jsonb,
    total_points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_duration CHECK (duration_minutes <= EXTRACT(EPOCH FROM (end_time - start_time)) / 60),
    CONSTRAINT settings_valid_json CHECK (jsonb_typeof(settings) = 'object')
);

CREATE INDEX idx_exams_course ON public.exams(course_id);
CREATE INDEX idx_exams_tenant ON public.exams(tenant_id);
CREATE INDEX idx_exams_status ON public.exams(status);
CREATE INDEX idx_exams_timing ON public.exams(start_time, end_time);
CREATE INDEX idx_exams_tenant_status ON public.exams(tenant_id, status);

COMMENT ON TABLE public.exams IS 'Examination definitions and schedules';
COMMENT ON COLUMN public.exams.settings IS 'Proctoring configuration (require_camera, require_audio, etc.)';

-- ==============================================
-- 7. QUESTIONS
-- ==============================================

CREATE TYPE public.question_type AS ENUM ('mcq_single', 'mcq_multiple', 'true_false', 'short_answer', 'essay');

CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    type public.question_type NOT NULL,
    prompt TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1 CHECK (points >= 0),
    explanation TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_question_order UNIQUE (exam_id, order_index),
    CONSTRAINT metadata_valid_json CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_questions_exam ON public.questions(exam_id);
CREATE INDEX idx_questions_exam_order ON public.questions(exam_id, order_index);

COMMENT ON TABLE public.questions IS 'Questions linked to exams';
COMMENT ON COLUMN public.questions.prompt IS 'Rich text or Markdown question body';
COMMENT ON COLUMN public.questions.explanation IS 'Post-exam solution explanation (not visible during exam)';

-- ==============================================
-- 8. QUESTION_ANSWER_KEYS (MCQ Options)
-- ==============================================

CREATE TABLE public.question_answer_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    content TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_option_order UNIQUE (question_id, order_index),
    CONSTRAINT unique_option_label UNIQUE (question_id, label)
);

CREATE INDEX idx_answer_keys_question ON public.question_answer_keys(question_id);

COMMENT ON TABLE public.question_answer_keys IS 'Answer options for MCQ and True/False questions';
COMMENT ON COLUMN public.question_answer_keys.is_correct IS 'Correct answer flag - RESTRICTED to instructors/admins only';

-- ==============================================
-- 9. EXAM_QUESTIONS (Many-to-Many for Question Banks)
-- ==============================================

CREATE TABLE public.exam_questions (
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (exam_id, question_id),
    CONSTRAINT unique_exam_question_order UNIQUE (exam_id, order_index)
);

CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id, order_index);

COMMENT ON TABLE public.exam_questions IS 'Explicit exam-question associations for shared question banks';

-- ==============================================
-- 10. EXAM_ASSIGNMENTS (Future: Targeted Exam Distribution)
-- ==============================================

CREATE TABLE public.exam_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (exam_id, student_id)
);

CREATE INDEX idx_exam_assignments_exam ON public.exam_assignments(exam_id);
CREATE INDEX idx_exam_assignments_student ON public.exam_assignments(student_id);

COMMENT ON TABLE public.exam_assignments IS 'Optional targeted exam distribution to specific students';
