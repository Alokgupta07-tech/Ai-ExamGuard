/**
 * Authentication Service
 * Handles all authentication operations with Supabase
 */

import { createClient } from '@/lib/supabase/client';
import type {
  SignUpData,
  SignInData,
  UserContext,
  Profile,
} from '@/types/auth.types';

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp(data: SignUpData) {
    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // 2. Complete signup with profile and membership
    const { data: signupResult, error: signupError } = await supabase.rpc(
      'complete_user_signup',
      {
        p_user_id: authData.user.id,
        p_email: data.email,
        p_full_name: data.fullName,
        p_tenant_slug: data.tenantSlug || null,
        p_invited_role: data.invitedRole || 'student',
      }
    );

    if (signupError) {
      console.error('Signup completion error:', signupError);
      throw new Error(signupError.message);
    }

    return {
      user: authData.user,
      session: authData.session,
      result: signupResult,
    };
  }

  /**
   * Sign in an existing user
   */
  static async signIn(data: SignInData) {
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      user: authData.user,
      session: authData.session,
    };
  }

  /**
   * Sign out the current user
   */
  static async signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get current session
   */
  static async getSession() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return data.session;
  }

  /**
   * Get current user
   */
  static async getUser() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }

    return data.user;
  }

  /**
   * Get current user context (with tenant and roles)
   */
  static async getUserContext(tenantSlug?: string): Promise<UserContext | null> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_current_user_context', {
      p_tenant_slug: tenantSlug || null,
    });

    if (error) {
      console.error('Get user context error:', error);
      return null;
    }

    return data?.[0] || null;
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: {
    fullName?: string;
    avatarUrl?: string;
  }): Promise<Profile> {
    const supabase = createClient();

    const { data: profile, error } = await supabase.rpc('update_user_profile', {
      p_full_name: data.fullName || null,
      p_avatar_url: data.avatarUrl || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return profile[0];
  }

  /**
   * Request password reset
   */
  static async resetPassword(email: string) {
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string) {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get user's tenants and roles
   */
  static async getUserTenants() {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_user_tenants');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }
}
