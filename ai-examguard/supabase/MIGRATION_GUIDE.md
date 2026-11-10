# AI ExamGuard - Migration Application Guide

## Prerequisites

1. Log in to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: 'AI ExamGuard'
3. Navigate to: SQL Editor (left sidebar)

## Migration Instructions

Apply these migrations IN ORDER by copying and pasting each file into the SQL Editor.

### ⚠️ IMPORTANT: Apply in Sequential Order

DO NOT skip any migration. Each one builds on the previous.

---

## Migration 1: Core Schema
**File**: supabase/migrations/20261110000001_core_schema.sql
**Creates**: tenants, profiles, memberships, courses, enrollments
**Run this first**

---

## Migration 2: Exam Management
**File**: supabase/migrations/20261110000002_exam_management.sql
**Creates**: exams, questions, question_answer_keys, exam_questions, exam_assignments
**Requires**: Migration 1 completed

---

## Migration 3: Session Monitoring
**File**: supabase/migrations/20261110000003_session_monitoring.sql
**Creates**: exam_sessions, session_answers, proctor_events, evidence_assets
**Requires**: Migration 2 completed

---

## Migration 4: Review & Audit
**File**: supabase/migrations/20261110000004_review_audit.sql
**Creates**: review_cases, review_actions, audit_logs, integration_configs, model_versions
**Requires**: Migration 3 completed

---

## Migration 5: RLS Setup
**File**: supabase/migrations/20261110000005_rls_setup.sql
**Creates**: Security helper functions, enables RLS on all tables
**Requires**: Migration 4 completed

---

## Migration 6: RLS Policies - Core
**File**: supabase/migrations/20261110000006_rls_policies_core.sql
**Creates**: RLS policies for tenants, profiles, memberships, courses, enrollments
**Requires**: Migration 5 completed

---

## Migration 7: RLS Policies - Exams
**File**: supabase/migrations/20261110000007_rls_policies_exams.sql
**Creates**: RLS policies for exams, questions, answer keys (CRITICAL: Answer key protection)
**Requires**: Migration 6 completed

---

## Migration 8: RLS Policies - Sessions
**File**: supabase/migrations/20261110000008_rls_policies_sessions.sql
**Creates**: RLS policies for sessions, answers, proctor events, evidence
**Requires**: Migration 7 completed

---

## Migration 9: RLS Policies - Review & Audit
**File**: supabase/migrations/20261110000009_rls_policies_review_audit.sql
**Creates**: RLS policies for review cases, actions, audit logs, integrations
**Requires**: Migration 8 completed

---

## Migration 10: Triggers & Functions
**File**: supabase/migrations/20261110000010_triggers_functions.sql
**Creates**: Automated triggers, trust score calculation, profile creation
**Requires**: Migration 9 completed

---

## Migration 11: Realtime Setup
**File**: supabase/migrations/20261110000011_realtime_setup.sql
**Creates**: Realtime publication configuration for live proctoring
**Requires**: Migration 10 completed

---

## Migration 12: Admin Bootstrap
**File**: supabase/migrations/20261110000012_admin_bootstrap.sql
**Creates**: Secure tenant bootstrap and role management functions
**Requires**: Migration 11 completed

---

## After All Migrations

### Bootstrap Your First Tenant

Run in SQL Editor:

\\\sql
-- Replace with your details
SELECT * FROM public.bootstrap_tenant(
  'Your University Name',
  'your-university-slug',
  'youruniversity.edu'
);
\\\

This will:
- Create a new tenant
- Assign you as admin
- Return tenant_id and admin_user_id

### Grant Additional Roles

\\\sql
-- Grant instructor role
SELECT * FROM public.grant_user_role(
  '<tenant-id-from-bootstrap>',
  'instructor@university.edu',
  'instructor'
);

-- Grant student role
SELECT * FROM public.grant_user_role(
  '<tenant-id-from-bootstrap>',
  'student@university.edu',
  'student'
);
\\\

---

## Verification Queries

After applying all migrations, verify:

\\\sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check helper functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'private' 
ORDER BY routine_name;
\\\

Expected results:
- 19 tables in public schema
- All 19 tables have rowsecurity = true
- 8 helper functions in private schema

---

## Troubleshooting

### Error: "relation already exists"
- You may have partially applied a migration
- Check which tables exist: \SELECT tablename FROM pg_tables WHERE schemaname = 'public';\
- Drop incomplete tables or restore from backup

### Error: "syntax error"
- Make sure you copied the ENTIRE migration file
- Check for truncated content
- Re-copy from the file

### Error: "permission denied"
- You need to be the database owner
- Check you're using the correct Supabase project

---

## Need Help?

1. Check supabase/SECURITY_CHECKLIST.md for security verification
2. Check docs/DATABASE.md for schema documentation
3. Check docs/SECURITY.md for security architecture
4. Open a GitHub issue with error details
