'use server';

import { revalidatePath } from 'next/cache';
import { ExamEngineService, ExamValidationError } from '@/lib/services/exam-engine';
import type { ExamStatus, QuestionDifficulty } from '@/types/database';
import type {
  BankQuestionView,
  CourseOption,
  ExamAssignmentResult,
  ExamConfigInput,
  ExamCoreInput,
  ExamEditorView,
  ExamMonitoringInput,
  ExamPublishPreview,
  ExamWizardBootstrap,
  QuestionInput,
  QuestionWithOptionsView,
  RosterStudentView,
  StudentExamPaper,
} from '@/types/exam-engine';

export type EngineActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function handleError<T>(err: unknown): EngineActionResult<T> {
  if (err instanceof ExamValidationError) {
    return {
      success: false,
      error: err.message,
      fieldErrors: err.fieldErrors,
    };
  }
  return {
    success: false,
    error: (err as Error).message || 'Unexpected examination engine error.',
  };
}

function revalidateExamRoutes(examId?: string) {
  revalidatePath('/faculty');
  revalidatePath('/faculty/exams');
  revalidatePath('/faculty/question-bank');
  revalidatePath('/admin');
  revalidatePath('/student');
  if (examId) {
    revalidatePath(`/faculty/exams/${examId}/edit`);
  }
}

export async function bootstrapExamWizardAction(): Promise<EngineActionResult<ExamWizardBootstrap>> {
  try {
    const data = await ExamEngineService.bootstrapWizard();
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function getExamForEditorAction(
  examId: string
): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.getExamForEditor(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function createDraftExamAction(
  input: ExamCoreInput
): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.createDraftExam(input);
    revalidateExamRoutes(data.id);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateExamCoreAction(
  examId: string,
  input: ExamCoreInput
): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.updateExamCore(examId, input);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function saveQuestionAction(
  examId: string,
  input: QuestionInput
): Promise<EngineActionResult<{ question: QuestionWithOptionsView; totalPoints: number }>> {
  try {
    const data = await ExamEngineService.saveQuestion(examId, input);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteQuestionAction(
  examId: string,
  questionId: string
): Promise<EngineActionResult<{ totalPoints: number }>> {
  try {
    const data = await ExamEngineService.deleteQuestion(examId, questionId);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function reorderQuestionsAction(
  examId: string,
  orderedQuestionIds: string[]
): Promise<EngineActionResult<QuestionWithOptionsView[]>> {
  try {
    const data = await ExamEngineService.reorderQuestions(examId, orderedQuestionIds);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function listBankQuestionsAction(filters?: {
  courseId?: string;
  category?: string;
  difficulty?: QuestionDifficulty;
  search?: string;
}): Promise<
  EngineActionResult<{
    questions: BankQuestionView[];
    courses: CourseOption[];
    exams: { id: string; title: string; courseId: string }[];
  }>
> {
  try {
    const data = await ExamEngineService.listBankQuestions(filters);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function importQuestionFromBankAction(
  targetExamId: string,
  sourceQuestionId: string
): Promise<EngineActionResult<{ question: QuestionWithOptionsView; totalPoints: number }>> {
  try {
    const data = await ExamEngineService.importQuestionFromBank(targetExamId, sourceQuestionId);
    revalidateExamRoutes(targetExamId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateExamConfigAction(
  examId: string,
  input: ExamConfigInput
): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.updateExamConfig(examId, input);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function getCourseRosterAction(
  examId: string
): Promise<EngineActionResult<{ roster: RosterStudentView[]; assignedStudentIds: string[] }>> {
  try {
    const data = await ExamEngineService.getCourseRoster(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function assignStudentsAction(
  examId: string,
  studentIds: string[]
): Promise<EngineActionResult<ExamAssignmentResult>> {
  try {
    const data = await ExamEngineService.assignStudents(examId, studentIds);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateMonitoringSettingsAction(
  examId: string,
  input: ExamMonitoringInput
): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.updateMonitoringSettings(examId, input);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function getPublishPreviewAction(
  examId: string
): Promise<EngineActionResult<ExamPublishPreview>> {
  try {
    const data = await ExamEngineService.getPublishPreview(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function publishExamAction(examId: string): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.publishExam(examId);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function updateExamStatusAction(
  examId: string,
  status: ExamStatus
): Promise<EngineActionResult<ExamEditorView>> {
  try {
    const data = await ExamEngineService.updateExamStatus(examId, status);
    revalidateExamRoutes(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteDraftExamAction(examId: string): Promise<EngineActionResult<{ deleted: true }>> {
  try {
    await ExamEngineService.deleteDraftExam(examId);
    revalidateExamRoutes(examId);
    return { success: true, data: { deleted: true } };
  } catch (err) {
    return handleError(err);
  }
}

export async function getStudentExamPaperAction(
  examId: string
): Promise<EngineActionResult<StudentExamPaper>> {
  try {
    const data = await ExamEngineService.getStudentExamPaper(examId);
    return { success: true, data };
  } catch (err) {
    return handleError(err);
  }
}

