# AI ExamGuard — API & Server Action Specification

## 1. Overview & Protocol Architecture

AI ExamGuard uses a hybrid communication architecture:
1. **Next.js Server Actions**: Type-safe, authenticated server executions for user-driven mutations (submitting answers, creating exams, enrolling students, acknowledging interventions).
2. **Next.js Route Handlers (`/api/*`)**: RESTful endpoints for event ingestion, webhooks, and programmatic integrations.
3. **Supabase Realtime**: WebSocket event subscription for live invigilator telemetry.

All endpoints adhere to strict Zod schema validation, server-side authorization checks, and standard HTTP error codes.

---

## 2. Global Error & Response Schema

### Standard Success Envelope
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
  };
}
```

### Standard Error Envelope
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // E.g. "UNAUTHORIZED", "EXAM_NOT_ACTIVE", "VALIDATION_ERROR"
    message: string;    // Human-readable summary
    details?: unknown;  // Optional Zod validation issues
  };
  meta: {
    timestamp: string;
  };
}
```

---

## 3. Server Action Specifications

### 3.1. Authentication & Onboarding Actions

#### `signUpWithRoleAction(formData: SignUpInput)`
- **Route / Scope**: Server Action (`lib/actions/auth.ts`)
- **Caller**: Public guest
- **Input**:
  ```typescript
  interface SignUpInput {
    email: string;
    password: string;
    fullName: string;
    role: 'student' | 'faculty' | 'invigilator' | 'admin';
    universityId: string;
  }
  ```
- **Process**:
  1. Validates schema using `signUpSchema`.
  2. Calls Supabase `auth.signUp()` with user metadata.
  3. Inserts into `profiles` and `university_members`.
- **Output**: `{ success: true, userId: string, requiresEmailVerification: boolean }`

#### `signInAction(formData: SignInInput)`
- **Route / Scope**: Server Action (`lib/actions/auth.ts`)
- **Caller**: Public guest
- **Input**: `{ email: string; password: string }`
- **Output**: `{ success: true, redirectUrl: string }` (Redirects to role-specific dashboard)

---

### 3.2. Examination Management Actions (Faculty / Admin)

#### `createExamAction(input: CreateExamInput)`
- **Route / Scope**: Server Action (`lib/actions/exams.ts`)
- **Authorization**: Role `faculty` or `admin` in target university
- **Input**:
  ```typescript
  interface CreateExamInput {
    courseId: string;
    title: string;
    description?: string;
    durationMinutes: number;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
    totalPoints: number;
    settings: {
      requireCamera: boolean;
      requireAudio: boolean;
      requireFullscreen: boolean;
      maxViolationsThreshold: number;
    };
  }
  ```
- **Output**: `{ success: true, examId: string }`

#### `publishExamAction(examId: string)`
- **Route / Scope**: Server Action (`lib/actions/exams.ts`)
- **Authorization**: Exam author or University Admin
- **Behavior**: Verifies that total question points equal `exam.total_points`, transitions status from `draft` to `published`.

#### `createQuestionAction(input: CreateQuestionInput)`
- **Route / Scope**: Server Action (`lib/actions/questions.ts`)
- **Authorization**: Faculty / Admin
- **Input**:
  ```typescript
  interface CreateQuestionInput {
    examId: string;
    orderIndex: number;
    type: 'mcq' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
    prompt: string;
    points: number;
    explanation?: string;
    options?: Array<{
      label: string;
      content: string;
      isCorrect: boolean;
    }>;
  }
  ```

---

### 3.3. Student Exam Workflow Actions

#### `startExamSessionAction(examId: string, hardwareStatus: HardwareCheckStatus)`
- **Route / Scope**: Server Action (`lib/actions/sessions.ts`)
- **Authorization**: Student enrolled in the course
- **Pre-Conditions**:
  - Current timestamp between `exam.start_time` and `exam.end_time`.
  - Student has no prior submitted session.
  - Required hardware permissions confirmed.
- **Output**:
  ```typescript
  interface StartSessionResponse {
    sessionId: string;
    exam: {
      id: string;
      title: string;
      durationMinutes: number;
      endTime: string;
      settings: ExamSettings;
    };
    questions: Array<{
      id: string;
      orderIndex: number;
      type: QuestionType;
      prompt: string;
      points: number;
      options?: Array<{
        id: string;
        label: string;
        content: string;
        // NOTE: is_correct is strictly STRIPPED
      }>;
    }>;
  }
  ```

#### `saveAnswerAction(input: SaveAnswerInput)`
- **Route / Scope**: Server Action (`lib/actions/answers.ts`)
- **Authorization**: Student owner of the session
- **Input**:
  ```typescript
  interface SaveAnswerInput {
    sessionId: string;
    questionId: string;
    selectedOptionId?: string;
    responseText?: string;
  }
  ```
- **Behavior**: Upserts candidate response in `answers` table, updates `updated_at`.

#### `submitExamAction(sessionId: string)`
- **Route / Scope**: Server Action (`lib/actions/sessions.ts`)
- **Authorization**: Student owner of session
- **Behavior**:
  1. Sets session status to `submitted`, records `submitted_at = now()`.
  2. Executes server-side auto-grading for all MCQ and True/False questions by comparing `answers.selected_option_id` against `question_options.is_correct`.
  3. Computes provisional score.
- **Output**: `{ success: true, submittedAt: string, provisionalScore?: number }`

---

### 3.4. Invigilator Actions

#### `sendInterventionAction(input: InterventionInput)`
- **Route / Scope**: Server Action (`lib/actions/invigilator.ts`)
- **Authorization**: Invigilator or Faculty assigned to the exam
- **Input**:
  ```typescript
  interface InterventionInput {
    sessionId: string;
    actionType: 'WARNING_MESSAGE' | 'CAMERA_CHECK_REQUEST' | 'PAUSE_EXAM' | 'TERMINATE_EXAM';
    message: string;
  }
  ```
- **Behavior**: Inserts record into `session_interventions`. Triggers Realtime event to student portal. If `actionType === 'TERMINATE_EXAM'`, sets `exam_sessions.status = 'terminated'`.

---

## 4. RESTful Route Handlers (`/api/*`)

### 4.1. `POST /api/violations` (Telemetry Anomaly Ingestion)
Client-side anomaly reporter called by the local browser AI monitor every 3–5 seconds (debounced).

- **Authentication**: Bearer JWT in request header or validated session cookie.
- **Request Body**:
  ```typescript
  interface IngestViolationsRequest {
    sessionId: string;
    violations: Array<{
      type: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_OCCLUDED' | 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'WINDOW_BLUR' | 'AUDIO_ANOMALY' | 'CLIPBOARD_PASTE' | 'RIGHT_CLICK' | 'DEVTOOLS_OPEN';
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: string; // ISO 8601
      details: {
        confidence?: number;
        faceCount?: number;
        durationMs?: number;
        decibels?: number;
        message?: string;
      };
      evidenceSnapshotBase64?: string; // Optional low-res thumbnail
    }>;
  }
  ```
- **Server Processing**:
  1. Verifies session belongs to authenticated student and is `in_progress`.
  2. Validates timestamps are within reasonable drift ($\pm 60$ seconds).
  3. Deduplicates repetitive signals (e.g. 50 audio frames collapsed into one 5-second anomaly window).
  4. Stores optional evidence snapshot in Supabase Storage (`evidence/<session_id>/<timestamp>.jpg`).
  5. Inserts rows into `violations`.
  6. Recalculates and decrements `exam_sessions.trust_score` atomically via SQL trigger or transaction.
- **Response**:
  ```json
  {
    "success": true,
    "ingestedCount": 2,
    "currentTrustScore": 88.00
  }
  ```

---

### 4.2. `GET /api/exams/[id]/export`
Institutional gradebook and audit export.

- **Authentication**: Faculty or Admin
- **Query Parameters**: `format=csv|json`
- **Response**:
  - `Content-Type: text/csv` or `application/json`
  - Columns: Student Name, Email, Session Status, Started At, Submitted At, Score, Final Trust Score, Total Violations Count, Breakdown of Anomaly Types.

---

### 4.3. `POST /api/integrations/lms/webhook`
Future LMS / SIS webhook receiver (Canvas, Moodle, Blackboard).

- **Authentication**: HMAC-SHA256 signature header (`X-ExamGuard-Signature`)
- **Payload**:
  ```typescript
  interface LmsWebhookPayload {
    event: 'course.created' | 'roster.updated' | 'grade.sync_requested';
    universitySlug: string;
    data: unknown;
  }
  ```
- **Response**: `202 Accepted`

