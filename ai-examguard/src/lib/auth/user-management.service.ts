/**
 * User Management Service
 * Admin and staff operations for managing users
 */

import { createClient } from '@/lib/supabase/client';
import type {
  UserRole,
  InviteUserData,
  BulkStudentImport,
} from '@/types/auth.types';

export class UserManagementService {
  /**
   * Invite a new user to the tenant
   */
  static async inviteUser(data: InviteUserData) {
    const supabase = createClient();

    const { data: result, error } = await supabase.rpc('invite_user', {
      p_tenant_id: data.tenantId,
      p_email: data.email,
      p_full_name: data.fullName,
      p_role: data.role,
    });

    if (error) {
      throw new Error(error.message);
    }

    return result[0];
  }

  /**
   * List users in a tenant
   */
  static async listTenantUsers(tenantId: string, roleFilter?: UserRole) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('list_tenant_users', {
      p_tenant_id: tenantId,
      p_role_filter: roleFilter || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Grant role to user
   */
  static async grantRole(
    tenantId: string,
    userEmail: string,
    role: UserRole
  ) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('grant_user_role', {
      p_tenant_id: tenantId,
      p_user_email: userEmail,
      p_role: role,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data[0];
  }

  /**
   * Revoke role from user
   */
  static async revokeRole(
    tenantId: string,
    userEmail: string,
    role: UserRole
  ) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('revoke_user_role', {
      p_tenant_id: tenantId,
      p_user_email: userEmail,
      p_role: role,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data[0];
  }

  /**
   * Remove user from tenant
   */
  static async removeUser(tenantId: string, userEmail: string) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('remove_user_from_tenant', {
      p_tenant_id: tenantId,
      p_user_email: userEmail,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data[0];
  }

  /**
   * Bulk import students from CSV data
   */
  static async bulkImportStudents(
    tenantId: string,
    students: BulkStudentImport[]
  ) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('bulk_create_students', {
      p_tenant_id: tenantId,
      p_students: students,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data[0];
  }

  /**
   * Parse CSV file to student array
   */
  static parseStudentsCSV(csvContent: string): BulkStudentImport[] {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const emailIndex = header.indexOf('email');
    const nameIndex = header.findIndex((h) =>
      ['full_name', 'name', 'fullname'].includes(h)
    );
    const studentIdIndex = header.findIndex((h) =>
      ['student_id', 'studentid', 'id'].includes(h)
    );

    if (emailIndex === -1 || nameIndex === -1) {
      throw new Error(
        'CSV must contain "email" and "full_name" (or "name") columns'
      );
    }

    // Parse rows
    const students: BulkStudentImport[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());

      if (values.length < 2) continue; // Skip empty/invalid lines

      const student: BulkStudentImport = {
        email: values[emailIndex],
        full_name: values[nameIndex],
      };

      if (studentIdIndex !== -1 && values[studentIdIndex]) {
        student.student_id = values[studentIdIndex];
      }

      students.push(student);
    }

    return students;
  }
}
