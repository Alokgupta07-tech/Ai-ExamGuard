# AI ExamGuard Database Security Checklist

## Pre-Deployment Checklist

### ✅ Schema Review

- [ ] All tables have proper primary keys (UUID)
- [ ] All foreign keys are defined with appropriate CASCADE/RESTRICT
- [ ] All timestamps use TIMESTAMPTZ (timezone-aware)
- [ ] All JSONB columns have valid JSON checks
- [ ] All enums are defined and constrained
- [ ] Unique constraints are properly defined
- [ ] Indexes are created for frequently queried columns

### ✅ RLS Policies

- [ ] RLS is enabled on ALL public tables
- [ ] Students cannot see is_correct in question_answer_keys
- [ ] Students can only access their own sessions and answers
- [ ] Instructors can only manage their own courses/exams
- [ ] Admins have tenant-scoped permissions (not global)
- [ ] Cross-tenant data access is prevented
- [ ] Users cannot self-assign privileged roles
- [ ] Audit logs and violations are immutable (no UPDATE/DELETE)

### ✅ Answer Key Protection

- [ ] question_answer_keys SELECT policy allows instructors/admins only
- [ ] question_options_student_view excludes is_correct column
- [ ] Frontend never requests answer keys during active exams
- [ ] Server-side grading validates answers without exposing keys
- [ ] API endpoints never include is_correct in student responses

### ✅ Security Functions

- [ ] All helper functions use SECURITY DEFINER
- [ ] Helper functions have SET search_path to prevent injection
- [ ] uth.uid() is used to identify current user
- [ ] Role checks use private.has_role() and private.has_any_role()
- [ ] Tenant membership validated with private.is_tenant_member()

### ✅ Triggers and Automation

- [ ] updated_at triggers on all relevant tables
- [ ] Trust score updates automatically on violation insert
- [ ] Review cases auto-created when trust score < 50
- [ ] Profile auto-created when auth user signs up
- [ ] Audit logging captures critical actions

### ✅ Authentication and Authorization

- [ ] JWT tokens validated server-side with supabase.auth.getUser()
- [ ] HTTP-only, secure, SameSite cookies for session storage
- [ ] Service role key NEVER exposed to frontend
- [ ] Publishable key used for client-side operations only
- [ ] Role-based route protection in middleware

### ✅ Audit and Compliance

- [ ] All sensitive actions logged to udit_logs
- [ ] Audit logs are immutable (no UPDATE/DELETE policies)
- [ ] Evidence assets auto-expire after 30 days
- [ ] Realtime publications configured for monitoring tables
- [ ] GDPR: Admins can delete evidence for privacy requests

### ✅ Bootstrap and Administration

- [ ] ootstrap_tenant() function requires authentication
- [ ] grant_user_role() prevents self-role-assignment
- [ ] evoke_user_role() prevents self-revocation
- [ ] Admin cannot remove own admin membership
- [ ] Tenant creation restricted (manual bootstrap only)

## Testing Checklist

### 🧪 RLS Policy Tests

\\\sql
-- Test 1: Student cannot see answer keys
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claim.sub TO '<student-user-id>';
  
  -- Should return 0 rows or access denied
  SELECT COUNT(*) FROM public.question_answer_keys;
ROLLBACK;

-- Test 2: Student can only see own sessions
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claim.sub TO '<student-user-id>';
  
  -- Should only return sessions for this student
  SELECT COUNT(*) FROM public.exam_sessions WHERE student_id != '<student-user-id>';
ROLLBACK;

-- Test 3: Student cannot see violation logs
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claim.sub TO '<student-user-id>';
  
  -- Should return 0 rows
  SELECT COUNT(*) FROM public.proctor_events;
ROLLBACK;

-- Test 4: Instructor can see answer keys for own exams
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claim.sub TO '<instructor-user-id>';
  
  -- Should return answer keys
  SELECT COUNT(*) FROM public.question_answer_keys;
ROLLBACK;

-- Test 5: Cross-tenant isolation
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claim.sub TO '<tenant-a-admin>';
  
  -- Should return 0 rows from tenant B
  SELECT COUNT(*) FROM public.exams WHERE tenant_id = '<tenant-b-id>';
ROLLBACK;

-- Test 6: Cannot self-assign admin role
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claim.sub TO '<regular-user-id>';
  
  -- Should fail
  INSERT INTO public.memberships (tenant_id, user_id, role)
  VALUES ('<tenant-id>', '<regular-user-id>', 'admin');
ROLLBACK;
\\\

### 🧪 Functional Tests

- [ ] Bootstrap tenant successfully creates tenant and admin membership
- [ ] Granting role to user succeeds (admin calling)
- [ ] Granting role to self fails (self-assignment prevention)
- [ ] Revoking own admin role fails
- [ ] Exam status transitions follow valid state machine
- [ ] Trust score decreases on violation insert
- [ ] Review case auto-created when trust score < 50
- [ ] Student can create session only for enrolled course
- [ ] Student can update answer only during in_progress status
- [ ] Submitted sessions cannot have answers modified

## Security Limitations (Documented)

### Cannot Be Enforced in Browser

- **OS-Level App Switching**: Alt+Tab, Cmd+Tab cannot be blocked
- **Secondary Monitors**: Cannot disable HDMI/DisplayPort outputs
- **Virtual Machines**: Cannot reliably detect VM environments
- **Screen Recording**: Cannot detect OBS, Discord, system capture
- **Remote Desktop**: Cannot detect RDP, TeamViewer, VNC sessions

### Mitigations

- **Transparent Communication**: Inform institutions of browser limitations
- **Human Review**: All violations require human invigilator judgment
- **Multi-Factor Signals**: Combine camera, audio, tab-switch, timing data
- **Future Native App**: Desktop application for enterprise deployments

## Production Deployment Steps

1. **Review all migrations** - Read each migration file carefully
2. **Test in staging** - Apply to staging database first
3. **Run security tests** - Execute RLS policy test suite
4. **Verify indexes** - Check query performance with EXPLAIN ANALYZE
5. **Apply migrations** - Run migrations in production (one-way, cannot rollback easily)
6. **Bootstrap first tenant** - Create initial admin and tenant
7. **Generate TypeScript types** - Run \supabase gen types typescript\
8. **Enable realtime** - Verify realtime subscriptions work
9. **Monitor logs** - Watch for RLS policy violations or errors
10. **Document any deviations** - Update security documentation if policies change

## Maintenance Schedule

### Daily
- Monitor audit logs for suspicious activity
- Check trust score distributions
- Review flagged sessions

### Weekly
- Clean up expired evidence assets
- Review pending review cases
- Check database size and index performance

### Monthly
- Audit user roles and permissions
- Review integration configs
- Update model versions if needed

## Emergency Procedures

### Data Breach Response

1. Immediately revoke service role keys
2. Rotate all API keys and secrets
3. Check audit logs for unauthorized access
4. Notify affected tenants
5. Generate new keys and update environment variables

### Answer Key Leak

1. Identify affected exam(s)
2. Archive compromised exam immediately
3. Notify course instructor
4. Create replacement exam with new questions
5. Investigate RLS policy failure

### Cross-Tenant Data Access

1. Identify affected query/policy
2. Immediately apply restrictive policy hotfix
3. Audit all cross-tenant access in logs
4. Notify affected tenants
5. Review all similar policies for same vulnerability

## Contact

For security concerns, contact: security@aiexamguard.example.com
