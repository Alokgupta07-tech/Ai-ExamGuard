export type User = {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  full_name: string;
  created_at: string;
  updated_at: string;
};

export type Exam = {
  id: string;
  title: string;
  description: string | null;
  instructor_id: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  settings: ExamSettings;
  created_at: string;
  updated_at: string;
};

export type ExamSettings = {
  face_detection_enabled: boolean;
  audio_detection_enabled: boolean;
  tab_switch_detection_enabled: boolean;
  fullscreen_required: boolean;
  max_tab_switches: number;
  risk_threshold: number;
};

export type ExamSession = {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'completed' | 'flagged' | 'terminated';
  risk_score: number;
  flags_count: number;
};

export type RiskFlag = {
  id: string;
  session_id: string;
  timestamp: string;
  flag_type: 'face_not_detected' | 'multiple_faces' | 'audio_detected' | 'tab_switch' | 'fullscreen_exit';
  severity: 'low' | 'medium' | 'high';
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};
