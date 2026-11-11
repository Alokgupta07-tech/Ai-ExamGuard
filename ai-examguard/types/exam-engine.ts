import type {
  ExamStatus,
  QuestionDifficulty,
  QuestionType,
  TenantSettings,
} from '@/types/database';

// ==============================================
// INPUTS (client -> server, validated with zod in lib/validators/exam.ts)
// ==============================================

export interface ExamCoreInput {
  courseId: string;
  title: string;
  description?: string;
  instructions?: string;
  /** ISO timestamps bounding the exam availability window. */
  startTime: string;
  endTime: string;
}

export interface ExamConfigInput {
  durationMinutes: number;
  totalPoints: number;
  passingMarks: number;
  /** Fraction (0–1) of question points deducted per wrong answer; 0 disables. */
  negativeMarking: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface ExamMonitoringInput {
  requireCamera: boolean;
  requireAudio: boolean;
  requireFullscreen: boolean;
  maxViolationsThreshold: number;
}

export type McqOptionLabel = 'A' | 'B' | 'C' | 'D';

export interface QuestionOptionInput {
  label: McqOptionLabel;
  content: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  /** Present when updating an existing question. */
  questionId?: string;
  prompt: string;
  options: QuestionOptionInput[];
  points: number;
  category?: string;
  difficulty: QuestionDifficulty;
  explanation?: string;
  orderIndex: number;
}

// ==============================================
// VIEWS (server -> client)
// ==============================================

export interface QuestionOptionView {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface QuestionWithOptionsView {
  id: string;
  examId: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  points: number;
  category: string | null;
  difficulty: QuestionDifficulty;
  explanation: string | null;
  options: QuestionOptionView[];
}

export interface ExamEditorView {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  title: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  passingMarks: number;
  negativeMarking: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: ExamStatus;
  totalPoints: number;
  settings: Record<string, unknown>;
  questions: QuestionWithOptionsView[];
  assignedStudentIds: string[];
}

export interface CourseOption {
  id: string;
  code: string;
  name: string;
}

export interface RosterStudentView {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: string;
}

export interface ExamWizardBootstrap {
  courses: CourseOption[];
}

export interface ExamAssignmentResult {
  assignedCount: number;
  removedCount: number;
}

export type ExamPublishCheck =
  | { level: 'error'; field: string; message: string }
  | { level: 'warning'; field: string; message: string };

export interface ExamPublishPreview {
  examId: string;
  title: string;
  courseCode: string;
  status: ExamStatus;
  questionCount: number;
  totalPoints: number;
  passingMarks: number;
  negativeMarking: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  monitoring: ExamMonitoringInput;
  assignedStudentCount: number;
  checks: ExamPublishCheck[];
}

export interface ExamSettingsJson extends TenantSettings {
  require_camera?: boolean;
  require_audio?: boolean;
  require_fullscreen?: boolean;
  max_violations_threshold?: number;
}

export interface BankQuestionView extends QuestionWithOptionsView {
  examTitle: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  createdAt: string;
}

/**
 * Student-safe option view: NEVER carries `isCorrect`.
 */
export interface StudentOptionView {
  id: string;
  label: string;
  content: string;
  orderIndex: number;
}

/**
 * Student-safe question payload: NEVER carries `explanation` or answer keys.
 */
export interface StudentQuestionView {
  id: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  points: number;
  category: string | null;
  difficulty: QuestionDifficulty;
  options: StudentOptionView[];
}

export interface StudentExamPaper {
  examId: string;
  title: string;
  courseCode: string;
  courseName: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  totalPoints: number;
  passingMarks: number;
  negativeMarking: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  settings: ExamSettingsJson;
  questions: StudentQuestionView[];
}
