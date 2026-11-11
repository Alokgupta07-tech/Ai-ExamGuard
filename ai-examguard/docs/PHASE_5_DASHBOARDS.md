# AI ExamGuard — Phase 5: Role-Specific Dashboards

## 1. Architecture & Data Security

- **Navigation Registry**: [`lib/navigation/dashboard-nav.ts`](../lib/navigation/dashboard-nav.ts) defines all role-specific navigation menus rendered by [`AppSidebar`](../components/layout/app-sidebar.tsx).
- **Server-Side Data & Authorization**: [`DashboardService`](../lib/services/dashboard.ts) authenticates every request via `supabase.auth.getUser()` and verifies tenant role membership (`memberships`) before returning role-scoped data or executing mutations via [`dashboard-actions.ts`](../lib/actions/dashboard-actions.ts).
- **Middleware Role Isolation**: [`middleware.ts`](../middleware.ts) enforces role-to-route boundaries across `/admin/*`, `/faculty/*`, `/invigilator/*`, and `/student/*`, redirecting mismatched roles to `/unauthorized`.
- **Answer-Key Isolation**: Student data queries never access `question_answer_keys.is_correct`.

---

## 2. Implemented Role Workspaces

### A. University Administrator (`/admin/*`)
- **Routes**: `/admin`, `/admin/users` (supports `?role=instructor` & `?role=student`), `/admin/departments`, `/admin/courses`, `/admin/exams`, `/admin/question-bank`, `/admin/monitoring`, `/admin/reports`, `/admin/integrations`, `/admin/security`, `/admin/audit-logs`, `/admin/settings`.
- **Overview Widgets**: Total Students, Total Faculty, Active Examinations, Completed Exams, Flagged Sessions, Examination Activity Area Chart, University Usage Analytics Bar Chart, and Recent Audit Activity Timeline.
- **Working Actions**: Invite Member, Bulk CSV Student Import, Role reassignment/removal, Create Course, Create Draft Exam, Exam lifecycle transitions, Security Policy updates (`tenants.settings`), Integration Connector saves (`integration_configs`), Tenant Profile edits, and CSV Exports.

### B. Faculty (`/faculty/*`)
- **Routes**: `/faculty`, `/faculty/exams`, `/faculty/exams/new`, `/faculty/question-bank`, `/faculty/assignments`, `/faculty/monitoring`, `/faculty/results`, `/faculty/review-cases`, `/faculty/analytics`.
- **Overview Widgets**: My Examinations, Upcoming Exams, Active Students, Submissions, Students Requiring Review, Examination Participation Chart, and Recent Telemetry Timeline.
- **Working Actions**: Create Course, Create Draft Examination (`/faculty/exams/new`), Publish/Activate/Complete exams, inspect & adjudicate `ReviewCase` timelines via `ReviewInspectionDrawer`, and export Results CSV.

### C. Student (`/student/*`)
- **Routes**: `/student`, `/student/upcoming`, `/student/available`, `/student/history`, `/student/results`, `/student/device-readiness`, `/student/profile`, `/student/support`.
- **Overview Widgets**: Upcoming Exams, Available Now, Completed Exams, Examination Calendar, Recent Results, and live Browser Device Readiness check (`DeviceReadinessPanel`).
- **Real Hardware Diagnostics**: Tests local `navigator.mediaDevices.getUserMedia`, Web Audio RMS microphone level meter, and `document.fullscreenEnabled` without uploading any media.

### D. Invigilator (`/invigilator/*`)
- **Routes**: `/invigilator`, `/invigilator/examinations`, `/invigilator/candidates`, `/invigilator/alerts`, `/invigilator/timeline`, `/invigilator/review-cases`, `/invigilator/reports`.
- **Overview Widgets**: Active Candidates, Active Examinations, Review Required, High-Priority Alerts, Camera Connectivity telemetry bar, Microphone Connectivity telemetry bar, Recent Events Timeline, and Priority Review Cases.
- **Working Actions**: Severity filtering, CSV Incident Export, and human-in-the-loop adjudication via `ReviewInspectionDrawer` (`Clear Case`, `Log Warning`, `Escalate`) logging `review_actions` and `audit_logs`.
