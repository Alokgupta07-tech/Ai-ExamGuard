import type { AuditAction, ExamStatus, ReviewStatus, SessionStatus } from '@/types/database';
import type { EventOrigin, RiskCategory } from '@/types/proctoring';

export type ReportType =
  | 'individual_candidate'
  | 'examination_level'
  | 'university_activity'
  | 'event_frequency'
  | 'monitoring_status'
  | 'review_outcome'
  | 'examination_submission';

export const REPORT_TYPE_METADATA: Array<{
  id: ReportType;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'individual_candidate',
    label: 'Individual Candidate Report',
    shortLabel: 'Individual Candidate',
    description: 'Candidate progress, trust indicator, monitoring events, and review adjudication per attempt.',
  },
  {
    id: 'examination_level',
    label: 'Examination-Level Report',
    shortLabel: 'Examination Level',
    description: 'Aggregate attendance, submission rate, score averages, and risk breakdown per examination.',
  },
  {
    id: 'university_activity',
    label: 'University Activity Report',
    shortLabel: 'University Activity',
    description: 'Cross-department catalog coverage, active examinations, sessions, telemetry, and staff audit volume.',
  },
  {
    id: 'event_frequency',
    label: 'Event Frequency Report',
    shortLabel: 'Event Frequency',
    description: 'Frequency, duration, source module, and distinction between live AI, browser, and simulated events.',
  },
  {
    id: 'monitoring_status',
    label: 'Monitoring Status Report',
    shortLabel: 'Monitoring Status',
    description: 'Camera, microphone, browser visibility/fullscreen stability, and telemetry coverage health.',
  },
  {
    id: 'review_outcome',
    label: 'Review Outcome Report',
    shortLabel: 'Review Outcome',
    description: 'Adjudication outcomes, escalation rate, reviewer turnaround actions, and latest reviewer notes.',
  },
  {
    id: 'examination_submission',
    label: 'Examination Submission Report',
    shortLabel: 'Exam Submissions',
    description: 'Completed and in-progress submissions with score percentages, passing outcomes, and duration.',
  },
];

export interface ReportFilterParams {
  universityId?: string | null;
  department?: string | null;
  courseId?: string | null;
  examId?: string | null;
  studentId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  eventType?: string | null;
  reviewStatus?: string | null;
}

export interface IndividualCandidateReportRow {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  universityName: string;
  departmentCode: string;
  courseCode: string;
  examId: string;
  examTitle: string;
  sessionStatus: SessionStatus;
  progressPercent: number;
  score: number | null;
  trustScore: number;
  riskCategory: RiskCategory;
  reviewStatus: ReviewStatus | 'no_case';
  totalEvents: number;
  aiDetectionEvents: number;
  browserEvents: number;
  simulatedEvents: number;
  cameraConnected: boolean;
  microphoneConnected: boolean;
  startedAt: string | null;
  submittedAt: string | null;
}

export interface ExaminationLevelReportRow {
  examId: string;
  examTitle: string;
  universityName: string;
  departmentCode: string;
  courseCode: string;
  courseName: string;
  examStatus: ExamStatus;
  totalSessions: number;
  submittedCount: number;
  averageScore: number | null;
  averageTrustScore: number;
  priorityReviewCount: number;
  reviewSuggestedCount: number;
  totalEvents: number;
  startTime: string;
  endTime: string;
}

export interface UniversityActivityReportRow {
  universityId: string;
  universityName: string;
  departmentCode: string;
  coursesCount: number;
  examinationsCount: number;
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  totalEvents: number;
  reviewActionsCount: number;
  auditActionsCount: number;
}

export interface EventFrequencyReportRow {
  eventType: string;
  sourceModule: string;
  eventOrigin: EventOrigin;
  occurrences: number;
  uniqueSessions: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  highOrCriticalCount: number;
  pendingReviewCount: number;
  flaggedCount: number;
  dismissedOrClearedCount: number;
  simulatedCount: number;
}

export interface MonitoringStatusReportRow {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  universityName: string;
  departmentCode: string;
  courseCode: string;
  examTitle: string;
  sessionStatus: SessionStatus;
  cameraStatus: 'connected' | 'disconnected' | 'unknown';
  microphoneStatus: 'connected' | 'disconnected' | 'unknown';
  browserInterruptionCount: number;
  deviceDisconnectionCount: number;
  monitoringHealth: 'Healthy' | 'Degraded' | 'Attention Needed';
  lastEventAt: string | null;
}

export interface ReviewOutcomeReportRow {
  reviewCaseId: string;
  sessionId: string;
  studentName: string;
  studentEmail: string;
  universityName: string;
  departmentCode: string;
  courseCode: string;
  examTitle: string;
  reviewStatus: ReviewStatus;
  priority: number;
  riskCategory: RiskCategory;
  trustScore: number;
  totalEvents: number;
  actionsTakenCount: number;
  latestActionType: string | null;
  latestActionMessage: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface ExaminationSubmissionReportRow {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  universityName: string;
  departmentCode: string;
  courseCode: string;
  examTitle: string;
  sessionStatus: SessionStatus;
  answeredCount: number;
  totalQuestions: number;
  rawScore: number | null;
  totalPoints: number;
  scorePercent: number | null;
  passingMarks: number;
  outcome: 'Passed' | 'Below Passing' | 'Pending Grading' | 'In Progress' | 'Terminated';
  startedAt: string | null;
  submittedAt: string | null;
  durationMinutes: number | null;
}

export interface ReportFilterOptions {
  universities: Array<{ id: string; name: string; slug: string }>;
  departments: string[];
  courses: Array<{ id: string; code: string; name: string; departmentCode: string }>;
  exams: Array<{ id: string; title: string; courseId: string; courseCode: string; departmentCode: string }>;
  students: Array<{ id: string; fullName: string; email: string }>;
  eventTypes: string[];
  reviewStatuses: string[];
}

export interface ReportSuitePayload {
  generatedAt: string;
  activeUniversityId: string;
  activeUniversityName: string;
  appliedFilters: ReportFilterParams;
  options: ReportFilterOptions;
  summary: {
    totalCandidates: number;
    totalExams: number;
    totalSessions: number;
    totalEvents: number;
    priorityReviewSessions: number;
    submittedSessions: number;
    averageTrustScore: number;
  };
  reports: {
    individual_candidate: IndividualCandidateReportRow[];
    examination_level: ExaminationLevelReportRow[];
    university_activity: UniversityActivityReportRow[];
    event_frequency: EventFrequencyReportRow[];
    monitoring_status: MonitoringStatusReportRow[];
    review_outcome: ReviewOutcomeReportRow[];
    examination_submission: ExaminationSubmissionReportRow[];
  };
}

export interface AdminAuditLogFilterParams {
  action?: AuditAction | string | null;
  actorId?: string | null;
  entityType?: string | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
}
