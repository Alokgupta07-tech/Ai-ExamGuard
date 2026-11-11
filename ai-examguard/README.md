# AI ExamGuard

AI ExamGuard is a privacy-first online examination integrity and remote invigilation platform built with Next.js 16 (App Router), TypeScript, Tailwind CSS, MediaPipe Tasks Vision, Web Audio API, and Supabase (PostgreSQL with Row-Level Security, Auth, and Realtime).

Live Production Deployment: **https://ai-examguard-three.vercel.app**

---

## Product Introduction

Institutions conducting remote assessments need trustworthy session monitoring without violating student privacy through continuous raw webcam video or raw microphone streaming. AI ExamGuard runs face detection, landmark presence filtering, acoustic energy analysis, and browser focus monitoring **locally in the candidate's browser**, transmitting only structured metadata events (without raw frames or audio buffers) to a multi-tenant backend for explainable human invigilator review.

---

## Features

- **In-Browser Camera & Face Proctoring (`mediapipe-face-monitor.ts`)**: Permission preflight, live preview, MediaPipe Face Landmarker asynchronous model loading, sustained absence (`FACE_NOT_VISIBLE`), sustained multi-face (`MULTIPLE_FACES_DETECTED`), and hardware disconnection (`CAMERA_DISCONNECTED`, `CAMERA_PERMISSION_DENIED`) with temporal frame coalescing.
- **Audio Intelligence & Browser Telemetry (`audio-analyzer.ts`)**: Web Audio `AnalyserNode` short-window RMS energy and spectral meters with noise-suppression / echo-cancellation constraint detection, optional VAD separation between raw sound energy and human speech probability, microphone disconnect/denial alerts, plus `TAB_HIDDEN`, `FULLSCREEN_EXIT`, and `SESSION_CONNECTION_INTERRUPTED` tracking.
- **Event Intelligence & Explainable Risk Engine (`risk-engine.ts`)**: Server-authoritative event validation, raw media payload rejection, clock-skew checks, `client_event_id` deduplication, continuous episode coalescing, cross-channel temporal correlation rules, and non-punitive categories (`NORMAL`, `REVIEW_SUGGESTED`, `PRIORITY_REVIEW`).
- **Four Role Portals (`admin`, `faculty`/`instructor`, `invigilator`, `student`)**:
  - **Admin Console (`/admin`)**: User RBAC management, departments, courses, exams, reports, audit logs, security overview, and integration configuration.
  - **Faculty Workspace (`/faculty`)**: Question bank authoring, exam builder/publisher, candidate assignment, submission results, and analytics.
  - **Invigilator Command Centre (`/invigilator`)**: Live Supabase Realtime alert queue, candidate monitoring grid, candidate drawer timeline, clear separation of real AI detections (`ai_detection`) vs demonstration events (`simulated_demo`), and persistent reviewer adjudication actions.
  - **Student Portal (`/student`, `/exam/[examId]/preflight`, `/exam/[examId]`)**: Assigned exams, hardware preflight verification, answer autosave & reload recovery, countdown sync, and idempotent submission receipts.
- **Reporting & Integration Foundations (`reporting.ts`, `lib/integrations`)**: 7 filterable operational reports with formula-injection-safe CSV export (`lib/utils/csv.ts`), immutable audit logs, and secret-sanitized extension contracts for LTI 1.3, OIDC, SAML, REST webhooks, and QTI.

---

## Architecture

```text
+-------------------------------------------------------------------------+
| Student Browser (Chrome / Edge)                                         |
|  - MediaPipe Tasks Vision (/mediapipe/vision_bundle.mjs + WASM + model) |
|  - Web Audio AnalyserNode + TemporalProctorFilter (metadata only)       |
|  - Exam Taking UI -> PUT /answers | POST /submit | POST /proctor-events |
+------------------------------------+------------------------------------+
                                     | HTTPS JSON (zero raw video/audio)
                                     v
+-------------------------------------------------------------------------+
| Next.js 16 App Router on Vercel (`ai-examguard` root)                   |
|  - Edge Middleware (`middleware.ts`) -> DB `memberships` role routing   |
|  - API Routes & Server Actions (`lib/services/*`) + Zod validation      |
|  - Risk Engine (`deriveAuthoritativeEventSpec`, episode coalescing)      |
+------------------------------------+------------------------------------+
                                     | Service Role (server) & User JWT
                                     v
+-------------------------------------------------------------------------+
| Supabase (Postgres 17 + RLS + Auth + Realtime)                          |
|  - Multi-tenant schema (`tenants`, `profiles`, `memberships`, `exams`)  |
|  - Column-level triggers & `question_options_student_view` answer guard |
|  - `postgres_changes` -> Invigilator Command Centre live subscriptions  |
+-------------------------------------------------------------------------+
```

---

## Technology Stack

- **Framework & Runtime:** Next.js `16.4.6` (App Router, Turbopack, Cache Components), React `19.3`, Node.js `>= 20`
- **Language & Validation:** TypeScript `^5` (strict mode + `noUncheckedIndexedAccess`), Zod `^4.6.7`, React Hook Form `^7.91.0`
- **Styling & Animation:** Tailwind CSS `4.3.3`, `@base-ui/react`, `lucide-react`, Recharts `^3.10.1`, GSAP `^3.15.1`, `@gsap/react`, Motion (`motion/react` `^14.12.0`)
- **Browser AI / Media:** `@mediapipe/tasks-vision` `^1.2.2`, Browser `MediaDevices` & Web Audio API
- **Backend & Data:** Supabase (`@supabase/supabase-js` `^2.119.0`, `@supabase/ssr` `^0.12.7`), PostgreSQL 17 with RLS
- **Hosting:** Vercel

---

## Installation

```bash
git clone https://github.com/Alokgupta07-tech/Ai-ExamGuard.git
cd Ai-ExamGuard/ai-examguard
npm install
```

Ensure `public/mediapipe/` assets (`vision_bundle.mjs` and `wasm/`) are present (included in repository).

---

## Environment Variables

Copy `.env.example` to `.env.local` inside `ai-examguard/` and configure both locally and in your Vercel Project Settings (`Production`, `Preview`, `Development`):

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client + Server | Supabase project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public / Client + Server | Supabase anon / publishable client key |
| `SUPABASE_SECRET_KEY` | Server Only (**Never `NEXT_PUBLIC_`**) | Supabase service role secret key used exclusively on server routes/actions |

Never commit `.env.local`, real database passwords, or hardcoded credentials to git.

---

## Database Migrations

SQL migrations live in `ai-examguard/supabase/migrations/` (ordered `20261110000001` through `20261111000006`).

Apply pending migrations to your linked Supabase project:

```bash
cd ai-examguard
npx supabase link --project-ref <your-project-ref>
npx supabase db push --remote=<your-project-ref>
```

The latest security migration `20261111000006_security_hardening_phase14.sql` installs the `private.enforce_exam_session_column_security()` `BEFORE UPDATE` trigger so students cannot modify `score`, `trust_score`, `status`, or risk columns via direct PostgREST queries.

---

## Demo User Setup

An idempotent CLI script (`scripts/seed-demo.ts`) provisions an isolated **Demo University** tenant (`slug: demo-university`), 5 role accounts, sample courses, a live demo examination (`CS-301 Cloud & Integrity Assessment (Live Demo)`), and a completed sample session separating real telemetry format from an explicitly tagged `simulated_demo` event.

Run locally with an explicit password in your shell environment (never commit passwords):

```bash
cd ai-examguard
# PowerShell example:
$env:DEMO_ACCOUNT_PASSWORD="YourStrongRuntimePassword1!"
npm run seed:demo
```

Provisioned demo emails:

- **University Admin:** `admin@demo-university.edu`
- **Faculty:** `faculty@demo-university.edu`
- **Invigilator:** `invigilator@demo-university.edu`
- **Student One:** `student1@demo-university.edu`
- **Student Two:** `student2@demo-university.edu`

If `DEMO_ACCOUNT_PASSWORD` is omitted, the script generates a cryptographic random password at runtime and prints it once to stdout.

---

## Local Development

```bash
cd ai-examguard
npm run dev
```

Open `http://localhost:3000`. Configure `supabase/config.toml` `additional_redirect_urls` if testing email confirmation or password recovery flows locally.

---

## Testing

```bash
cd ai-examguard

# 1. Unit tests (CSV escaping, secret sanitization, raw-media blockers, filters, risk engine)
npm test

# 2. Strict TypeScript type checking & ESLint
npx tsc --noEmit
npm run lint

# 3. Production build
npm run build

# 4. Live E2E RBAC, DB RLS, exam workflow & Realtime suite (requires running app + .env.local)
BASE_URL=http://127.0.0.1:3011 npx tsx --test tests/e2e-security-db-auth-exam.test.ts

# 5. Live browser UI audit across Chrome & Edge
BASE_URL=http://127.0.0.1:3011 npx tsx --test tests/browser-ui-audit.ts
```

---

## Deployment (Vercel)

1. Connect the GitHub repository in Vercel with **Root Directory** set to `ai-examguard`.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` in Vercel Environment Variables.
3. Configure `Permissions-Policy: camera=(self), microphone=(self), fullscreen=(self)` (already configured in `next.config.ts`).
4. Push all reviewed migrations (`20261110000001`–`20261111000006`) to Supabase.
5. Configure Supabase Auth URL settings (`site_url` and `additional_redirect_urls`) to include your production Vercel domain (`https://ai-examguard-three.vercel.app/**`).
6. Deploy (`git push origin main` or `vercel --prod`) and run the live acceptance suite against the production URL over HTTPS.

---

## Limitations

- **Client-Side Execution Trust Model**: Webcam, microphone, and browser visibility telemetry execute on the candidate's device. External physical devices, second monitors outside screen capture scope, or OS-level VM tools cannot be exhaustively detected from standard browser APIs.
- **Acoustic Energy vs Speech Identity**: By default, Web Audio RMS computes room acoustic energy rather than speaker identity or confirmed human speech unless an optional VAD classifier is active.
- **Advisory Proctoring Only**: All risk indicators (`NORMAL`, `REVIEW_SUGGESTED`, `PRIORITY_REVIEW`) are non-punitive aids requiring human invigilator/faculty confirmation.
- **LMS Integration Foundations**: Enterprise integration interfaces store sanitized connector settings and contracts without complete live external LTI 1.3 / SAML SSO exchanges in this release.

---

## Future Development

- Complete external LTI 1.3 deep-linking, SAML 2.0 / OIDC institutional SSO provisioning, and signed outbound QTI result webhooks.
- Opt-in client-side Silero/ONNX VAD WASM adapter for verified speech-vs-ambient-noise separation.
- Offline answer-sync queue persistence across browser crashes (IndexedDB).
- Live encrypted short snapshot evidence uploads when explicitly authorized by institutional retention policies.
- Next.js migration from `middleware.ts` to the `proxy.ts` convention in a future major release.
