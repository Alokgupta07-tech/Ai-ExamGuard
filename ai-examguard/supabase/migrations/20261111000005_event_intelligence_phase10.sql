-- Phase 10: Central Event Intelligence, Deduplication & Explainable Risk Engine
-- Adds canonical event metadata columns, unique client-event idempotency index,
-- session risk categorization ('NORMAL', 'REVIEW_SUGGESTED', 'PRIORITY_REVIEW'),
-- and anti-repeated-frame trigger guardrails.

ALTER TABLE public.proctor_events
  ADD COLUMN IF NOT EXISTS client_event_id UUID,
  ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_module TEXT NOT NULL DEFAULT 'browser_visibility',
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending_review';

ALTER TABLE public.proctor_events
  DROP CONSTRAINT IF EXISTS proctor_events_review_status_check;

ALTER TABLE public.proctor_events
  ADD CONSTRAINT proctor_events_review_status_check
  CHECK (review_status IN ('pending_review', 'acknowledged', 'cleared', 'flagged', 'dismissed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_proctor_events_session_client_event
  ON public.proctor_events (session_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proctor_events_exam_created
  ON public.proctor_events (exam_id, created_at DESC)
  WHERE exam_id IS NOT NULL;

ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS risk_category TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS risk_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.exam_sessions
  DROP CONSTRAINT IF EXISTS exam_sessions_risk_category_check;

ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_risk_category_check
  CHECK (risk_category IN ('NORMAL', 'REVIEW_SUGGESTED', 'PRIORITY_REVIEW'));

ALTER TABLE public.exam_sessions
  DROP CONSTRAINT IF EXISTS exam_sessions_risk_score_check;

ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_risk_score_check
  CHECK (risk_score >= 0.00 AND risk_score <= 100.00);

CREATE OR REPLACE FUNCTION private.update_trust_score_on_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  penalty DECIMAL(5,2);
  current_score DECIMAL(5,2);
  suppress_penalty BOOLEAN;
BEGIN
  suppress_penalty := COALESCE((NEW.details->'serverRiskEvaluation'->>'suppressTrustPenalty')::boolean, false);

  IF suppress_penalty THEN
    SELECT trust_score INTO current_score
    FROM public.exam_sessions
    WHERE id = NEW.session_id;
    RETURN NEW;
  END IF;

  penalty := public.calculate_trust_score_penalty(NEW.event_type, NEW.severity);

  UPDATE public.exam_sessions
  SET trust_score = GREATEST(0.00, trust_score - penalty)
  WHERE id = NEW.session_id
  RETURNING trust_score INTO current_score;

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
      format('Trust score dropped to %s%% — human review suggested', current_score)
    )
    ON CONFLICT (session_id) DO UPDATE
    SET priority = LEAST(public.review_cases.priority, EXCLUDED.priority),
        summary = EXCLUDED.summary;
  END IF;

  RETURN NEW;
END;
$$;

