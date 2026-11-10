-- AI ExamGuard Database Schema
-- Migration 003: Session Management and Monitoring
-- Created: 2026-11-10
-- Description: Exam sessions, answers, and proctoring events

-- ==============================================
-- 11. EXAM_SESSIONS
-- ==============================================

CREATE TYPE public.session_status AS ENUM ('not_started', 'in_progress', 'submitted', 'terminated', 'under_review', 'graded');

CREATE TABLE public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    status public.session_status NOT NULL DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    score DECIMAL(5,2) CHECK (score >= 0.00 AND score <= 100.00),
    trust_score DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (trust_score >= 0.00 AND trust_score <= 100.00),
    hardware_status JSONB DEFAULT '{"camera": true, "microphone": true, "fullscreen": true}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT one_session_per_student UNIQUE (exam_id, student_id),
    CONSTRAINT valid_submission_time CHECK (submitted_at IS NULL OR submitted_at >= started_at),
    CONSTRAINT hardware_status_valid_json CHECK (jsonb_typeof(hardware_status) = 'object')
);

CREATE INDEX idx_exam_sessions_exam ON public.exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_student ON public.exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_tenant ON public.exam_sessions(tenant_id);
CREATE INDEX idx_exam_sessions_status ON public.exam_sessions(status);
CREATE INDEX idx_exam_sessions_tenant_status ON public.exam_sessions(tenant_id, status);

COMMENT ON TABLE public.exam_sessions IS 'Student exam attempt instances';
COMMENT ON COLUMN public.exam_sessions.trust_score IS 'Dynamic integrity confidence score (100 = perfect)';
COMMENT ON COLUMN public.exam_sessions.hardware_status IS 'Pre-flight hardware check results';

-- ==============================================
-- 12. SESSION_ANSWERS
-- ==============================================

CREATE TABLE public.session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    response_text TEXT,
    selected_option_id UUID REFERENCES public.question_answer_keys(id) ON DELETE SET NULL,
    selected_option_ids UUID[] DEFAULT ARRAY[]::UUID[],
    is_correct BOOLEAN,
    points_awarded DECIMAL(5,2) CHECK (points_awarded >= 0),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT one_answer_per_question UNIQUE (session_id, question_id),
    CONSTRAINT has_response CHECK (
        response_text IS NOT NULL OR 
        selected_option_id IS NOT NULL OR 
        array_length(selected_option_ids, 1) > 0
    )
);

CREATE INDEX idx_session_answers_session ON public.session_answers(session_id);
CREATE INDEX idx_session_answers_question ON public.session_answers(question_id);

COMMENT ON TABLE public.session_answers IS 'Individual answers recorded during exam attempts';
COMMENT ON COLUMN public.session_answers.selected_option_ids IS 'For multiple-select MCQ questions';

-- ==============================================
-- 13. PROCTOR_EVENTS
-- ==============================================

CREATE TYPE public.event_type AS ENUM (
    'NO_FACE_DETECTED',
    'MULTIPLE_FACES_DETECTED',
    'FACE_OCCLUDED',
    'TAB_SWITCH',
    'FULLSCREEN_EXIT',
    'WINDOW_BLUR',
    'AUDIO_ANOMALY',
    'CLIPBOARD_PASTE',
    'CONTEXT_MENU',
    'DEVTOOLS_DETECTED'
);

CREATE TYPE public.event_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.proctor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type public.event_type NOT NULL,
    severity public.event_severity NOT NULL,
    confidence DECIMAL(4,3) CHECK (confidence >= 0.000 AND confidence <= 1.000),
    details JSONB DEFAULT '{}'::jsonb,
    evidence_asset_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT details_valid_json CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX idx_proctor_events_session ON public.proctor_events(session_id, created_at DESC);
CREATE INDEX idx_proctor_events_tenant ON public.proctor_events(tenant_id);
CREATE INDEX idx_proctor_events_severity ON public.proctor_events(severity);
CREATE INDEX idx_proctor_events_type ON public.proctor_events(event_type);
CREATE INDEX idx_proctor_events_created ON public.proctor_events(created_at);

COMMENT ON TABLE public.proctor_events IS 'AI-generated proctoring anomaly events';
COMMENT ON COLUMN public.proctor_events.confidence IS 'AI model confidence score (0.000 to 1.000)';
COMMENT ON COLUMN public.proctor_events.details IS 'Event metadata (duration, coordinates, etc.)';

-- Note: Deduplication will be handled at application level due to PostgreSQL limitations
-- with immutable functions in unique indexes on TIMESTAMPTZ columns

-- ==============================================
-- 14. EVIDENCE_ASSETS
-- ==============================================

CREATE TABLE public.evidence_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.proctor_events(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER CHECK (file_size_bytes > 0),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    
    CONSTRAINT valid_file_type CHECK (file_type IN ('image/jpeg', 'image/png', 'video/webm'))
);

CREATE INDEX idx_evidence_assets_session ON public.evidence_assets(session_id);
CREATE INDEX idx_evidence_assets_tenant ON public.evidence_assets(tenant_id);
CREATE INDEX idx_evidence_assets_expires ON public.evidence_assets(expires_at);

COMMENT ON TABLE public.evidence_assets IS 'Low-resolution snapshots captured during violations';
COMMENT ON COLUMN public.evidence_assets.expires_at IS 'Auto-purge 30 days after capture for privacy compliance';

-- Add FK back to proctor_events
ALTER TABLE public.proctor_events 
ADD CONSTRAINT fk_proctor_events_evidence 
FOREIGN KEY (evidence_asset_id) REFERENCES public.evidence_assets(id) ON DELETE SET NULL;
