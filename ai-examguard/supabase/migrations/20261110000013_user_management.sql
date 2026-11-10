-- AI ExamGuard Database Schema
-- Migration 013: User Management & Enhanced Auth
-- Created: 2026-11-10
-- Description: User management functions for admin/faculty user operations

-- ==============================================
-- INVITE USER FUNCTION (Admin Only)
-- ==============================================

CREATE OR REPLACE FUNCTION public.invite_user(
  p_tenant_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role public.user_role
)
RETURNS TABLE (
  invitation_id UUID,
  email TEXT,
  role public.user_role,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Verify caller is admin
  v_admin_id := auth.uid();
  IF NOT private.has_role(p_tenant_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can invite users';
  END IF;
  
  -- Validate email format
  IF p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;
  
  -- Check if user already exists with this email in this tenant
  IF EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.memberships m ON m.user_id = p.id
    WHERE p.email = p_email AND m.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User with email % already exists in this tenant', p_email;
  END IF;
  
  -- Create invitation record (you'll need to create this table or use another mechanism)
  -- For now, we'll just return a pending invitation ID
  v_invitation_id := gen_random_uuid();
  
  -- Log audit event
  PERFORM public.log_audit(
    p_tenant_id,
    'USER_INVITED',
    'invitation',
    v_invitation_id,
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'invited_by', v_admin_id
    )
  );
  
  RETURN QUERY SELECT 
    v_invitation_id,
    p_email,
    p_role,
    format('Invitation created for %s as %s. User must sign up to complete registration.', p_email, p_role);
END;
$$;

COMMENT ON FUNCTION public.invite_user IS 'Create user invitation (admin only) - user must sign up to activate';

-- ==============================================
-- COMPLETE USER SIGNUP (Called after Supabase Auth signup)
-- ==============================================

CREATE OR REPLACE FUNCTION public.complete_user_signup(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_tenant_slug TEXT DEFAULT NULL,
  p_invited_role public.user_role DEFAULT 'student'
)
RETURNS TABLE (
  user_id UUID,
  tenant_id UUID,
  role public.user_role,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (p_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;
  
  -- If tenant slug provided, join that tenant
  IF p_tenant_slug IS NOT NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = p_tenant_slug;
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Tenant not found: %', p_tenant_slug;
    END IF;
    
    -- Create membership with invited role
    INSERT INTO public.memberships (tenant_id, user_id, role)
    VALUES (v_tenant_id, p_user_id, p_invited_role)
    ON CONFLICT (tenant_id, user_id, role) DO NOTHING;
    
    -- Log audit event
    PERFORM public.log_audit(
      v_tenant_id,
      'USER_JOINED',
      'membership',
      NULL,
      jsonb_build_object(
        'user_id', p_user_id,
        'email', p_email,
        'role', p_invited_role
      )
    );
  END IF;
  
  RETURN QUERY SELECT 
    p_user_id,
    v_tenant_id,
    p_invited_role,
    format('User signup complete for %s', p_email);
END;
$$;

COMMENT ON FUNCTION public.complete_user_signup IS 'Complete user signup after Supabase Auth registration';

-- ==============================================
-- BULK CREATE STUDENTS (CSV Import Support)
-- ==============================================

CREATE OR REPLACE FUNCTION public.bulk_create_students(
  p_tenant_id UUID,
  p_students JSONB -- Array of {email, full_name, student_id}
)
RETURNS TABLE (
  success_count INT,
  error_count INT,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student JSONB;
  v_success_count INT := 0;
  v_error_count INT := 0;
  v_errors JSONB := '[]'::jsonb;
  v_error_msg TEXT;
BEGIN
  -- Verify caller is admin or instructor
  IF NOT private.has_any_role(p_tenant_id, ARRAY['admin', 'instructor']) THEN
    RAISE EXCEPTION 'Only admins and instructors can bulk import students';
  END IF;
  
  -- Validate input is array
  IF jsonb_typeof(p_students) != 'array' THEN
    RAISE EXCEPTION 'Students must be provided as a JSON array';
  END IF;
  
  -- Process each student
  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    BEGIN
      -- Validate required fields
      IF NOT (v_student ? 'email' AND v_student ? 'full_name') THEN
        v_error_msg := 'Missing required fields (email, full_name)';
        v_errors := v_errors || jsonb_build_object(
          'student', v_student,
          'error', v_error_msg
        );
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Check if user already exists
      IF EXISTS (
        SELECT 1 
        FROM public.profiles p
        JOIN public.memberships m ON m.user_id = p.id
        WHERE p.email = (v_student->>'email') 
        AND m.tenant_id = p_tenant_id
      ) THEN
        v_error_msg := format('User already exists: %s', v_student->>'email');
        v_errors := v_errors || jsonb_build_object(
          'student', v_student,
          'error', v_error_msg
        );
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Create invitation record
      PERFORM public.invite_user(
        p_tenant_id,
        v_student->>'email',
        v_student->>'full_name',
        'student'
      );
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_msg := SQLERRM;
      v_errors := v_errors || jsonb_build_object(
        'student', v_student,
        'error', v_error_msg
      );
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  -- Log audit event
  PERFORM public.log_audit(
    p_tenant_id,
    'BULK_IMPORT',
    'students',
    NULL,
    jsonb_build_object(
      'success_count', v_success_count,
      'error_count', v_error_count,
      'total', v_success_count + v_error_count
    )
  );
  
  RETURN QUERY SELECT v_success_count, v_error_count, v_errors;
END;
$$;

COMMENT ON FUNCTION public.bulk_create_students IS 'Bulk import students from CSV (admin/instructor only)';

-- ==============================================
-- LIST TENANT USERS (With Role Filter)
-- ==============================================

CREATE OR REPLACE FUNCTION public.list_tenant_users(
  p_tenant_id UUID,
  p_role_filter public.user_role DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  roles public.user_role[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  -- Verify caller has access to tenant
  IF NOT private.has_any_role(p_tenant_id, ARRAY['admin', 'instructor', 'invigilator']) THEN
    RAISE EXCEPTION 'Insufficient permissions to list users';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    ARRAY_AGG(DISTINCT m.role ORDER BY m.role) AS roles,
    p.created_at
  FROM public.profiles p
  JOIN public.memberships m ON m.user_id = p.id
  WHERE m.tenant_id = p_tenant_id
    AND (p_role_filter IS NULL OR m.role = p_role_filter)
  GROUP BY p.id, p.email, p.full_name, p.avatar_url, p.created_at
  ORDER BY p.full_name;
END;
$$;

COMMENT ON FUNCTION public.list_tenant_users IS 'List all users in tenant with optional role filter';

-- ==============================================
-- UPDATE USER PROFILE
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to update profile';
  END IF;
  
  UPDATE public.profiles
  SET 
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = now()
  WHERE id = v_user_id;
  
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = v_user_id;
END;
$$;

COMMENT ON FUNCTION public.update_user_profile IS 'Update current user profile';

-- ==============================================
-- REMOVE USER FROM TENANT (Admin Only)
-- ==============================================

CREATE OR REPLACE FUNCTION public.remove_user_from_tenant(
  p_tenant_id UUID,
  p_user_email TEXT
)
RETURNS TABLE (
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
  -- Verify caller is admin
  v_admin_id := auth.uid();
  IF NOT private.has_role(p_tenant_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can remove users';
  END IF;
  
  -- Find user by email
  SELECT p.id INTO v_user_id
  FROM public.profiles p
  JOIN public.memberships m ON m.user_id = p.id
  WHERE p.email = p_user_email
  AND m.tenant_id = p_tenant_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in this tenant: %', p_user_email;
  END IF;
  
  -- Prevent removing yourself
  IF v_admin_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot remove your own membership';
  END IF;
  
  -- Delete all memberships for this user in this tenant
  DELETE FROM public.memberships
  WHERE tenant_id = p_tenant_id
  AND user_id = v_user_id;
  
  -- Log audit event
  PERFORM public.log_audit(
    p_tenant_id,
    'USER_REMOVED',
    'membership',
    NULL,
    jsonb_build_object(
      'removed_user_id', v_user_id,
      'removed_email', p_user_email
    )
  );
  
  RETURN QUERY SELECT 
    v_user_id,
    format('Successfully removed user %s from tenant', p_user_email);
END;
$$;

COMMENT ON FUNCTION public.remove_user_from_tenant IS 'Remove user from tenant (admin only)';

-- ==============================================
-- GET CURRENT USER CONTEXT
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_current_user_context(
  p_tenant_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  roles public.user_role[],
  is_admin BOOLEAN,
  is_staff BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- If tenant slug provided, use that tenant
  IF p_tenant_slug IS NOT NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = p_tenant_slug;
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Tenant not found: %', p_tenant_slug;
    END IF;
    
    -- Verify user is member of this tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = v_user_id AND tenant_id = v_tenant_id
    ) THEN
      RAISE EXCEPTION 'User is not a member of tenant: %', p_tenant_slug;
    END IF;
  ELSE
    -- Get user's first tenant
    SELECT m.tenant_id INTO v_tenant_id
    FROM public.memberships m
    WHERE m.user_id = v_user_id
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    ARRAY_AGG(DISTINCT m.role ORDER BY m.role) AS roles,
    bool_or(m.role = 'admin') AS is_admin,
    bool_or(m.role IN ('admin', 'instructor', 'invigilator')) AS is_staff
  FROM public.profiles p
  LEFT JOIN public.tenants t ON t.id = v_tenant_id
  LEFT JOIN public.memberships m ON m.user_id = p.id AND m.tenant_id = v_tenant_id
  WHERE p.id = v_user_id
  GROUP BY p.id, p.email, p.full_name, p.avatar_url, t.id, t.name, t.slug;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_context IS 'Get current authenticated user with tenant and role context';
