-- AI ExamGuard Database Schema
-- Migration 011: Realtime Setup
-- Created: 2026-11-10
-- Description: Configure Supabase Realtime for live proctoring

-- ==============================================
-- ENABLE REALTIME FOR PROCTORING TABLES
-- ==============================================

-- Enable realtime for critical monitoring tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.proctor_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_cases;

COMMENT ON TABLE public.proctor_events IS 'Realtime enabled: Staff see violations as they occur';
COMMENT ON TABLE public.exam_sessions IS 'Realtime enabled: Staff see session status changes';
COMMENT ON TABLE public.review_actions IS 'Realtime enabled: Students see warnings instantly';
