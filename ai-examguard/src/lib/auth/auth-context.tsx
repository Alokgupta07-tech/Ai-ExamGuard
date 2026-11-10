'use client';

/**
 * Auth Context Provider
 * Manages authentication state and user context across the application
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthService } from './auth.service';
import type { User, Session } from '@supabase/supabase-js';
import type { UserContext } from '@/types/auth.types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userContext: UserContext | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserContext: (tenantSlug?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const refreshUserContext = async (tenantSlug?: string) => {
    if (!user) {
      setUserContext(null);
      return;
    }

    try {
      const context = await AuthService.getUserContext(tenantSlug);
      setUserContext(context);
    } catch (error) {
      console.error('Error fetching user context:', error);
      setUserContext(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Load user context if authenticated
      if (session?.user) {
        refreshUserContext();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Reload user context on auth change
      if (session?.user) {
        refreshUserContext();
      } else {
        setUserContext(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
    setSession(null);
    setUserContext(null);
    router.push('/auth/login');
  };

  const value = {
    user,
    session,
    userContext,
    loading,
    signOut,
    refreshUserContext,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string) {
  const { userContext } = useAuth();
  return userContext?.roles?.includes(role as any) ?? false;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: string[]) {
  const { userContext } = useAuth();
  return roles.some((role) => userContext?.roles?.includes(role as any));
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  const { userContext } = useAuth();
  return userContext?.is_admin ?? false;
}

/**
 * Hook to check if user is staff (admin, instructor, or invigilator)
 */
export function useIsStaff() {
  const { userContext } = useAuth();
  return userContext?.is_staff ?? false;
}
