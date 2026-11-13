# AI ExamGuard — Complete Security & RLS Policy Audit

**Audit Date:** November 13, 2026  
**Auditor:** Principal Application Security Engineer & Supabase Database Architect  
**Classification:** Institutional Examination Security & Privacy Review  

---

## 1. Security Architecture Overview

AI ExamGuard operates as a multi-tenant institutional assessment platform enforcing strict confidentiality, integrity, and non-repudiation across four distinct user roles:
1. **Institutional Administrator (`admin`)**: Manages tenant settings, department faculties, courses, and security integrations.
2. **Faculty / Instructor (`instructor`)**: Authors question banks, schedules examination windows, configures integrity policies, and conducts post-hoc review cases.
3. **Invigilator (`invigilator`)**: Real-time SOC command centre monitoring, candidate stream observation, live announcements, and warning issuance.
4. **Student / Candidate (`student`)**: Preflight system calibration, secure examination taking, answer outbox synchronization, and submission receipt verification.

---

## 2. Row-Level Security (RLS) Policy Audit

All 16 application tables in `public` schema have Row-Level Security explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

| Table | RLS Status | Select Policy | Insert Policy | Update Policy | Delete Policy | Evaluation |
|---|---|---|---|---|---|---|
| `tenants` | **Enabled** | Tenant members only (`is_tenant_member`) | Service role only | Admins only | Forbidden | **SECURE** |
| `profiles` | **Enabled** | User's own row (`id = auth.uid()`) | User's own row (`id = auth.uid()`) | User's own row (`id = auth.uid()`) | Forbidden | **SECURE** |
| `tenant_memberships` | **Enabled** | Tenant members view member list | Admins only | Admins only | Admins only | **SECURE** |
| `courses` | **Enabled** | Tenant members view courses | Instructors & Admins | Instructors & Admins | Admins only | **SECURE** |
| `exams` | **Enabled** | Tenant members view published; author views draft | Instructors & Admins | Instructors & Admins | Instructors & Admins | **SECURE** |
| `questions` | **Enabled** | Instructors/Admins view all; Students view **ONLY active session paper** | Instructors & Admins | Instructors & Admins | Instructors & Admins | **CRITICAL: SECURE** |
| `question_options` | **Enabled** | **`is_correct` STRIPPED from student payloads** | Instructors & Admins | Instructors & Admins | Instructors & Admins | **CRITICAL: SECURE** |
| `exam_sessions` | **Enabled** | Student views own; Invigilator/Instructor views exam | Student initializes own | Student updates progress; Invigilator reviews | Forbidden | **SECURE** |
| `student_answers` | **Enabled** | Student views own; Faculty views post-submission | Student writes own answers | Student writes own answers before expiry | Forbidden | **SECURE** |
| `proctor_events` | **Enabled** | Invigilators & Faculty view exam events; Students insert own | Student writes structured telemetry only | Reviewers update status | Forbidden | **SECURE** |
| `exam_policies` | **Enabled** | Tenant members view; Instructors update | Instructors & Admins | Instructors & Admins | Forbidden | **SECURE** |
| `audit_logs` | **Enabled** | Admins view tenant logs | Server actions only (Append-only) | Immutable | Immutable | **SECURE** |

---

## 3. Critical Security Verification Areas

### 3.1 Answer Key Confidentiality
- **Risk:** Students inspecting network payloads in Chrome DevTools to locate correct answers.
- **Protection Implementation:**
  - Route `/api/student/exams/[examId]/session` strips `is_correct` and faculty explanation fields from question options before sending the response to the client.
  - Verification test in `tests/e2e-security-db-auth-exam.test.ts` confirms `is_correct` is never present in student API payloads.

### 3.2 Server-Authoritative Timestamps & Anti-Spoofing
- **Risk:** Student manipulating system clock to extend examination duration or modify warning timestamps.
- **Protection Implementation:**
  - Server computes remaining duration using `Date.parse(session.expiresAt) - serverNow`.
  - Client clock offset is calibrated on session bootstrap: `clockOffset = Date.parse(serverNow) - Date.now()`.
  - All proctoring events store `server_received_at = NOW()` in the database regardless of client-reported `client_timestamp`.

### 3.3 CSV Formula Injection Prevention
- **Risk:** Malicious candidate or course names containing spreadsheet formula injection vectors (`=`, `+`, `-`, `@`, `|`, `\t`, `\r`) executed when faculty exports reports.
- **Protection Implementation:**
  - `lib/services/reporting.ts` executes RFC-4180 compliant sanitization, prefixing dangerous trigger characters with single quotes `'` while preserving valid negative numbers.
  - Verified by unit test: `tests/unit-security-and-engines.test.ts` ("CSV security: escapes formula injection payloads").

### 3.4 Integration Secret Redaction
- **Risk:** LMS/Webhook API keys leaking through audit logs or client views.
- **Protection Implementation:**
  - `lib/integrations/service.ts` strips plaintext tokens and returns cryptographically masked strings (`••••••••abcd`) in client payloads.
  - Service role client (`supabaseAdmin`) is restricted to server-side API routes and Server Actions; never exported or imported in client bundles.

---

## 4. Threat Matrix & Mitigations

| Threat | Vulnerability Vector | Implemented Mitigation | Residual Risk |
|---|---|---|---|
| **Student impersonation** | Stolen credentials | Multi-tenant session cookies with SameSite=Lax and HTTP-only verified roles | Low |
| **Answer tampering** | Modifying answer payload post-submission | Atomic submission transaction flags `status = 'submitted'`, locking further answer writes via RLS | Negligible |
| **Fake proctor events** | Spoofing high risk to frame other candidates | Session token validation ensures events match authenticated user's active session ID | Negligible |
| **Denial of Service via video** | Streaming high-res video into database tables | Database stores only lightweight telemetry metadata; media transported via LiveKit/WebRTC | Negligible |
