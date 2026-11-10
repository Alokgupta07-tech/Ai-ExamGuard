-- AI ExamGuard Database Schema
-- Migration 012: Admin Bootstrap
-- Created: 2026-11-10
-- Description: Secure admin bootstrap and initial setup functions

-- ==============================================
-- ADMIN BOOTSTRAP FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION public.bootstrap_tenant(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_tenant_domain TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  tenant_id UUID,
  admin_user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_admin_id UUID;
BEGIN
  -- Validate inputs
  IF p_tenant_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Tenant slug must contain only lowercase letters, numbers, and hyphens';
  END IF;
  
  -- Check if tenant slug already exists
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = p_tenant_slug) THEN
    RAISE EXCEPTION 'Tenant slug already exists: %', p_tenant_slug;
  END IF;
  
  -- Get current user (must be authenticated)
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to bootstrap tenant';
  END IF;
  
  -- Create tenant
  INSERT INTO public.tenants (name, slug, domain, settings)
  VALUES (
    p_tenant_name,
    p_tenant_slug,
    p_tenant_domain,
    jsonb_build_object(
      'require_camera', true,
      'require_audio', true,
      'require_fullscreen', true,
      'max_violations_threshold', 10,
      'trust_score_threshold', 50.0
    )
  )
  RETURNING id INTO v_tenant_id;
  
  -- Assign admin role
  INSERT INTO public.memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_admin_id, 'admin');
  
  -- Log audit event
  PERFORM public.log_audit(
    v_tenant_id,
    'SETTINGS_CHANGED',
    'tenant',
    v_tenant_id,
    jsonb_build_object(
      'action', 'tenant_bootstrapped',
      'tenant_name', p_tenant_name
    )
  );
  
  RETURN QUERY SELECT 
    v_tenant_id,
    v_admin_id,
    format('Successfully bootstrapped tenant "%s" (ID: %s)', p_tenant_name, v_tenant_id);
END;
$$;

COMMENT ON FUNCTION public.bootstrap_tenant IS 'Bootstrap new tenant with initial admin user (authenticated users only)';

-- ==============================================
-- GRANT ROLE FUNCTION (Admins only)
-- ==============================================

CREATE OR REPLACE FUNCTION public.grant_user_role(
  p_tenant_id UUID,
  p_user_email TEXT,
  p_role public.user_role
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role public.user_role,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
  -- Verify caller is admin
  v_admin_id := auth.uid();
  IF NOT private.has_role(p_tenant_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant roles';
  END IF;
  
  -- Prevent self-role-assignment (already admin)
  IF v_admin_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot modify own roles';
  END IF;
  
  -- Find user by email
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_user_email;
  END IF;
  
  -- Insert or update membership
  INSERT INTO public.memberships (tenant_id, user_id, role)
  VALUES (p_tenant_id, v_user_id, p_role)
  ON CONFLICT (tenant_id, user_id, role) DO NOTHING;
  
  -- Log audit event
  PERFORM public.log_audit(
    p_tenant_id,
    'ROLE_ASSIGNED',
    'membership',
    NULL,
    jsonb_build_object(
      'target_user_id', v_user_id,
      'target_email', p_user_email,
      'role', p_role
    )
  );
  
  RETURN QUERY SELECT 
    v_user_id,
    p_user_email,
    p_role,
    format('Successfully granted %s role to %s', p_role, p_user_email);
END;
$$;

COMMENT ON FUNCTION public.grant_user_role IS 'Grant role to user within tenant (admins only, cannot self-assign)';

-- ==============================================
-- REVOKE ROLE FUNCTION (Admins only)
-- ==============================================

CREATE OR REPLACE FUNCTION public.revoke_user_role(
  p_tenant_id UUID,
  p_user_email TEXT,
  p_role public.user_role
)
RETURNS TABLE (
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
  -- Verify caller is admin
  v_admin_id := auth.uid();
  IF NOT private.has_role(p_tenant_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;
  
  -- Find user by email
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_user_email;
  END IF;
  
  -- Prevent revoking own membership
  IF v_admin_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot revoke own membership';
  END IF;
  
  -- Delete membership
  DELETE FROM public.memberships
  WHERE tenant_id = p_tenant_id
    AND user_id = v_user_id
    AND role = p_role;
  
  -- Log audit event
  PERFORM public.log_audit(
    p_tenant_id,
    'ROLE_REVOKED',
    'membership',
    NULL,
    jsonb_build_object(
      'target_user_id', v_user_id,
      'target_email', p_user_email,
      'role', p_role
    )
  );
  
  RETURN QUERY SELECT 
    v_user_id,
    format('Successfully revoked %s role from %s', p_role, p_user_email);
END;
$$;

COMMENT ON FUNCTION public.revoke_user_role IS 'Revoke role from user within tenant (admins only, cannot self-revoke)';

-- ==============================================
-- GET USER TENANTS AND ROLES
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_user_tenants()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  user_roles public.user_role[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    ARRAY_AGG(m.role ORDER BY m.role) AS user_roles
  FROM public.tenants t
  JOIN public.memberships m ON m.tenant_id = t.id
  WHERE m.user_id = auth.uid()
  GROUP BY t.id, t.name, t.slug
  ORDER BY t.name;
$$;

COMMENT ON FUNCTION public.get_user_tenants IS 'Get all tenants and roles for current authenticated user';
