# AI ExamGuard — Technical Implementation & Architecture Report

**Client:** SRM University–AP  
**System:** AI ExamGuard (Client-Side Proctoring & Examination Assessment System)  
**Architecture:** Next.js 16 (App Router & Turbopack), Supabase PostgreSQL with RLS, Tailwind CSS v4, Motion (Framer Motion)  
**Date:** November 12, 2026  
**Build Status:** Verified Production Ready (`58/58` routes compiled, 0 errors)  

---

## 1. System Architecture Overview

AI ExamGuard is engineered to deliver zero-friction, privacy-preserving academic examinations with intelligent client-side telemetry. Rather than streaming continuous high-bandwidth video to cloud servers, all computer vision (MediaPipe face landmark estimation) and acoustic energy analysis execute directly within the candidate's browser via WebAssembly and Web Audio API.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE                           │
├──────────────────────────┬───────────────────┬─────────────────────────┤
│ Client Browser Runtime   │ Next.js App API   │ Supabase Infrastructure │
├──────────────────────────┼───────────────────┼─────────────────────────┤
│ • MediaPipe Face Land-   │ • Session Auth &  │ • PostgreSQL Relational │
│   mark WebAssembly       │   Actor Resolver  │   Schema with RLS       │
│ • Web Audio RMS Meter    │ • Micro-Batch     │ • Row Level Security    │
│ • Local Outbox & Sync    │   Answer Persist  │ • pg_trgm Search        │
│ • Fullscreen Lock        │ • Server Scoring  │ • Audit Log Ledger      │
│ • Responsive UI Engine   │ • Roster Sync     │ • Real-time Channels    │
└──────────────────────────┴───────────────────┴─────────────────────────┘
```

---

## 2. Core Modules Implemented

### 2.1 Actor Resolution & Multi-Tenant Fallback
- **Location:** `lib/services/dashboard.ts`, `lib/services/auth.ts`
- **Functionality:** Resolves authenticated user tokens to their corresponding institutional tenant. In the event of orphaned or newly invited demo users, automatically provisions an active membership to `srmap-demo` (`55d810b1-0555-43d2-97e2-d4a420b6173e`), preventing unhandled client crashes and 401 redirect loops.

### 2.2 Examination Engine & Assessment Patterns
- **Location:** `lib/services/exam-engine.ts`, `lib/services/exam-session.ts`, `components/exam/`
- **Capabilities:**
  1. **Pattern 1 (CLA-3):** 10-question objective assessment with negative marking fraction ($0.25$) and instant server scoring.
  2. **Pattern 2 (Mid-Semester):** 7-question written assessment enforcing the strict **"Answer any 5 of 7 questions"** attempt rule. Automatically locks unselected questions when 5 are answered and provides a clean descriptive essay workspace with auto-save.
  3. **Pattern 3 (End-Semester):** 10-question comprehensive assessment template maintained in `draft` status labeled `"PROVISIONAL DEMO TEMPLATE"`.

### 2.3 Responsive Data Table Engine
- **Location:** `components/shared/data-table.tsx`
- **Functionality:** Eliminates horizontal table clipping on mobile viewports (< 768px, including 390×844 iPhone and 406×695 Android). Automatically transforms table rows into high-density vertical cards with prominent status badges and accessible action buttons.

### 2.4 Weekly Academic Timetable
- **Location:** `components/shared/academic-timetable.tsx`
- **Functionality:** Renders the official SRM University–AP B.Tech CSE Semester III schedule across Periods 1 to 8 (09:00 to 17:30 IST) for all 7 academic courses, mapping instructors, classrooms, and lecture periods.

### 2.5 Demonstration Feedback & Audit System
- **Location:** `components/shared/demo-feedback-modal.tsx`, `app/api/feedback/route.ts`, `app/(dashboard)/admin/feedback/page.tsx`
- **Functionality:** Provides a persistent modal for faculty, deans, and reviewers to rate and critique the platform. Collects ratings and comments into `demo_feedback` and surfaces real-time metrics in the administrator dashboard.

---

## 3. Production Verification Metrics

- **TypeScript Compilation:** `npx tsc --noEmit` exited with code 0 (0 errors).
- **Next.js Production Build:** `next build` executed with Turbopack, generating static and dynamic output for all 58 application routes.
- **Client Bundle Size:** Optimized with font subsetting, tree-shaken Lucide icons, and code-split proctoring models.

