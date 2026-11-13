# AI ExamGuard — Complete Bug Audit & Root Cause Analysis

**Environment:** Production & Staging / SRM University–AP Demo  
**Auditor:** Principal Software Engineer, Senior Next.js Architect & Supabase Engineer  
**Date:** November 13, 2026  
**Scope:** Full-stack codebase audit across architecture, authentication, navigation, examination engine, AI proctoring, database RLS, and React performance.

---

## Executive Summary

A comprehensive line-by-line inspection and runtime diagnostic analysis was conducted across the entire AI ExamGuard codebase. The audit identified issues spanning authentication cascading re-renders, Next.js middleware network roundtrips, React hook state synchronization in effects, Three.js render-phase ref access, and missing error boundaries.

Each defect has been classified by severity with reproduction steps, confirmed root causes, code fixes, and verification test requirements.

---

## 1. Bug Inventory & Root Cause Analysis

### BUG-001: Infinite/Cascading Re-Render Loop in AuthProvider Causing Slow Navigation & HTTP 401s
- **Problem:** Navigating between dashboard pages feels slow and sluggish (1.5s–3.5s per click); frequent HTTP 401 errors on `/rest/v1/profiles` in browser console; input delay when typing.
- **Affected Route / Module:** `components/providers/auth-provider.tsx`, `lib/supabase/client.ts`, `lib/services/auth.ts`
- **Reproduction Steps:**
  1. Log into any role (student, faculty, invigilator, admin).
  2. Open Chrome DevTools Network and Console tabs.
  3. Click between sidebar links (e.g. `/student` → `/student/upcoming` → `/student/history`).
  4. Observe rapid stream of redundant `getUser()` and `/rest/v1/profiles` requests; observe occasional HTTP 401 Unauthorized errors.
- **Actual Root Cause:**
  1. `lib/supabase/client.ts` exported `createClient()` which returned `createBrowserClient(...)` without caching. A new Supabase client instance was generated on every call.
  2. In `components/providers/auth-provider.tsx`, `const supabase = createClient();` was executed directly in the component body.
  3. The `useEffect` for session checks included `supabase` in its dependency array: `[fetchProfile, supabase]`.
  4. On every render, `supabase` received a brand-new object reference, triggering the `useEffect` again.
  5. The effect called `fetchProfile()`, which called `setUser()`, which triggered a re-render of `AuthProvider`.
  6. This created a rapid render loop, spamming Supabase with token validation requests. During token refresh or rate-limiting, PostgREST rejected unauthenticated requests with HTTP 401.
- **Severity:** Critical
- **Proposed Fix:**
  1. Implement client singleton caching in `lib/supabase/client.ts`.
  2. In `AuthProvider`, memoize `supabase = useMemo(() => createClient(), [])`.
  3. Ensure `fetchProfile` gracefully catches HTTP 401 and refreshes token before falling back.
- **Verification Test:** Automated network inspection during 5 consecutive route navigations; verify `getUser()` is called once on mount and 0 times during client navigation.

---

### BUG-002: Middleware Network Roundtrip Waterfall on Every Public Page & Asset
- **Problem:** High Time-to-First-Byte (TTFB) on landing page `/` and API routes; prefetching links saturates network connections with redundant remote Supabase calls.
- **Affected Route / Module:** `middleware.ts`
- **Reproduction Steps:**
  1. Navigate to public landing page `http://localhost:3000/`.
  2. Inspect server-side execution logs.
  3. Notice `supabase.auth.getUser()` being called over HTTPS to Supabase even though `/` is a public route.
- **Actual Root Cause:**
  In `middleware.ts`, `await supabase.auth.getUser()` was called at the top of the function *before* checking whether the requested path was a protected route (`isProtectedRoute`) or an auth route (`isAuthRoute`). Public routes and API endpoints were subjected to unnecessary remote auth roundtrips.
- **Severity:** High
- **Proposed Fix:**
  1. Check `isProtectedRoute` and `isAuthRoute` before performing auth queries.
  2. If the request has no Supabase auth cookies and is attempting to access a protected route, redirect to `/login` immediately without executing an HTTPS roundtrip to Supabase.
  3. If accessing a public route (`/`, `/api/health`), pass through immediately.
- **Verification Test:** Benchmark middleware latency for public routes; confirm 0ms external Supabase network overhead for unauthenticated public requests.

---

### BUG-003: Synchronous State Updates Inside React Effects Causing Cascading Renders (ESLint Rule Violation)
- **Problem:** ESLint fails with `react-hooks/set-state-in-effect` on 4 dashboard components; React 19 flags cascading renders that hurt interaction latency (INP).
- **Affected Route / Module:**
  - `app/(dashboard)/admin/feedback/page.tsx:50` (`setLoading(true)`)
  - `components/dashboards/faculty/exam-wizard/step-1-info.tsx:75` (`setCourseId(...)`)
  - `components/dashboards/invigilator/command-centre.tsx:126` (`setLiveKitLoading(true)`)
  - `components/proctoring/livekit-publisher.tsx:41` (`setConnectionStatus('idle')`)
- **Reproduction Steps:**
  1. Run `npm run lint` in `ai-examguard/`.
  2. Observe `react-hooks/set-state-in-effect` errors halting the build.
- **Actual Root Cause:**
  Components called `setState` synchronously within the top-level body of `useEffect` callbacks upon mount or prop changes, forcing React to schedule an immediate second render cycle before the first committed layout settled.
- **Severity:** High
- **Proposed Fix:**
  1. Initialize states with their true initial values rather than synchronously flipping them inside effects.
  2. Use `queueMicrotask` or state-derived values where updates depend on asynchronous resolutions.
- **Verification Test:** `npm run lint` exits with code 0.

---

### BUG-004: Three.js Ref Mutation During Component Render Phase
- **Problem:** `ExamGuardCinematicScene.tsx` mutates `targetProgressRef.current = progress` during render, violating React concurrency rules.
- **Affected Route / Module:** `components/showcase/ExamGuardCinematicScene.tsx:43`
- **Reproduction Steps:**
  1. Run `npm run lint`.
  2. Observe `react-hooks/refs: Cannot access refs during render`.
- **Actual Root Cause:**
  Mutating `ref.current` during render can lead to tearing and unpredictable updates under React 19 concurrent features.
- **Severity:** Medium
- **Proposed Fix:**
  Move ref synchronization to a dedicated `useEffect([progress])`.
- **Verification Test:** `npm run lint` passes; Three.js animation interpolates smoothly across scroll progress.

---

### BUG-005: Missing Root & Dashboard Error Boundaries
- **Problem:** Any unhandled runtime error in a dashboard subcomponent crashes the entire viewport into Next.js default uncaught exception screen.
- **Affected Route / Module:** `app/error.tsx`, `app/global-error.tsx`, `app/(dashboard)/error.tsx` (Missing)
- **Reproduction Steps:**
  1. Trigger an unexpected API failure or corrupted localStorage state in `/faculty/exams`.
  2. The page unmounts completely with no user-facing recovery or retry button.
- **Actual Root Cause:**
  No error boundaries (`error.tsx`, `global-error.tsx`) were defined in `app/` or `app/(dashboard)/`.
- **Severity:** High
- **Proposed Fix:**
  Implement accessible, styled `error.tsx` at the root and dashboard levels with retry actions and sanitised error reporting.
- **Verification Test:** Intentionally trigger an error in a child component; confirm user sees an institutional recovery panel with "Try again" without losing session state.

---

### BUG-006: Stale Closure in Exam Taking Workspace Question Outbox Flush
- **Problem:** ESLint exhaustive-deps warning on `flushQueue` in `exam-taking-workspace.tsx`; potential stale paper questions reference when autosaving descriptive answers.
- **Affected Route / Module:** `components/exam/exam-taking-workspace.tsx:278, 383`
- **Reproduction Steps:**
  1. Open an exam with essay/descriptive questions.
  2. Type answers and immediately trigger a flush.
  3. If `paper` state updated, the callback closure could use stale question definitions.
- **Actual Root Cause:**
  `useCallback` dependencies omitted `paper?.questions`, triggering linter warnings and risking stale state reads during high-frequency auto-saves.
- **Severity:** Medium
- **Proposed Fix:**
  Store the active `paper` in a mutable `paperRef.current` synchronized via `useEffect([paper])`.
- **Verification Test:** Unit test autosave with changing questions array; confirm all answers persist with zero linter warnings.

---

### BUG-007: Unused Variables & Const Linter Errors in API and Auth Services
- **Problem:** `prefer-const` and unused variable warnings in `app/api/feedback/route.ts` and `lib/services/auth.ts`.
- **Affected Route / Module:** `app/api/feedback/route.ts:36`, `lib/services/auth.ts:141`
- **Reproduction Steps:**
  Run `npm run lint`.
- **Actual Root Cause:**
  `let userId` and `let { data: profile, error: pError }` were declared using `let` without being reassigned, and `pError` was unread.
- **Severity:** Low
- **Proposed Fix:**
  Replace with `const` and log/handle `pError` appropriately.
- **Verification Test:** ESLint passes cleanly.

---

## 2. Bug Classification Matrix

| Bug ID | Title | Module | Severity | Status |
|---|---|---|---|---|
| **BUG-001** | Infinite AuthProvider re-render cascade & HTTP 401s | `auth-provider.tsx`, `client.ts` | **Critical** | Resolved |
| **BUG-002** | Middleware remote network roundtrip on public routes | `middleware.ts` | **High** | Resolved |
| **BUG-003** | Synchronous setState in effects cascading renders | Feedback, Wizard, Command Centre | **High** | Resolved |
| **BUG-004** | Three.js ref mutation during render phase | `ExamGuardCinematicScene.tsx` | **Medium** | Resolved |
| **BUG-005** | Missing root & dashboard error boundaries | `app/error.tsx`, `global-error.tsx` | **High** | Resolved |
| **BUG-006** | Exam outbox flush stale paper closure | `exam-taking-workspace.tsx` | **Medium** | Resolved |
| **BUG-007** | Const reassignment and unused linter violations | `api/feedback`, `services/auth` | **Low** | Resolved |
