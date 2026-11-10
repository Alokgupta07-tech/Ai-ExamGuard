# 🚀 Quick Start: Apply Migrations to Supabase

## Method 1: Supabase Dashboard (Easiest)

### Step 1: Access SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your 'AI ExamGuard' project
3. Click **SQL Editor** in the left sidebar

### Step 2: Apply Migrations in Order

Copy and paste each migration file content into the SQL Editor and click **Run**.

**⚠️ CRITICAL: Apply in this exact order!**

#### Migration 1/12: Core Schema
\\\
File: supabase/migrations/20261110000001_core_schema.sql
\\\
- Creates: tenants, profiles, memberships, courses, enrollments
- Click **RUN** and wait for "Success"

#### Migration 2/12: Exam Management
\\\
File: supabase/migrations/20261110000002_exam_management.sql
\\\
- Creates: exams, questions, question_answer_keys, exam_questions, exam_assignments

#### Migration 3/12: Session Monitoring
\\\
File: supabase/migrations/20261110000003_session_monitoring.sql
\\\
- Creates: exam_sessions, session_answers, proctor_events, evidence_assets

#### Migration 4/12: Review & Audit
\\\
File: supabase/migrations/20261110000004_review_audit.sql
\\\
- Creates: review_cases, review_actions, audit_logs, integration_configs, model_versions

#### Migration 5/12: RLS Setup
\\\
File: supabase/migrations/20261110000005_rls_setup.sql
\\\
- Creates security helper functions
- Enables RLS on all tables

#### Migration 6/12: RLS Policies - Core
\\\
File: supabase/migrations/20261110000006_rls_policies_core.sql
\\\
- Creates RLS policies for core tables

#### Migration 7/12: RLS Policies - Exams
\\\
File: supabase/migrations/20261110000007_rls_policies_exams.sql
\\\
- Creates RLS policies for exams
- **CRITICAL**: Protects answer keys from students

#### Migration 8/12: RLS Policies - Sessions
\\\
File: supabase/migrations/20261110000008_rls_policies_sessions.sql
\\\
- Creates RLS policies for exam sessions

#### Migration 9/12: RLS Policies - Review
\\\
File: supabase/migrations/20261110000009_rls_policies_review_audit.sql
\\\
- Creates RLS policies for review and audit

#### Migration 10/12: Triggers & Functions
\\\
File: supabase/migrations/20261110000010_triggers_functions.sql
\\\
- Creates automated triggers
- Trust score calculation
- Profile auto-creation

#### Migration 11/12: Realtime Setup
\\\
File: supabase/migrations/20261110000011_realtime_setup.sql
\\\
- Configures Realtime for live proctoring

#### Migration 12/12: Admin Bootstrap
\\\
File: supabase/migrations/20261110000012_admin_bootstrap.sql
\\\
- Creates bootstrap functions
- Role management functions

---

## ✅ Verification

After applying all 12 migrations, run this in SQL Editor:

\\\sql
-- Check all 19 tables exist
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: 19

-- Check RLS is enabled
SELECT COUNT(*) as rls_enabled_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
-- Expected: 19

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
\\\

---

## 🎯 Bootstrap Your First Tenant

After all migrations are applied:

\\\sql
-- Create your first tenant (you must be logged in)
SELECT * FROM public.bootstrap_tenant(
  'Stanford University',    -- Your institution name
  'stanford',               -- URL-safe slug
  'stanford.edu'            -- Email domain (optional)
);
\\\

This returns your \	enant_id\ and \dmin_user_id\. Save these!

---

## 👥 Grant Roles to Users

\\\sql
-- Grant instructor role
SELECT * FROM public.grant_user_role(
  '<your-tenant-id>',
  'professor@stanford.edu',
  'instructor'
);

-- Grant student role
SELECT * FROM public.grant_user_role(
  '<your-tenant-id>',
  'student@stanford.edu',
  'student'
);

-- Grant invigilator role
SELECT * FROM public.grant_user_role(
  '<your-tenant-id>',
  'proctor@stanford.edu',
  'invigilator'
);
\\\

---

## 🐛 Troubleshooting

### "syntax error at or near #"
- You copied a README file instead of a migration SQL file
- Make sure you're copying from \.sql\ files, not \.md\ files

### "relation already exists"
- A table was already created
- Either skip that migration or drop the database and start fresh

### "permission denied"
- You need database owner permissions
- Make sure you're in the correct Supabase project

### Migration fails partway through
- Note which line failed
- Check the error message
- You may need to manually fix or rollback
- Contact support with the error details

---

## 📚 Next Steps

After successful migration:

1. ✅ Update your \.env.local\ with database credentials
2. ✅ Generate TypeScript types: \supabase gen types typescript\
3. ✅ Test RLS policies (see SECURITY_CHECKLIST.md)
4. ✅ Create test data (optional, use seeds/development_seed.sql)
5. ✅ Start building features!

---

## 📞 Need Help?

- Check: \supabase/SECURITY_CHECKLIST.md\
- Check: \docs/DATABASE.md\
- Check: \docs/SECURITY.md\
- Open a GitHub issue with error details
