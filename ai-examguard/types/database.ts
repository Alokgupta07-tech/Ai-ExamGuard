export type UserRole = 'admin' | 'instructor' | 'invigilator' | 'student';

export type ExamStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived';

export type SessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'terminated'
  | 'under_review'
  | 'graded';

export type QuestionType =
  | 'mcq_single'
  | 'mcq_multiple'
  | 'true_false'
  | 'short_answer'
  | 'essay';

export type EventType =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'FACE_OCCLUDED'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'WINDOW_BLUR'
  | 'AUDIO_ANOMALY'
  | 'CLIPBOARD_PASTE'
  | 'CONTEXT_MENU'
  | 'DEVTOOLS_DETECTED';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReviewStatus = 'pending' | 'in_review' | 'cleared' | 'flagged' | 'escalated';

export type ReviewActionType =
  | 'WARNING_SENT'
  | 'CAMERA_REALIGNMENT_REQUESTED'
  | 'SESSION_PAUSED'
  | 'SESSION_TERMINATED'
  | 'MANUAL_FLAG_ADDED'
  | 'MANUAL_FLAG_REMOVED'
  | 'CASE_CLEARED'
  | 'CASE_ESCALATED';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_INVITED'
  | 'USER_JOINED'
  | 'EXAM_CREATED'
  | 'EXAM_PUBLISHED'
  | 'EXAM_STARTED'
  | 'EXAM_SUBMITTED'
  | 'EXAM_GRADED'
  | 'QUESTION_CREATED'
  | 'QUESTION_UPDATED'
  | 'QUESTION_DELETED'
  | 'SESSION_STARTED'
  | 'SESSION_SUBMITTED'
  | 'SESSION_TERMINATED'
  | 'VIOLATION_LOGGED'
  | 'REVIEW_ACTION_TAKEN'
  | 'SETTINGS_CHANGED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED';

export interface TenantSettings {
  require_camera?: boolean;
  require_audio?: boolean;
  require_fullscreen?: boolean;
  trust_score_threshold?: number;
  max_violations_threshold?: number;
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  tenant_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  tenant_id: string;
  instructor_id: string;
  name: string;
  code: string;
  semester: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  course_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Exam {
  id: string;
  course_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  status: ExamStatus;
  settings: Record<string, unknown>;
  total_points: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  order_index: number;
  type: QuestionType;
  prompt: string;
  points: number;
  explanation: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  label: string;
  content: string;
  is_correct?: boolean; // Hidden from students
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  tenant_id: string;
  status: SessionStatus;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  trust_score: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

