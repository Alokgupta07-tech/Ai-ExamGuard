'use server';

import { revalidatePath } from 'next/cache';
import { DashboardService } from '@/lib/services/dashboard';
import { ExamEngineService } from '@/lib/services/exam-engine';
import type { ExamStatus, TenantSettings } from '@/types/database';
import type {
  AdminDashboardPayload,
  CreateCourseInput,
  CreateExamInput,
  FacultyDashboardPayload,
  IntegrationConfigView,
  InvigilatorDashboardPayload,
  ReviewActionInput,
  StudentDashboardPayload,
} from '@/types/dashboard';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getAdminDashboardAction(): Promise<ActionResult<AdminDashboardPayload>> {
  try {
    const data = await DashboardService.getAdminData();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getFacultyDashboardAction(): Promise<ActionResult<FacultyDashboardPayload>> {
  try {
    const data = await DashboardService.getFacultyData();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getStudentDashboardAction(): Promise<ActionResult<StudentDashboardPayload>> {
  try {
    const data = await DashboardService.getStudentData();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getInvigilatorDashboardAction(): Promise<
  ActionResult<InvigilatorDashboardPayload>
> {
  try {
    const data = await DashboardService.getInvigilatorData();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createCourseAction(
  input: CreateCourseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = await DashboardService.createCourse(input);
    revalidatePath('/admin');
    revalidatePath('/faculty');
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createExamAction(
  input: CreateExamInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = await DashboardService.createExam(input);
    revalidatePath('/admin');
    revalidatePath('/faculty');
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateExamStatusAction(
  examId: string,
  status: ExamStatus
): Promise<ActionResult<null>> {
  try {
    await ExamEngineService.updateExamStatus(examId, status);
    revalidatePath('/admin');
    revalidatePath('/faculty');
    revalidatePath('/faculty/exams');
    revalidatePath('/student');
    revalidatePath('/invigilator');
    return { success: true, data: null };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTenantConfigAction(payload: {
  name?: string;
  domain?: string | null;
  settings: TenantSettings;
}): Promise<ActionResult<null>> {
  try {
    await DashboardService.updateTenantConfig(payload);
    revalidatePath('/admin');
    return { success: true, data: null };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function upsertIntegrationAction(payload: {
  integrationType: IntegrationConfigView['integrationType'];
  providerName: string;
  endpoint: string;
  isActive: boolean;
}): Promise<ActionResult<null>> {
  try {
    await DashboardService.upsertIntegration(payload);
    revalidatePath('/admin/integrations');
    return { success: true, data: null };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function recordReviewAction(
  input: ReviewActionInput
): Promise<ActionResult<null>> {
  try {
    await DashboardService.recordReviewAction(input);
    revalidatePath('/invigilator');
    revalidatePath('/faculty');
    revalidatePath('/admin');
    return { success: true, data: null };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

