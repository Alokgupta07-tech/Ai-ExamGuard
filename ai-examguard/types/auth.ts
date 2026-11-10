import type { UserRole, Profile, Membership, Tenant } from './database';

export interface UserProfileWithRoles extends Profile {
  memberships: Array<Membership & { tenant?: Tenant }>;
  activeTenant?: Tenant;
  activeRole?: UserRole;
}

export interface AuthState {
  user: UserProfileWithRoles | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  tenantSlug?: string;
}

export interface InviteUserPayload {
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface BulkStudentRow {
  email: string;
  fullName: string;
  studentId?: string;
}

export interface BulkImportResult {
  successCount: number;
  errorCount: number;
  errors: Array<{ email: string; reason: string }>;
}

