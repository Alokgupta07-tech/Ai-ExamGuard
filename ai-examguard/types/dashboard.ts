import type {
  AuditAction,
  EventSeverity,
  EventType,
  ExamStatus,
  QuestionType,
  ReviewActionType,
  ReviewStatus,
  SessionStatus,
  TenantSettings,
  UserRole,
} from './database';
import type {
  EventOrigin,
  EventReviewStatus,
  EventSourceModule,
  RiskCategory,
  SessionRiskAssessment,
} from './proctoring';

export interface ProfileSummary {
  id: string;
  email: string;
  fullName: string;
}

export interface CourseView {
  id: string;
  tenantId: string;
  instructorId: string;
  instructorName: string;
  name: string;
  code: string;
  semester: string;
  description: string | null;
  enrollmentCount: number;
  createdAt: string;
}

export interface ExamView {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  tenantId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  totalPoints: number;
  passingMarks: number;
  negativeMarking: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionCount: number;
  sessionCount: number;
  settings: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface QuestionView {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  points: number;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface ReviewActionHistoryEntry {
  id: string;
  reviewCaseId: string;
  sessionId: string;
  reviewerId: string;
  reviewerName: string;
  actionType: ReviewActionType;
  message: string | null;
  createdAt: string;
}

export interface SessionView {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: SessionStatus;
  startedAt: string | null;
  submittedAt: string | null;
  durationMinutes?: number;
  endTime?: string | null;
  answeredCount?: number;
  totalQuestionCount?: number;
  score: number | null;
  trustScore: number;
  riskCategory: RiskCategory;
  riskScore: number;
  riskAssessment?: SessionRiskAssessment;
  hardwareStatus: {
    camera?: boolean;
    microphone?: boolean;
    fullscreen?: boolean;
  };
  createdAt: string;
}

export interface ProctorEventView {
  id: string;
  clientEventId: string | null;
  universityId: string;
  examId: string;
  sessionId: string;
  examTitle: string;
  studentName: string;
  eventType: EventType;
  sourceModule: EventSourceModule;
  eventOrigin: EventOrigin;
  isSimulated: boolean;
  severity: EventSeverity;
  confidence: number | null;
  occurredAt: string;
  durationMs: number | null;
  modelVersion: string | null;
  explanation: string;
  reviewStatus: EventReviewStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ReviewCaseView {
  id: string;
  sessionId: string;
  examTitle: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: ReviewStatus;
  priority: number;
  trustScore: number;
  riskCategory: RiskCategory;
  riskScore: number;
  riskAssessment?: SessionRiskAssessment;
  summary: string | null;
  assignedTo: string | null;
  createdAt: string;
  reviewedAt: string | null;
  events: ProctorEventView[];
}

export interface AuditLogView {
  id: string;
  userId: string | null;
  actorName: string;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface IntegrationConfigView {
  id: string;
  integrationType: 'lms' | 'sso' | 'analytics' | 'storage' | 'notification';
  providerName: string;
  isActive: boolean;
  configSummary: string;
  updatedAt: string;
}

export interface TenantMemberView {
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AdminDashboardPayload {
  tenant: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    settings: TenantSettings;
  };
  metrics: {
    totalStudents: number;
    totalFaculty: number;
    totalInvigilators: number;
    totalAdmins: number;
    activeExams: number;
    completedExams: number;
    flaggedSessions: number;
  };
  members: TenantMemberView[];
  courses: CourseView[];
  exams: ExamView[];
  questions: QuestionView[];
  sessions: SessionView[];
  proctorEvents: ProctorEventView[];
  reviewCases: ReviewCaseView[];
  auditLogs: AuditLogView[];
  integrations: IntegrationConfigView[];
}

export interface FacultyDashboardPayload {
  tenantId: string;
  tenantName: string;
  metrics: {
    myExaminations: number;
    upcomingExaminations: number;
    activeStudents: number;
    submissions: number;
    studentsRequiringReview: number;
  };
  courses: CourseView[];
  exams: ExamView[];
  questions: QuestionView[];
  sessions: SessionView[];
  reviewCases: ReviewCaseView[];
  proctorEvents: ProctorEventView[];
  enrollments: {
    courseId: string;
    courseCode: string;
    courseName: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    enrolledAt: string;
  }[];
}

export interface StudentDashboardPayload {
  tenantId: string;
  tenantName: string;
  serverTimeMs: number;
  profile: ProfileSummary;
  metrics: {
    upcomingExams: number;
    availableExams: number;
    completedExams: number;
    averageTrustScore: number;
  };
  enrolledCourses: CourseView[];
  exams: ExamView[];
  sessions: SessionView[];
}

export interface InvigilatorDashboardPayload {
  tenantId: string;
  tenantName: string;
  metrics: {
    activeCandidates: number;
    activeExaminations: number;
    reviewRequired: number;
    highPriorityAlerts: number;
    cameraConnectedCount: number;
    cameraTotalCount: number;
    micConnectedCount: number;
    micTotalCount: number;
  };
  exams: ExamView[];
  sessions: SessionView[];
  proctorEvents: ProctorEventView[];
  reviewCases: ReviewCaseView[];
  reviewActions: ReviewActionHistoryEntry[];
}

export interface CreateCourseInput {
  name: string;
  code: string;
  semester: string;
  description?: string;
}

export interface CreateExamInput {
  courseId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  totalPoints: number;
  requireCamera: boolean;
  requireAudio: boolean;
  requireFullscreen: boolean;
}

export interface ReviewActionInput {
  reviewCaseId: string;
  sessionId: string;
  actionType: ReviewActionType;
  newStatus: ReviewStatus;
  message: string;
}

