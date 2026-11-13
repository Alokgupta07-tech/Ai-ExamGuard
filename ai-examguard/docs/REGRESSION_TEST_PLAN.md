# AI ExamGuard — Comprehensive Regression Test Plan

**Document Version:** 1.0  
**Date:** November 13, 2026  
**Auditor / QA Lead:** Principal QA Automation Specialist & Full-Stack Security Architect  

---

## 1. Objective & Scope

This document specifies the regression test suite for AI ExamGuard across its seven core subsystems:
1. **Authentication & Multi-Tenant Role Isolation**
2. **Examination Engine & Student Workspace**
3. **AI Multimodal Monitoring & Computer Vision**
4. **Live SOC Monitoring & Invigilation**
5. **Warning Engine & Idempotent Submission**
6. **Frontend Navigation, INP & Accessibility**
7. **Database Security & RLS Isolation**

---

## 2. Test Suite Architecture

| Test Suite | File Location | Execution Command | Purpose |
|---|---|---|---|
| **Unit Security & Engine** | `tests/unit-security-and-engines.test.ts` | `npm test` | Mathematical validation of risk engine, CSV sanitization, temporal filter, warning engine |
| **E2E Security & Auth** | `tests/e2e-security-db-auth-exam.test.ts` | `npx tsx --test tests/e2e-security-db-auth-exam.test.ts` | Database-level role permissions, answer key stripping, multi-tenant isolation |
| **Live Acceptance & CDP** | `tests/live-acceptance.test.ts` | `npx tsx tests/live-acceptance.test.ts` | End-to-end browser walkthrough using Chrome DevTools Protocol |
| **Cinematic 3D Scroll** | `scripts/test-cinematic-scroll.mjs` | `node scripts/test-cinematic-scroll.mjs` | Multi-viewport WebGL rendering, canvas lifecycle, scroll interpolation |

---

## 3. Test Cases Specification

### 3.1 Authentication & Multi-Tenant Isolation
- **TC-AUTH-01: Four-Role Authorization:** Verify student, faculty, invigilator, and admin credentials map to their dedicated dashboard routes (`/student`, `/faculty`, `/invigilator`, `/admin`).
- **TC-AUTH-02: Tenant Membership Fallback:** Verify that newly invited users with missing `tenant_memberships` are auto-bootstrapped to the canonical SRM University–AP tenant without HTTP 500 or UI crashes.
- **TC-AUTH-03: Session Refresh & Cookie Security:** Verify verified roles cookie (`sb-verified-roles`) expires in 5 minutes and respects `httpOnly: true, sameSite: 'lax'`.
- **TC-AUTH-04: Unauthorized Route Protection:** Verify student attempting to access `/admin` or `/faculty` is immediately redirected to `/unauthorized`.

### 3.2 Examination Engine & Student Workspace
- **TC-EXAM-01: Question Navigation Decoupling:** Verify clicking Next/Previous or question numbers advances index without altering selected answer or auto-skipping questions.
- **TC-EXAM-02: Outbox Autosave & Network Drop:** Verify answer choices are written to `localStorage` immediately, flushed in batch to `/api/student/exams/[examId]/answers`, and preserved across page refresh.
- **TC-EXAM-03: Answer Key Protection:** Verify `/api/student/exams/[examId]/session` strips `is_correct` from all question options.
- **TC-EXAM-04: Single-Fire Submission:** Verify clicking "Submit Exam" triggers exactly one atomic transaction, transitions session status to `submitted`, and issues a cryptographic receipt.

### 3.3 AI Multimodal Proctoring
- **TC-AI-01: MediaPipe Model Singleton:** Verify face landmark detector and object detector load only once per examination session and reuse instance across frames.
- **TC-AI-02: Temporal Anomaly Filter:** Verify single-frame face blinks do not trigger false `FACE_NOT_VISIBLE` alerts; require sustained absence (≥ 3.5s) before emitting an incident.
- **TC-AI-03: Audio Formant Isolation:** Verify background keyboard clicks and air conditioning noise are filtered as ambient energy, requiring human vocal formant envelope (VAD) to trigger speech alert.
- **TC-AI-04: Hardware Resource Cleanup:** Verify unmounting proctor panel halts video stream, stops requestAnimationFrame loops, and closes `AudioContext`.

### 3.4 Live SOC Monitoring & Invigilation
- **TC-SOC-01: Realtime Event Feed:** Verify invigilator receives incoming student incidents within 1.5s via Supabase Realtime broadcast or postgres changes.
- **TC-SOC-02: Candidate Stream Connection:** Verify invigilator grid renders low-resolution participant tiles and upgrades to high-resolution only upon candidate modal focus.
- **TC-SOC-03: LiveKit Fallback Handling:** If LiveKit server credentials are not configured, verify the dashboard renders an informative status pill without throwing uncaught exceptions.

### 3.5 Warning Engine & Automatic Submission
- **TC-WARN-01: Strike Cooldown:** Verify consecutive alerts within 20s cooldown period are coalesced into a single incident and do not increment warning count.
- **TC-WARN-02: Technical Incident Exclusion:** Verify camera disconnect or network blip emits a non-strike incident and does not penalize candidate.
- **TC-WARN-03: Automatic Submission on 3 Strikes:** Verify 3 distinct qualifying misconduct strikes trigger automatic exam finalization, persisting all pending answers before locking the paper.

### 3.6 Frontend Performance & Core Web Vitals
- **TC-PERF-01: INP Delay ≤ 200ms:** Verify typing examination title in `#wiz-title` triggers 0ms input delay and maintains INP ≤ 64ms.
- **TC-PERF-02: LCP ≤ 2.5s:** Verify public homepage Largest Contentful Paint renders within 2.5s on desktop and mobile.
- **TC-PERF-03: CLS ≤ 0.1:** Verify zero layout shift during Three.js dynamic loading and font hydration.
- **TC-PERF-04: Multi-Viewport Responsiveness:** Verify layout renders without horizontal scroll across `320×640`, `390×844`, `768×1024`, `1280×800`, and `1440×900`.

---

## 4. Automated Regression Execution Script

All tests can be executed sequentially via:
```bash
# 1. Typecheck & Lint
npx tsc --noEmit
npm run lint

# 2. Unit Security & Policy Suite
npm test

# 3. Production Build Validation
npm run build
```
