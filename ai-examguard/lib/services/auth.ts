import { createClient } from '@/lib/supabase/client';
import type { SignInCredentials, SignUpCredentials, UserProfileWithRoles } from '@/types/auth';
import type { UserRole, Tenant } from '@/types/database';

export class AuthService {
  private static supabase = createClient();

  /**
   * Sign in with email and password
   */
  static async signIn({ email, password }: SignInCredentials) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Authentication succeeded but no user data returned.');
    }

    // Fetch user profile and memberships to determine the dashboard route
    const profile = await this.getCurrentProfile(data.user.id);
    
    // Choose appropriate role
    const primaryRole: UserRole = profile?.activeRole || (data.user.user_metadata?.role as UserRole) || 'student';
    const redirectUrl = this.getDashboardUrlForRole(primaryRole);

    return {
      user: data.user,
      profile,
      primaryRole,
      redirectUrl,
    };
  }

  /**
   * Sign up a new user with institutional role & optional tenant
   */
  static async signUp({ email, password, fullName, role, tenantSlug = 'srm-ap' }: Omit<SignUpCredentials, 'role'> & { role: UserRole | 'faculty' }) {
    const normalizedRole: UserRole = (role as string) === 'faculty' ? 'instructor' : (role as UserRole);

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: normalizedRole,
          tenant_slug: tenantSlug,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Sign up completed but user record is missing.');
    }

    // Create or update profile via client
    await this.supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    });

    // Resolve tenant
    const { data: tenant } = await this.supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (tenant) {
      await this.supabase.from('memberships').upsert({
        tenant_id: tenant.id,
        user_id: data.user.id,
        role: normalizedRole,
        updated_at: new Date().toISOString(),
      });
    }

    const redirectUrl = this.getDashboardUrlForRole(normalizedRole);

    return {
      user: data.user,
      role: normalizedRole,
      redirectUrl,
      requiresEmailConfirmation: !data.session,
    };
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    // Clear verified role cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'sb-verified-roles=; path=/; max-age=0;';
    }
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Request password reset email
   */
  static async requestPasswordReset(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get current authenticated user profile with roles and tenant details
   */
  static async getCurrentProfile(userId?: string): Promise<UserProfileWithRoles | null> {
    let targetId = userId;

    if (!targetId) {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;
      targetId = user.id;
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (!profile) return null;

    // Fetch memberships and associated tenants
    const { data: memberships } = await this.supabase
      .from('memberships')
      .select('tenant_id, user_id, role, created_at, updated_at, tenants:tenant_id (*)')
      .eq('user_id', targetId);

    const formattedMemberships = (memberships || []).map((m: {
      tenant_id: string;
      user_id: string;
      role: string;
      created_at: string;
      updated_at: string;
      tenants?: unknown;
    }) => ({
      tenant_id: m.tenant_id,
      user_id: m.user_id,
      role: m.role as UserRole,
      created_at: m.created_at,
      updated_at: m.updated_at,
      tenant: (m.tenants as Tenant | undefined),
    }));

    // Determine highest privilege role
    const roles = formattedMemberships.map((m) => m.role);
    let activeRole: UserRole = 'student';
    if (roles.includes('admin')) activeRole = 'admin';
    else if (roles.includes('instructor')) activeRole = 'instructor';
    else if (roles.includes('invigilator')) activeRole = 'invigilator';

    const activeTenant = formattedMemberships[0]?.tenant;

    return {
      ...profile,
      memberships: formattedMemberships,
      activeRole,
      activeTenant,
    };
  }

  /**
   * Compute standard dashboard URL for a given role
   */
  static getDashboardUrlForRole(role: UserRole | string): string {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'instructor':
      case 'faculty':
        return '/faculty';
      case 'invigilator':
        return '/invigilator';
      case 'student':
      default:
        return '/student';
    }
  }
}
