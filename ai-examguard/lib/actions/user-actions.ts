'use server';

import { UserService } from '@/lib/services/users';
import type { UserRole } from '@/types/database';
import type { BulkStudentRow, InviteUserPayload } from '@/types/auth';
import { revalidatePath } from 'next/cache';

export async function getTenantUsersAction(tenantId: string) {
  try {
    const users = await UserService.getTenantUsers(tenantId);
    return { success: true, users };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function inviteUserAction(payload: InviteUserPayload) {
  try {
    const result = await UserService.inviteUser(payload);
    revalidatePath('/admin');
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateUserRoleAction(tenantId: string, userId: string, newRole: UserRole) {
  try {
    await UserService.updateUserRole(tenantId, userId, newRole);
    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function removeUserAction(tenantId: string, userId: string) {
  try {
    await UserService.removeUserFromTenant(tenantId, userId);
    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function bulkImportStudentsAction(tenantId: string, students: BulkStudentRow[]) {
  try {
    const result = await UserService.bulkImportStudents(tenantId, students);
    revalidatePath('/admin');
    return { success: true, result };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
