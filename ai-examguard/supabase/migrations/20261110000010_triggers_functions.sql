-- AI ExamGuard Database Schema
-- Migration 010: Triggers and Functions
-- Created: 2026-11-10
-- Description: Automated timestamps, trust score updates, and utility functions

-- ==============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION private.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION private.update_updated_at IS 'Automatically update updated_at timestamp';

-- Apply to all tables with updated_at column
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER exam_sessions_updated_at BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER session_answers_updated_at BEFORE UPDATE ON public.session_answers
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

CREATE TRIGGER integration_configs_updated_at BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

-- ==============================================
-- TRUST SCORE CALCULATION FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION public.calculate_trust_score_penalty(
  p_event_type public.event_type,
  p_severity public.event_severity
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  penalty DECIMAL(5,2);
BEGIN
  -- Severity-based penalties
  penalty := CASE p_severity
    WHEN 'low' THEN 2.00
    WHEN 'medium' THEN 5.00
    WHEN 'high' THEN 12.00
    WHEN 'critical' THEN 25.00
  END;
  
  -- Event-specific modifiers
  penalty := penalty * CASE p_event_type
    WHEN 'MULTIPLE_FACES_DETECTED' THEN 1.5
    WHEN 'DEVTOOLS_DETECTED' THEN 1.3
    WHEN 'WINDOW_BLUR' THEN 0.5
    ELSE 1.0
  END;
  
  RETURN penalty;
END;
$$;

COMMENT ON FUNCTION public.calculate_trust_score_penalty IS 'Calculate trust score penalty based on event type and severity';

-- ==============================================
-- PROCTOR EVENT TRIGGER: AUTO-UPDATE TRUST SCORE
-- ==============================================

CREATE OR REPLACE FUNCTION private.update_trust_score_on_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  penalty DECIMAL(5,2);
  current_score DECIMAL(5,2);
BEGIN
  -- Calculate penalty
  penalty := public.calculate_trust_score_penalty(NEW.event_type, NEW.severity);
  
  -- Update session trust score
  UPDATE public.exam_sessions
  SET trust_score = GREATEST(0.00, trust_score - penalty)
  WHERE id = NEW.session_id
  RETURNING trust_score INTO current_score;
  
  -- Auto-create review case if trust score drops below 50
  IF current_score < 50.00 THEN
    INSERT INTO public.review_cases (session_id, tenant_id, status, priority, summary)
    VALUES (
      NEW.session_id,
      NEW.tenant_id,
      'pending',
      CASE
        WHEN current_score < 25.00 THEN 1
        WHEN current_score < 40.00 THEN 3
        ELSE 5
      END,
      format('Trust score dropped to %s%%', current_score)
    )
    ON CONFLICT (session_id) DO UPDATE
    SET priority = EXCLUDED.priority,
        summary = EXCLUDED.summary;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER proctor_event_update_trust_score
AFTER INSERT ON public.proctor_events
FOR EACH ROW
EXECUTE FUNCTION private.update_trust_score_on_violation();

COMMENT ON TRIGGER proctor_event_update_trust_score ON public.proctor_events IS 'Auto-update trust score and create review case when violations occur';

-- ==============================================
-- PROFILE CREATION TRIGGER
-- ==============================================

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Auto-create profile when new user signs up';

-- ==============================================
-- AUDIT LOG HELPER FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION public.log_audit(
  p_tenant_id UUID,
  p_action public.audit_action,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address
  )
  VALUES (
    p_tenant_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    inet_client_addr()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

COMMENT ON FUNCTION public.log_audit IS 'Helper function to log audit events';

-- ==============================================
-- EXAM STATUS VALIDATION FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION private.validate_exam_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate status transitions
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- draft -> published, archived
    IF OLD.status = 'draft' AND NEW.status NOT IN ('published', 'archived') THEN
      RAISE EXCEPTION 'Invalid status transition from draft to %', NEW.status;
    END IF;
    
    -- published -> active, archived
    IF OLD.status = 'published' AND NEW.status NOT IN ('active', 'archived') THEN
      RAISE EXCEPTION 'Invalid status transition from published to %', NEW.status;
    END IF;
    
    -- active -> completed, archived
    IF OLD.status = 'active' AND NEW.status NOT IN ('completed', 'archived') THEN
      RAISE EXCEPTION 'Invalid status transition from active to %', NEW.status;
    END IF;
    
    -- Cannot un-archive
    IF OLD.status = 'archived' THEN
      RAISE EXCEPTION 'Cannot change status from archived';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER exam_validate_status_transition
BEFORE UPDATE ON public.exams
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION private.validate_exam_status_transition();

COMMENT ON TRIGGER exam_validate_status_transition ON public.exams IS 'Enforce valid exam status transitions';
