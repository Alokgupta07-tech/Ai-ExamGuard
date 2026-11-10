-- AI ExamGuard Database Schema
-- Migration 006: RLS Policies - Core Tables
-- Created: 2026-11-10
-- Description: Security policies for tenants, profiles, memberships, courses

-- ==============================================
-- TENANTS POLICIES
-- ==============================================

-- SELECT: Members can view their tenant
CREATE POLICY tenant_select_members ON public.tenants
FOR SELECT
USING (private.is_tenant_member(id));

-- UPDATE: Only admins can update tenant
CREATE POLICY tenant_update_admins ON public.tenants
FOR UPDATE
USING (private.has_role(id, 'admin'));

-- INSERT: Service role only (handled by admin bootstrap)
CREATE POLICY tenant_insert_service ON public.tenants
FOR INSERT
WITH CHECK (false); -- Prevent regular users from creating tenants

COMMENT ON POLICY tenant_select_members ON public.tenants IS 'Members can view their tenant';
COMMENT ON POLICY tenant_update_admins ON public.tenants IS 'Only admins can update tenant settings';

-- ==============================================
-- PROFILES POLICIES
-- ==============================================

-- SELECT: Users can view their own profile
CREATE POLICY profile_select_own ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- INSERT: Users can create their own profile
CREATE POLICY profile_insert_own ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY profile_update_own ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

COMMENT ON POLICY profile_select_own ON public.profiles IS 'Users can view their own profile';

-- ==============================================
-- MEMBERSHIPS POLICIES
-- ==============================================

-- SELECT: Users can view memberships in their tenants
CREATE POLICY membership_select_tenant_members ON public.memberships
FOR SELECT
USING (
  private.is_tenant_member(tenant_id)
);

-- INSERT: Only admins can create memberships (assign roles)
CREATE POLICY membership_insert_admins ON public.memberships
FOR INSERT
WITH CHECK (
  private.has_role(tenant_id, 'admin')
  AND user_id != auth.uid() -- Cannot self-assign roles
);

-- DELETE: Only admins can revoke memberships
CREATE POLICY membership_delete_admins ON public.memberships
FOR DELETE
USING (
  private.has_role(tenant_id, 'admin')
  AND user_id != auth.uid() -- Cannot remove own membership
);

-- UPDATE: No updates allowed (delete and re-create instead)
CREATE POLICY membership_no_update ON public.memberships
FOR UPDATE
USING (false);

COMMENT ON POLICY membership_insert_admins ON public.memberships IS 'Only admins can assign roles, cannot self-assign';
COMMENT ON POLICY membership_delete_admins ON public.memberships IS 'Only admins can revoke roles, cannot remove own';

-- ==============================================
-- COURSES POLICIES
-- ==============================================

-- SELECT: Tenant members can view courses
CREATE POLICY course_select_members ON public.courses
FOR SELECT
USING (private.is_tenant_member(tenant_id));

-- INSERT: Instructors and admins can create courses
CREATE POLICY course_insert_instructors ON public.courses
FOR INSERT
WITH CHECK (
  private.has_any_role(tenant_id, 'instructor', 'admin')
  AND (instructor_id = auth.uid() OR private.has_role(tenant_id, 'admin'))
);

-- UPDATE: Course instructor or admin can update
CREATE POLICY course_update_authorized ON public.courses
FOR UPDATE
USING (
  instructor_id = auth.uid() OR
  private.has_role(tenant_id, 'admin')
)
WITH CHECK (
  instructor_id = auth.uid() OR
  private.has_role(tenant_id, 'admin')
);

-- DELETE: Only admins can delete courses
CREATE POLICY course_delete_admins ON public.courses
FOR DELETE
USING (private.has_role(tenant_id, 'admin'));

COMMENT ON POLICY course_select_members ON public.courses IS 'Tenant members can view courses';
COMMENT ON POLICY course_insert_instructors ON public.courses IS 'Instructors can create courses';
COMMENT ON POLICY course_update_authorized ON public.courses IS 'Course instructor or admin can update';

-- ==============================================
-- ENROLLMENTS POLICIES
-- ==============================================

-- SELECT: Students can view their enrollments, instructors/admins can view course enrollments
CREATE POLICY enrollment_select_authorized ON public.enrollments
FOR SELECT
USING (
  student_id = auth.uid() OR
  private.is_course_instructor(course_id) OR
  private.has_any_role(private.get_course_tenant(course_id), 'admin', 'invigilator')
);

-- INSERT: Instructors and admins can enroll students
CREATE POLICY enrollment_insert_instructors ON public.enrollments
FOR INSERT
WITH CHECK (
  private.is_course_instructor(course_id) OR
  private.has_role(private.get_course_tenant(course_id), 'admin')
);

-- DELETE: Instructors and admins can unenroll students
CREATE POLICY enrollment_delete_instructors ON public.enrollments
FOR DELETE
USING (
  private.is_course_instructor(course_id) OR
  private.has_role(private.get_course_tenant(course_id), 'admin')
);

COMMENT ON POLICY enrollment_select_authorized ON public.enrollments IS 'Students see own, instructors see course enrollments';
COMMENT ON POLICY enrollment_insert_instructors ON public.enrollments IS 'Instructors and admins can enroll students';
