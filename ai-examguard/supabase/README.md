# AI ExamGuard Database Setup Guide

## Overview

This directory contains versioned SQL migrations for the AI ExamGuard database schema. All migrations are designed for Supabase PostgreSQL with Row-Level Security (RLS).

## Migration Files

Migrations are numbered sequentially and must be applied in order:

1. **20261110000001_core_schema.sql** - Tenants, profiles, memberships, courses, enrollments
2. **20261110000002_exam_management.sql** - Exams, questions, answer keys, assignments
3. **20261110000003_session_monitoring.sql** - Exam sessions, answers, proctor events, evidence
4. **20261110000004_review_audit.sql** - Review cases, actions, audit logs, integrations, model versions
5. **20261110000005_rls_setup.sql** - Security helper functions and RLS enablement
6. **20261110000006_rls_policies_core.sql** - RLS policies for core tables
7. **20261110000007_rls_policies_exams.sql** - RLS policies for exams and questions (includes answer key protection)
8. **20261110000008_rls_policies_sessions.sql** - RLS policies for sessions and monitoring
9. **20261110000009_rls_policies_review_audit.sql** - RLS policies for review and audit
10. **20261110000010_triggers_functions.sql** - Automated triggers, trust score calculation
11. **20261110000011_realtime_setup.sql** - Supabase Realtime publication configuration
12. **20261110000012_admin_bootstrap.sql** - Secure admin bootstrap functions

## Security Guarantees

### Answer Key Protection
- Students **NEVER** see is_correct column in question_answer_keys
- Student queries use question_options_student_view which excludes answer keys
- RLS policies enforce instructor/admin-only access to answer keys
- Frontend code must never request or display correct answers during active exams

### Role-Based Access Control (RBAC)
- **Admin**: Full tenant management, user/role assignment (cannot self-assign/revoke)
- **Instructor**: Course and exam management, grading, review access
- **Invigilator**: Live session monitoring, intervention actions
- **Student**: Exam taking, own session/answer access only

### Tenant Isolation
- All data is scoped to 	enant_id
- RLS policies prevent cross-tenant data access
- Users cannot see data from other institutions

### Immutability
- Audit logs: No updates or deletes allowed
- Proctor events: Insert-only (no updates/deletes)
- Review cases: No deletes allowed
- Evidence assets: Admin-only deletion for GDPR compliance

### Anti-Tampering
- Students cannot view their own violation logs
- Trust scores updated automatically via triggers
- Session submissions validated server-side with grace period

## Applying Migrations

### Using Supabase CLI

\\\ash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push

# Or apply individually
psql <connection-string> -f supabase/migrations/20261110000001_core_schema.sql
\\\

### Using Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Paste migration contents in order
3. Run each migration sequentially

## Bootstrap First Tenant

After applying all migrations, bootstrap your first tenant:

\\\sql
-- First, sign up a user through Supabase Auth
-- Then call bootstrap with that user authenticated:

SELECT * FROM public.bootstrap_tenant(
  'Stanford University',
  'stanford',
  'stanford.edu'
);

-- Grant additional roles
SELECT * FROM public.grant_user_role(
  '<tenant-id>',
  'faculty@stanford.edu',
  'instructor'
);
\\\

## Type Generation

Generate TypeScript types from the schema:

\\\ash
# Using Supabase CLI
supabase gen types typescript --local > src/types/database.types.ts

# Or from remote
supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.types.ts
\\\

## Testing RLS Policies

Run policy tests to verify security:

\\\sql
-- Test as student (cannot see answer keys)
SET ROLE authenticated;
SET request.jwt.claim.sub = '<student-user-id>';

SELECT * FROM public.question_answer_keys; -- Should return empty or error

-- Test as instructor (can see answer keys)
SET request.jwt.claim.sub = '<instructor-user-id>';

SELECT * FROM public.question_answer_keys; -- Should return all options
\\\

## Security Limitations

### Known Constraints

1. **Browser Sandboxing**: Cannot prevent OS-level app switching (Alt+Tab, Cmd+Tab)
2. **Secondary Monitors**: Cannot fully block external display usage
3. **VM Detection**: Cannot reliably detect virtual machines in browser
4. **Screen Recording**: Cannot detect OBS, Discord, or system-level screen capture

### Privacy Compliance

- Evidence snapshots auto-expire after 30 days
- No continuous video/audio recording
- All AI processing happens locally in browser
- Students must consent to proctoring before exam

## Realtime Subscriptions

Tables enabled for Supabase Realtime:

- proctor_events - Violations stream to invigilator dashboard
- exam_sessions - Live session status updates
- eview_actions - Instant warnings to students
- eview_cases - New cases appear in review queue

## Development Seed Data

Test data is available in \supabase/seeds/development_seed.sql\:

\\\ash
psql <connection-string> -f supabase/seeds/development_seed.sql
\\\

**WARNING**: Never run seed data in production!

## Maintenance

### Evidence Cleanup

Set up a cron job to purge expired evidence:

\\\sql
DELETE FROM public.evidence_assets
WHERE expires_at < now();
\\\

### Trust Score Recalculation

If trust score formula changes:

\\\sql
-- Recalculate all active sessions
UPDATE public.exam_sessions es
SET trust_score = 100.00 - (
  SELECT COALESCE(SUM(public.calculate_trust_score_penalty(pe.event_type, pe.severity)), 0)
  FROM public.proctor_events pe
  WHERE pe.session_id = es.id
)
WHERE es.status = 'in_progress';
\\\

## Support

For questions or issues:
- Check \docs/DATABASE.md\ for detailed schema documentation
- Check \docs/SECURITY.md\ for security architecture
- Open a GitHub issue for bugs or feature requests
