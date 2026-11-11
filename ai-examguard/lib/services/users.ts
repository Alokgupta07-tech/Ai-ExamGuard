import { randomBytes } from 'node:crypto';
import { requireRoleActor, type VerifiedActor } from '@/lib/services/dashboard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/database';
import type { BulkStudentRow, BulkImportResult, InviteUserPayload } from '@/types/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateSecureTempPassword(): string {
  const token = randomBytes(12).toString('base64url');
  return `Eg!${token}9`;
}

function assertTenantAdminScope(actor: VerifiedActor, requestedTenantId: string): void {
  if (!requestedTenantId || requestedTenantId !== actor.tenantId) {
    throw new Error('Forbidden: Cannot manage users outside your institutional tenant.');
  }
}

async function inviteSingleUserAsActor(
  actor: VerifiedActor,
  { email, fullName, role }: Omit<InviteUserPayload, 'tenantId'>
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  if (!EMAIL_RE.test(cleanEmail)) {
    throw new Error('Invalid email address format.');
  }
  if (cleanName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  const tempPassword = generateSecureTempPassword();

  // 1. Create user in Supabase Auth via admin client
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: cleanName,
      role,
      tenant_id: actor.tenantId,
    },
  });

  if (authError && !authError.message.includes('already registered')) {
    throw new Error(`Auth creation failed: ${authError.message}`);
  }

  let userId = authUser?.user?.id;

  if (!userId) {
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      throw new Error('User already exists in auth but profile could not be found.');
    }
  }

  // 2. Ensure profile exists
  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email: cleanEmail,
    full_name: cleanName,
    updated_at: new Date().toISOString(),
  });

  // 3. Assign membership strictly inside actor's tenant
  const { error: memberError } = await supabaseAdmin.from('memberships').upsert({
    tenant_id: actor.tenantId,
    user_id: userId,
    role,
    updated_at: new Date().toISOString(),
  });

  if (memberError) {
    throw new Error(`Failed to assign role: ${memberError.message}`);
  }

  // 4. Record audit log under verified admin actor
  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: actor.tenantId,
    user_id: actor.userId,
    action: 'ROLE_ASSIGNED',
    entity_type: 'membership',
    entity_id: userId,
    details: { invitedUserId: userId, email: cleanEmail, fullName: cleanName, role },
  });

  return {
    userId,
    email: cleanEmail,
    role,
    tempPassword,
  };
}

export class UserService {
  /**
   * Get all users in the authenticated admin's tenant with their profile and membership role.
   */
  static async getTenantUsers(tenantId: string) {
    const actor = await requireRoleActor(['admin']);
    assertTenantAdminScope(actor, tenantId);

    const { data: members, error } = await supabaseAdmin
      .from('memberships')
      .select('tenant_id, user_id, role, created_at, profiles:user_id (id, email, full_name, avatar_url, created_at)')
      .eq('tenant_id', actor.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tenant users: ${error.message}`);
    }

    return (members || []).map((m: {
      user_id: string;
      tenant_id: string;
      role: string;
      created_at: string;
      profiles?: unknown;
    }) => {
      const p = m.profiles as { email?: string; full_name?: string; avatar_url?: string | null } | undefined;
      return {
        userId: m.user_id,
        tenantId: m.tenant_id,
        role: m.role as UserRole,
        createdAt: m.created_at,
        email: p?.email || 'N/A',
        fullName: p?.full_name || 'Anonymous User',
        avatarUrl: p?.avatar_url || null,
      };
    });
  }

  /**
   * Admin-only: Invite or create a user in the caller's own university tenant.
   */
  static async inviteUser({ tenantId, email, fullName, role }: InviteUserPayload) {
    const actor = await requireRoleActor(['admin']);
    assertTenantAdminScope(actor, tenantId);
    return inviteSingleUserAsActor(actor, { email, fullName, role });
  }

  /**
   * Admin-only: Update a user's role within the caller's own university tenant.
   */
  static async updateUserRole(tenantId: string, userId: string, newRole: UserRole) {
    const actor = await requireRoleActor(['admin']);
    assertTenantAdminScope(actor, tenantId);

    if (userId === actor.userId) {
      throw new Error('Forbidden: Administrators cannot modify their own institutional role.');
    }

    const { error } = await supabaseAdmin
      .from('memberships')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .match({ tenant_id: actor.tenantId, user_id: userId });

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'ROLE_ASSIGNED',
      entity_type: 'membership',
      entity_id: userId,
      details: { targetUserId: userId, newRole },
    });

    return { success: true };
  }

  /**
   * Admin-only: Remove a user from the caller's own university tenant.
   */
  static async removeUserFromTenant(tenantId: string, userId: string) {
    const actor = await requireRoleActor(['admin']);
    assertTenantAdminScope(actor, tenantId);

    if (userId === actor.userId) {
      throw new Error('Forbidden: Administrators cannot remove their own membership.');
    }

    const { error } = await supabaseAdmin
      .from('memberships')
      .delete()
      .match({ tenant_id: actor.tenantId, user_id: userId });

    if (error) {
      throw new Error(`Failed to remove user: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'ROLE_REVOKED',
      entity_type: 'membership',
      entity_id: userId,
      details: { removedUserId: userId },
    });

    return { success: true };
  }

  /**
   * Admin-only: Bulk import students from parsed CSV rows into the caller's tenant.
   */
  static async bulkImportStudents(tenantId: string, students: BulkStudentRow[]): Promise<BulkImportResult> {
    const actor = await requireRoleActor(['admin']);
    assertTenantAdminScope(actor, tenantId);

    let successCount = 0;
    const errors: Array<{ email: string; reason: string }> = [];

    for (const student of students) {
      const email = student.email?.trim().toLowerCase() || '';
      const fullName = student.fullName?.trim() || (email ? email.split('@')[0] : '') || 'Student';

      if (!EMAIL_RE.test(email)) {
        errors.push({ email: email || 'unknown', reason: 'Invalid or missing email address.' });
        continue;
      }

      try {
        await inviteSingleUserAsActor(actor, {
          email,
          fullName,
          role: 'student',
        });
        successCount++;
      } catch (err: unknown) {
        errors.push({ email, reason: (err as Error).message || 'Failed to import student' });
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'USER_JOINED',
      entity_type: 'bulk_import',
      details: {
        totalSubmitted: students.length,
        successCount,
        errorCount: errors.length,
      },
    });

    return {
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  /**
   * Utility helper to parse raw CSV string into BulkStudentRow array.
   */
  static parseStudentCsv(csvText: string): BulkStudentRow[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0] || '';
    const header = firstLine.toLowerCase();
    const isHeader = header.includes('email') || header.includes('name');
    const dataLines = isHeader ? lines.slice(1) : lines;

    return dataLines.map((line) => {
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const email = parts[0] || '';
      return {
        email,
        fullName: parts[1] || (email ? email.split('@')[0] : '') || '',
        studentId: parts[2] || undefined,
      };
    });
  }
}
