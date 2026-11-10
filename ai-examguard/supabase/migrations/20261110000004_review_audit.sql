-- AI ExamGuard Database Schema
-- Migration 004: Review and Audit
-- Created: 2026-11-10
-- Description: Review cases, actions, audit logs, and integrations

-- ==============================================
-- 15. REVIEW_CASES
-- ==============================================

CREATE TYPE public.review_status AS ENUM ('pending', 'in_review', 'cleared', 'flagged', 'escalated');

CREATE TABLE public.review_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status public.review_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    
    CONSTRAINT one_case_per_session UNIQUE (session_id)
);

CREATE INDEX idx_review_cases_tenant ON public.review_cases(tenant_id);
CREATE INDEX idx_review_cases_assigned ON public.review_cases(assigned_to);
CREATE INDEX idx_review_cases_status ON public.review_cases(status);
CREATE INDEX idx_review_cases_priority ON public.review_cases(tenant_id, status, priority DESC);

COMMENT ON TABLE public.review_cases IS 'Flagged sessions requiring human review';
COMMENT ON COLUMN public.review_cases.priority IS 'Review priority (1=highest, 10=lowest)';

-- ==============================================
-- 16. REVIEW_ACTIONS
-- ==============================================

CREATE TYPE public.review_action_type AS ENUM (
    'WARNING_SENT',
    'CAMERA_REALIGNMENT_REQUESTED',
    'SESSION_PAUSED',
    'SESSION_TERMINATED',
    'MANUAL_FLAG_ADDED',
    'MANUAL_FLAG_REMOVED',
    'CASE_CLEARED',
    'CASE_ESCALATED'
);

CREATE TABLE public.review_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action_type public.review_action_type NOT NULL,
    message TEXT,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_actions_case ON public.review_actions(review_case_id, created_at DESC);
CREATE INDEX idx_review_actions_session ON public.review_actions(session_id, created_at DESC);
CREATE INDEX idx_review_actions_reviewer ON public.review_actions(reviewer_id);

COMMENT ON TABLE public.review_actions IS 'Invigilator actions taken during exam sessions';
COMMENT ON COLUMN public.review_actions.acknowledged IS 'Has student acknowledged the action';

-- ==============================================
-- 17. AUDIT_LOGS
-- ==============================================

CREATE TYPE public.audit_action AS ENUM (
    'USER_LOGIN',
    'USER_LOGOUT',
    'EXAM_CREATED',
    'EXAM_PUBLISHED',
    'EXAM_STARTED',
    'EXAM_SUBMITTED',
    'EXAM_GRADED',
    'QUESTION_CREATED',
    'QUESTION_UPDATED',
    'QUESTION_DELETED',
    'SESSION_STARTED',
    'SESSION_SUBMITTED',
    'SESSION_TERMINATED',
    'VIOLATION_LOGGED',
    'REVIEW_ACTION_TAKEN',
    'SETTINGS_CHANGED',
    'ROLE_ASSIGNED',
    'ROLE_REVOKED'
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action public.audit_action NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT details_valid_json CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

COMMENT ON TABLE public.audit_logs IS 'Immutable system-wide audit trail';
COMMENT ON COLUMN public.audit_logs.details IS 'Action-specific metadata';

-- ==============================================
-- 18. INTEGRATION_CONFIGS
-- ==============================================

CREATE TYPE public.integration_type AS ENUM ('lms', 'sso', 'analytics', 'storage', 'notification');

CREATE TABLE public.integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    integration_type public.integration_type NOT NULL,
    provider_name TEXT NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT config_valid_json CHECK (jsonb_typeof(config) = 'object'),
    CONSTRAINT unique_tenant_integration UNIQUE (tenant_id, integration_type, provider_name)
);

CREATE INDEX idx_integration_configs_tenant ON public.integration_configs(tenant_id);
CREATE INDEX idx_integration_configs_type ON public.integration_configs(integration_type);

COMMENT ON TABLE public.integration_configs IS 'External system integration configurations';
COMMENT ON COLUMN public.integration_configs.config IS 'Encrypted integration credentials and settings';

-- ==============================================
-- 19. MODEL_VERSIONS
-- ==============================================

CREATE TABLE public.model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    model_name TEXT NOT NULL,
    version TEXT NOT NULL,
    model_type TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT false,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT config_valid_json CHECK (jsonb_typeof(config) = 'object'),
    CONSTRAINT metrics_valid_json CHECK (jsonb_typeof(performance_metrics) = 'object'),
    CONSTRAINT unique_model_version UNIQUE (model_name, version)
);

CREATE INDEX idx_model_versions_tenant ON public.model_versions(tenant_id);
CREATE INDEX idx_model_versions_type ON public.model_versions(model_type);
CREATE INDEX idx_model_versions_active ON public.model_versions(is_active) WHERE is_active = true;

COMMENT ON TABLE public.model_versions IS 'AI model version tracking and management';
COMMENT ON COLUMN public.model_versions.performance_metrics IS 'Accuracy, precision, recall metrics';
