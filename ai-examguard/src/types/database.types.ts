// AI ExamGuard Database Types
// Generated types for Supabase PostgreSQL schema
// This file should be regenerated after schema changes using:
// supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'instructor' | 'invigilator' | 'student';

export type ExamStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived';

export type SessionStatus = 'not_started' | 'in_progress' | 'submitted' | 'terminated' | 'under_review' | 'graded';

export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'essay';

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

export type IntegrationType = 'lms' | 'sso' | 'analytics' | 'storage' | 'notification';

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          logo_url: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          logo_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          logo_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      memberships: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          user_id: string;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          tenant_id: string;
          instructor_id: string;
          name: string;
          code: string;
          semester: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          instructor_id: string;
          name: string;
          code: string;
          semester: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          instructor_id?: string;
          name?: string;
          code?: string;
          semester?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          course_id: string;
          student_id: string;
          enrolled_at: string;
        };
        Insert: {
          course_id: string;
          student_id: string;
          enrolled_at?: string;
        };
        Update: {
          course_id?: string;
          student_id?: string;
          enrolled_at?: string;
        };
      };
      exams: {
        Row: {
          id: string;
          course_id: string;
          tenant_id: string;
          created_by: string;
          title: string;
          description: string | null;
          duration_minutes: number;
          start_time: string;
          end_time: string;
          status: ExamStatus;
          settings: Json;
          total_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          tenant_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          duration_minutes: number;
          start_time: string;
          end_time: string;
          status?: ExamStatus;
          settings?: Json;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          tenant_id?: string;
          created_by?: string;
          title?: string;
          description?: string | null;
          duration_minutes?: number;
          start_time?: string;
          end_time?: string;
          status?: ExamStatus;
          settings?: Json;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          exam_id: string;
          order_index: number;
          type: QuestionType;
          prompt: string;
          points: number;
          explanation: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          order_index: number;
          type: QuestionType;
          prompt: string;
          points?: number;
          explanation?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          order_index?: number;
          type?: QuestionType;
          prompt?: string;
          points?: number;
          explanation?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      question_answer_keys: {
        Row: {
          id: string;
          question_id: string;
          label: string;
          content: string;
          is_correct: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          label: string;
          content: string;
          is_correct?: boolean;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          label?: string;
          content?: string;
          is_correct?: boolean;
          order_index?: number;
          created_at?: string;
        };
      };
      exam_sessions: {
        Row: {
          id: string;
          exam_id: string;
          student_id: string;
          tenant_id: string;
          status: SessionStatus;
          started_at: string | null;
          submitted_at: string | null;
          score: number | null;
          trust_score: number;
          hardware_status: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          student_id: string;
          tenant_id: string;
          status?: SessionStatus;
          started_at?: string | null;
          submitted_at?: string | null;
          score?: number | null;
          trust_score?: number;
          hardware_status?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          student_id?: string;
          tenant_id?: string;
          status?: SessionStatus;
          started_at?: string | null;
          submitted_at?: string | null;
          score?: number | null;
          trust_score?: number;
          hardware_status?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      session_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          response_text: string | null;
          selected_option_id: string | null;
          selected_option_ids: string[];
          is_correct: boolean | null;
          points_awarded: number | null;
          feedback: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          response_text?: string | null;
          selected_option_id?: string | null;
          selected_option_ids?: string[];
          is_correct?: boolean | null;
          points_awarded?: number | null;
          feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: string;
          response_text?: string | null;
          selected_option_id?: string | null;
          selected_option_ids?: string[];
          is_correct?: boolean | null;
          points_awarded?: number | null;
          feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      proctor_events: {
        Row: {
          id: string;
          session_id: string;
          tenant_id: string;
          event_type: EventType;
          severity: EventSeverity;
          confidence: number | null;
          details: Json;
          evidence_asset_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          tenant_id: string;
          event_type: EventType;
          severity: EventSeverity;
          confidence?: number | null;
          details?: Json;
          evidence_asset_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          tenant_id?: string;
          event_type?: EventType;
          severity?: EventSeverity;
          confidence?: number | null;
          details?: Json;
          evidence_asset_id?: string | null;
          created_at?: string;
        };
      };
      evidence_assets: {
        Row: {
          id: string;
          session_id: string;
          event_id: string | null;
          tenant_id: string;
          storage_path: string;
          file_type: string;
          file_size_bytes: number | null;
          captured_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_id?: string | null;
          tenant_id: string;
          storage_path: string;
          file_type: string;
          file_size_bytes?: number | null;
          captured_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          event_id?: string | null;
          tenant_id?: string;
          storage_path?: string;
          file_type?: string;
          file_size_bytes?: number | null;
          captured_at?: string;
          expires_at?: string;
        };
      };
      review_cases: {
        Row: {
          id: string;
          session_id: string;
          tenant_id: string;
          assigned_to: string | null;
          status: ReviewStatus;
          priority: number;
          summary: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          tenant_id: string;
          assigned_to?: string | null;
          status?: ReviewStatus;
          priority?: number;
          summary?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          tenant_id?: string;
          assigned_to?: string | null;
          status?: ReviewStatus;
          priority?: number;
          summary?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
      };
      review_actions: {
        Row: {
          id: string;
          review_case_id: string;
          session_id: string;
          reviewer_id: string;
          action_type: ReviewActionType;
          message: string | null;
          acknowledged: boolean;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_case_id: string;
          session_id: string;
          reviewer_id: string;
          action_type: ReviewActionType;
          message?: string | null;
          acknowledged?: boolean;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_case_id?: string;
          session_id?: string;
          reviewer_id?: string;
          action_type?: ReviewActionType;
          message?: string | null;
          acknowledged?: boolean;
          acknowledged_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          action: AuditAction;
          entity_type: string | null;
          entity_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          action: AuditAction;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          action?: AuditAction;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      integration_configs: {
        Row: {
          id: string;
          tenant_id: string;
          integration_type: IntegrationType;
          provider_name: string;
          config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          integration_type: IntegrationType;
          provider_name: string;
          config: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          integration_type?: IntegrationType;
          provider_name?: string;
          config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      model_versions: {
        Row: {
          id: string;
          tenant_id: string | null;
          model_name: string;
          version: string;
          model_type: string;
          config: Json;
          performance_metrics: Json;
          is_active: boolean;
          deployed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          model_name: string;
          version: string;
          model_type: string;
          config?: Json;
          performance_metrics?: Json;
          is_active?: boolean;
          deployed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          model_name?: string;
          version?: string;
          model_type?: string;
          config?: Json;
          performance_metrics?: Json;
          is_active?: boolean;
          deployed_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      question_options_student_view: {
        Row: {
          id: string;
          question_id: string;
          label: string;
          content: string;
          order_index: number;
          created_at: string;
        };
      };
    };
    Functions: {
      bootstrap_tenant: {
        Args: {
          p_tenant_name: string;
          p_tenant_slug: string;
          p_tenant_domain?: string | null;
        };
        Returns: {
          tenant_id: string;
          admin_user_id: string;
          message: string;
        }[];
      };
      grant_user_role: {
        Args: {
          p_tenant_id: string;
          p_user_email: string;
          p_role: UserRole;
        };
        Returns: {
          user_id: string;
          email: string;
          role: UserRole;
          message: string;
        }[];
      };
      revoke_user_role: {
        Args: {
          p_tenant_id: string;
          p_user_email: string;
          p_role: UserRole;
        };
        Returns: {
          user_id: string;
          message: string;
        }[];
      };
      get_user_tenants: {
        Args: Record<string, never>;
        Returns: {
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          user_roles: UserRole[];
        }[];
      };
      calculate_trust_score_penalty: {
        Args: {
          p_event_type: EventType;
          p_severity: EventSeverity;
        };
        Returns: number;
      };
      log_audit: {
        Args: {
          p_tenant_id: string;
          p_action: AuditAction;
          p_entity_type?: string | null;
          p_entity_id?: string | null;
          p_details?: Json;
        };
        Returns: string;
      };
    };
  };
}
