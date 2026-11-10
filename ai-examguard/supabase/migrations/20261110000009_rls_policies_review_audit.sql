-- AI ExamGuard Database Schema
-- Migration 009: RLS Policies - Review and Audit
-- Created: 2026-11-10
-- Description: Security policies for reviews, actions, audit logs, and integrations

-- ==============================================
-- REVIEW_CASES POLICIES
-- ==============================================

-- SELECT: Staff only
CREATE POLICY review_case_select_staff ON public.review_cases
FOR SELECT
USING (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

-- INSERT: Staff can create review cases
CREATE POLICY review_case_insert_staff ON public.review_cases
FOR INSERT
WITH CHECK (
  private.has_any_role(tenant_id, 'instructor', 'admin', 'invigilator')
);

-- UPDATE: Assigned reviewer or admin can update
CREATE POLICY review_case_update_authorized ON public.review_cases
FOR UPDATE
USING (
  assigned_to = auth.uid() OR
  private.has_role(tenant_id, 'admin')
)
WITH CHECK (
  assigned_to = auth.uid() OR
  private.has_role(tenant_id, 'admin')
);

-- NO DELETE: Review cases are permanent records
CREATE POLICY review_case_no_delete ON public.review_cases
FOR DELETE
USING (false);

-- ==============================================
-- REVIEW_ACTIONS POLICIES
-- ==============================================

-- SELECT: Student sees actions for own session, staff see all
CREATE POLICY review_action_select_student ON public.review_actions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
  )
);

CREATE POLICY review_action_select_staff ON public.review_actions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND private.has_any_role(es.tenant_id, 'instructor', 'admin', 'invigilator')
  )
);

-- INSERT: Invigilators and instructors can create actions
CREATE POLICY review_action_insert_staff ON public.review_actions
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND private.has_any_role(es.tenant_id, 'instructor', 'admin', 'invigilator')
  )
);

-- UPDATE: Student can acknowledge, reviewer can update own
CREATE POLICY review_action_update_student_ack ON public.review_actions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = session_id
      AND es.student_id = auth.uid()
  )
  AND acknowledged = false
)
WITH CHECK (
  acknowledged = true
  AND acknowledged_at = now()
);

CREATE POLICY review_action_update_reviewer ON public.review_actions
FOR UPDATE
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- NO DELETE: Actions are permanent audit trail
CREATE POLICY review_action_no_delete ON public.review_actions
FOR DELETE
USING (false);

COMMENT ON POLICY review_action_select_student ON public.review_actions IS 'Students see warnings/actions for own session';
COMMENT ON POLICY review_action_update_student_ack ON public.review_actions IS 'Students can acknowledge warnings only';

-- ==============================================
-- AUDIT_LOGS POLICIES
-- ==============================================

-- SELECT: Admins only
CREATE POLICY audit_log_select_admins ON public.audit_logs
FOR SELECT
USING (
  private.has_role(tenant_id, 'admin')
);

-- INSERT: All authenticated users (system logging)
CREATE POLICY audit_log_insert_authenticated ON public.audit_logs
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);

-- NO UPDATE OR DELETE: Audit logs are immutable
CREATE POLICY audit_log_no_update ON public.audit_logs
FOR UPDATE
USING (false);

CREATE POLICY audit_log_no_delete ON public.audit_logs
FOR DELETE
USING (false);

COMMENT ON POLICY audit_log_select_admins ON public.audit_logs IS 'Only admins can view audit logs';
COMMENT ON POLICY audit_log_no_update ON public.audit_logs IS 'Audit logs are immutable';

-- ==============================================
-- INTEGRATION_CONFIGS POLICIES
-- ==============================================

-- SELECT: Admins only
CREATE POLICY integration_config_select_admins ON public.integration_configs
FOR SELECT
USING (
  private.has_role(tenant_id, 'admin')
);

-- INSERT: Admins only
CREATE POLICY integration_config_insert_admins ON public.integration_configs
FOR INSERT
WITH CHECK (
  private.has_role(tenant_id, 'admin')
);

-- UPDATE: Admins only
CREATE POLICY integration_config_update_admins ON public.integration_configs
FOR UPDATE
USING (
  private.has_role(tenant_id, 'admin')
)
WITH CHECK (
  private.has_role(tenant_id, 'admin')
);

-- DELETE: Admins only
CREATE POLICY integration_config_delete_admins ON public.integration_configs
FOR DELETE
USING (
  private.has_role(tenant_id, 'admin')
);

-- ==============================================
-- MODEL_VERSIONS POLICIES
-- ==============================================

-- SELECT: All authenticated users can view active models
CREATE POLICY model_version_select_all ON public.model_versions
FOR SELECT
USING (
  is_active = true OR
  (tenant_id IS NOT NULL AND private.has_role(tenant_id, 'admin'))
);

-- INSERT: Admins only
CREATE POLICY model_version_insert_admins ON public.model_versions
FOR INSERT
WITH CHECK (
  tenant_id IS NULL OR private.has_role(tenant_id, 'admin')
);

-- UPDATE: Admins only
CREATE POLICY model_version_update_admins ON public.model_versions
FOR UPDATE
USING (
  tenant_id IS NULL OR private.has_role(tenant_id, 'admin')
)
WITH CHECK (
  tenant_id IS NULL OR private.has_role(tenant_id, 'admin')
);

-- DELETE: Admins only
CREATE POLICY model_version_delete_admins ON public.model_versions
FOR DELETE
USING (
  tenant_id IS NULL OR private.has_role(tenant_id, 'admin')
);
