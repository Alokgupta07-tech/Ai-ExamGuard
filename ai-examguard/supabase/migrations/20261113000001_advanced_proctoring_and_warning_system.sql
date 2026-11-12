-- AI ExamGuard Database Schema
-- Migration 020: Advanced Proctoring, Object Detection & 3-Strike Warning System
-- Created: 2026-11-13
-- Description: Adds exam policies, session warning events, submission audit logs,
--              and server-authoritative warning counters to exam_sessions.

-- ==============================================
-- 1. EXTEND EXAM_SESSIONS TABLE
-- ==============================================

ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS warning_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_warnings INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_submission_reason TEXT,
  ADD COLUMN IF NOT EXISTS auto_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warning_policy_version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_warning_count ON public.exam_sessions(warning_count);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_auto_submitted ON public.exam_sessions(auto_submitted);

-- ==============================================
-- 2. EXAM_POLICIES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.exam_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    max_warnings INT NOT NULL DEFAULT 3 CHECK (max_warnings >= 1 AND max_warnings <= 10),
    fullscreen_required BOOLEAN NOT NULL DEFAULT TRUE,
    tab_switch_strike BOOLEAN NOT NULL DEFAULT TRUE,
    phone_detection_strike BOOLEAN NOT NULL DEFAULT TRUE,
    multiple_faces_strike BOOLEAN NOT NULL DEFAULT TRUE,
    additional_person_strike BOOLEAN NOT NULL DEFAULT TRUE,
    audio_vad_strike BOOLEAN NOT NULL DEFAULT TRUE,
    gaze_deviation_strike BOOLEAN NOT NULL DEFAULT FALSE,
    warning_cooldown_seconds INT NOT NULL DEFAULT 20 CHECK (warning_cooldown_seconds >= 5 AND warning_cooldown_seconds <= 120),
    auto_submission_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_exam_policy UNIQUE (exam_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_policies_exam ON public.exam_policies(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_policies_tenant ON public.exam_policies(tenant_id);

COMMENT ON TABLE public.exam_policies IS 'Configurable integrity and warning policies for examinations';

-- ==============================================
-- 3. SESSION_WARNING_EVENTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.session_warning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    strike_number INT NOT NULL CHECK (strike_number >= 1),
    event_type TEXT NOT NULL,
    source_module TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'high',
    confidence NUMERIC(4,3) NOT NULL DEFAULT 1.0,
    reason TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    server_validated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_warning_events_session ON public.session_warning_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_warning_events_student ON public.session_warning_events(student_id);
CREATE INDEX IF NOT EXISTS idx_session_warning_events_exam ON public.session_warning_events(exam_id);
CREATE INDEX IF NOT EXISTS idx_session_warning_events_tenant ON public.session_warning_events(tenant_id);

COMMENT ON TABLE public.session_warning_events IS 'Server-authoritative strike warnings issued to student sessions';

-- ==============================================
-- 4. EXAM_SUBMISSION_AUDIT TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.exam_submission_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    submission_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'auto_timeout', 'auto_policy_strikes'
    warning_count INT NOT NULL DEFAULT 0,
    answered_count INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    triggering_event JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_submission_audit_session ON public.exam_submission_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_submission_audit_student ON public.exam_submission_audit(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_submission_audit_tenant ON public.exam_submission_audit(tenant_id);

COMMENT ON TABLE public.exam_submission_audit IS 'Audit trail for exam submissions (manual and automated)';

-- ==============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public.exam_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_warning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submission_audit ENABLE ROW LEVEL SECURITY;

-- exam_policies RLS
CREATE POLICY exam_policies_read ON public.exam_policies
FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY exam_policies_manage_faculty_admin ON public.exam_policies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id = exam_policies.tenant_id
      AND p.role IN ('faculty', 'admin', 'super_admin')
  )
);

-- session_warning_events RLS
CREATE POLICY session_warning_events_read_own_or_staff ON public.session_warning_events
FOR SELECT
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id = session_warning_events.tenant_id
      AND p.role IN ('faculty', 'invigilator', 'admin', 'super_admin')
  )
);

-- exam_submission_audit RLS
CREATE POLICY exam_submission_audit_read_own_or_staff ON public.exam_submission_audit
FOR SELECT
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id = exam_submission_audit.tenant_id
      AND p.role IN ('faculty', 'invigilator', 'admin', 'super_admin')
  )
);

