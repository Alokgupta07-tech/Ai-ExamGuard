import type { SessionStatus } from '@/types/database';
import type { ExamSettingsJson, StudentExamPaper } from '@/types/exam-engine';

export type ExamEligibilityReason =
  | 'eligible'
  | 'already_submitted'
  | 'not_started_window'
  | 'window_ended'
  | 'exam_closed'
  | 'not_enrolled'
  | 'not_assigned'
  | 'no_questions';

export interface ExamSessionHardwareState {
  camera?: boolean;
  microphone?: boolean;
  fullscreen?: boolean;
  flaggedQuestionIds?: string[];
  currentQuestionId?: string | null;
  receiptCode?: string;
  autoSubmitted?: boolean;
  answeredCount?: number;
  totalQuestions?: number;
  [key: string]: unknown;
}

export interface SavedAnswerEntry {
  questionId: string;
  selectedOptionId: string | null;
  selectedOptionIds: string[];
  responseText: string | null;
  updatedAt: string;
}

export interface ExamSubmissionReceipt {
  sessionId: string;
  receiptCode: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  courseName: string;
  status: SessionStatus;
  startedAt: string | null;
  submittedAt: string;
  answeredCount: number;
  totalQuestions: number;
  autoSubmitted: boolean;
  alreadySubmitted: boolean;
}

export interface ExamPreflightPayload {
  eligible: boolean;
  reason: ExamEligibilityReason;
  reasonMessage: string;
  serverNow: string;
  exam: {
    id: string;
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
    questionCount: number;
    settings: ExamSettingsJson;
  };
  existingSession: {
    id: string;
    status: SessionStatus;
    startedAt: string | null;
    expiresAt: string | null;
    submittedAt: string | null;
  } | null;
  receipt: ExamSubmissionReceipt | null;
}

export interface ActiveExamSessionState {
  id: string;
  examId: string;
  status: SessionStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  trustScore: number;
  hardwareStatus: ExamSessionHardwareState;
  flaggedQuestionIds: string[];
  currentQuestionId: string | null;
}

export interface StudentExamSessionBootstrap {
  alreadySubmitted: boolean;
  serverNow: string;
  paper: StudentExamPaper | null;
  session: ActiveExamSessionState | null;
  answers: SavedAnswerEntry[];
  receipt: ExamSubmissionReceipt | null;
}

export interface SaveAnswerResult {
  saved: boolean;
  questionId: string;
  selectedOptionId: string | null;
  cleared: boolean;
  serverNow: string;
}

export interface BatchSaveAnswersResult {
  savedCount: number;
  serverNow: string;
}

