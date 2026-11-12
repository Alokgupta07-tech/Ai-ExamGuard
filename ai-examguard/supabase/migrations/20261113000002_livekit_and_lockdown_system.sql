-- ==============================================================================
-- AI EXAMGUARD — LIVEKIT WEBRTC SURVEILLANCE & DESKTOP LOCKDOWN MIGRATION
-- Migration Version: 20261113000002
-- Extends proctoring infrastructure with LiveKit rooms, access audit,
-- desktop lockdown attestations, and examination proctoring policies.
-- ==============================================================================

-- 1. LiveKit Room Sessions Table
CREATE TABLE IF NOT EXISTS public.livekit_room_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  participant_count INTEGER NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 100,
  is_sharded BOOLEAN NOT NULL DEFAULT FALSE,
  shard_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_livekit_rooms_exam ON public.livekit_room_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_livekit_rooms_tenant ON public.livekit_room_sessions(tenant_id);

-- 2. Monitoring Access Audit Table (Mandatory for privacy compliance & GDPR/FERPA)
CREATE TABLE IF NOT EXISTS public.monitoring_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  invigilator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('live_video_subscribe', 'video_expanded_view', 'audio_listen', 'recording_download', 'timeline_inspect')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_access_audit_session ON public.monitoring_access_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_invigilator ON public.monitoring_access_audit(invigilator_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_accessed_at ON public.monitoring_access_audit(accessed_at DESC);

-- 3. Secure Client Attestations Table (Tauri 2 & Safe Exam Browser)
CREATE TABLE IF NOT EXISTS public.secure_client_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_type TEXT NOT NULL CHECK (client_type IN ('tauri_desktop', 'safe_exam_browser', 'standard_browser')),
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'macos', 'linux', 'web')),
  client_version TEXT NOT NULL,
  os_release TEXT,
  integrity_hash TEXT,
  kiosk_enforced BOOLEAN NOT NULL DEFAULT FALSE,
  virtual_machine_detected BOOLEAN NOT NULL DEFAULT FALSE,
  secondary_displays_detected INTEGER NOT NULL DEFAULT 0,
  unauthorized_processes_killed INTEGER NOT NULL DEFAULT 0,
  tamper_detected BOOLEAN NOT NULL DEFAULT FALSE,
  tamper_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_client_attestations_session ON public.secure_client_attestations(session_id);

-- 4. Invigilator Support Messages & Announcements Table
CREATE TABLE IF NOT EXISTS public.exam_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = exam-wide broadcast
  target_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('broadcast_announcement', 'candidate_support', 'technical_alert')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_support_messages_exam ON public.exam_support_messages(exam_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_session ON public.exam_support_messages(target_session_id);

-- 5. Extend exam_policies with LiveKit video and desktop lockdown options
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_policies' AND column_name = 'require_live_video') THEN
    ALTER TABLE public.exam_policies ADD COLUMN require_live_video BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_policies' AND column_name = 'allow_video_recording') THEN
    ALTER TABLE public.exam_policies ADD COLUMN allow_video_recording BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_policies' AND column_name = 'video_quality_preset') THEN
    ALTER TABLE public.exam_policies ADD COLUMN video_quality_preset TEXT NOT NULL DEFAULT 'balanced' CHECK (video_quality_preset IN ('low_bandwidth', 'balanced', 'high_clarity'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_policies' AND column_name = 'require_secure_client') THEN
    ALTER TABLE public.exam_policies ADD COLUMN require_secure_client BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_policies' AND column_name = 'seb_config_key') THEN
    ALTER TABLE public.exam_policies ADD COLUMN seb_config_key TEXT;
  END IF;
END $$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.livekit_room_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_client_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_support_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- LiveKit Rooms: Invigilators and Admins can view/manage rooms in their tenant; students can view their exam room
CREATE POLICY "livekit_rooms_tenant_isolation" ON public.livekit_room_sessions
FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Access Audit: Faculty and Admins can view audit logs; invigilators can insert audit records
CREATE POLICY "access_audit_insert" ON public.monitoring_access_audit
FOR INSERT TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "access_audit_select" ON public.monitoring_access_audit
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'instructor', 'invigilator')
  )
);

-- Attestations: Students can insert their own attestation; faculty/invigilators can read
CREATE POLICY "attestations_insert" ON public.secure_client_attestations
FOR INSERT TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "attestations_select" ON public.secure_client_attestations
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'instructor', 'invigilator')
  )
);

-- Support Messages: Invigilators can send broadcasts or 1-on-1 messages; students can receive messages targeted to them or broadcast
CREATE POLICY "support_messages_insert" ON public.exam_support_messages
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND sender_id = auth.uid()
);

CREATE POLICY "support_messages_select" ON public.exam_support_messages
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND (
    recipient_id IS NULL -- broadcast
    OR recipient_id = auth.uid()
    OR sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'instructor', 'invigilator')
    )
  )
);

