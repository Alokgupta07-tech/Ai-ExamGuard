import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';
import type { BulkStudentRow, BulkImportResult, InviteUserPayload } from '@/types/auth';

export class UserService {
  /**
   * Get all users in a tenant with their profile and membership role
   */
  static async getTenantUsers(tenantId: string) {
    const supabase = createClient();

    const { data: members, error } = await supabase
      .from('memberships')
      .select('tenant_id, user_id, role, created_at, profiles:user_id (id, email, full_name, avatar_url, created_at)')
      .eq('tenant_id', tenantId)
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
   * Admin-only: Invite or create a user in a tenant
   */
  static async inviteUser({ tenantId, email, fullName, role }: InviteUserPayload) {
    const tempPassword = `Pass!${Math.random().toString(36).substring(2, 10)}${Date.now() % 1000}`;

    // 1. Create user in Supabase Auth via admin client
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        tenant_id: tenantId,
      },
    });

    if (authError && !authError.message.includes('already registered')) {
      throw new Error(`Auth creation failed: ${authError.message}`);
    }

    let userId = authUser?.user?.id;

    // If user already registered, look up their ID from profiles
    if (!userId) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
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
      email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    });

    // 3. Assign membership
    const { error: memberError } = await supabaseAdmin.from('memberships').upsert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      updated_at: new Date().toISOString(),
    });

    if (memberError) {
      throw new Error(`Failed to assign role: ${memberError.message}`);
    }

    // 4. Record audit log
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action: 'ROLE_ASSIGNED',
      entity_type: 'membership',
      entity_id: userId,
      details: { email, fullName, role },
    });

    return {
      userId,
      email,
      role,
      tempPassword,
    };
  }

  /**
   * Admin-only: Update a user's role in a tenant
   */
  static async updateUserRole(tenantId: string, userId: string, newRole: UserRole) {
    const { error } = await supabaseAdmin
      .from('memberships')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .match({ tenant_id: tenantId, user_id: userId });

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action: 'ROLE_ASSIGNED',
      entity_type: 'membership',
      entity_id: userId,
      details: { newRole },
    });

    return { success: true };
  }

  /**
   * Admin-only: Remove a user from a tenant
   */
  static async removeUserFromTenant(tenantId: string, userId: string) {
    const { error } = await supabaseAdmin
      .from('memberships')
      .delete()
      .match({ tenant_id: tenantId, user_id: userId });

    if (error) {
      throw new Error(`Failed to remove user: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action: 'ROLE_REVOKED',
      entity_type: 'membership',
      entity_id: userId,
      details: { removedUserId: userId },
    });

    return { success: true };
  }

  /**
   * Bulk import students from parsed CSV rows
   */
  static async bulkImportStudents(tenantId: string, students: BulkStudentRow[]): Promise<BulkImportResult> {
    let successCount = 0;
    const errors: Array<{ email: string; reason: string }> = [];

    for (const student of students) {
      const email = student.email?.trim().toLowerCase() || '';
      const fullName = student.fullName?.trim() || (email ? email.split('@')[0] : '') || 'Student';

      if (!email || !email.includes('@')) {
        errors.push({ email: email || 'unknown', reason: 'Invalid or missing email address.' });
        continue;
      }

      try {
        await this.inviteUser({
          tenantId,
          email,
          fullName,
          role: 'student',
        });
        successCount++;
      } catch (err: unknown) {
        errors.push({ email, reason: (err as Error).message || 'Failed to import student' });
      }
    }

    // Log summary audit
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
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
   * Utility helper to parse raw CSV string into BulkStudentRow array
   */
  static parseStudentCsv(csvText: string): BulkStudentRow[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0] || '';
    const header = firstLine.toLowerCase();
    const isHeader = header.includes('email') || header.includes('name');
    const dataLines = isHeader ? lines.slice(1) : lines;

    return dataLines.map((line) => {
      // Split by comma while respecting quotes
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
