/**
 * Authentication and User Types
 */

export type UserRole = 'admin' | 'instructor' | 'invigilator' | 'student';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserContext {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  roles: UserRole[];
  is_admin: boolean;
  is_staff: boolean;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  tenantSlug?: string;
  invitedRole?: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface InviteUserData {
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface BulkStudentImport {
  email: string;
  full_name: string;
  student_id?: string;
}
