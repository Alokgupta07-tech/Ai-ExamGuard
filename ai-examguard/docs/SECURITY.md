# AI ExamGuard — Privacy & Security Architecture

## 1. Compliance Posture & Privacy-First Philosophy

University examinations handle sensitive student biometric and educational records governed by international privacy regulations including **FERPA** (Family Educational Rights and Privacy Act), **GDPR** (General Data Protection Regulation), and state student privacy statutes.

AI ExamGuard enforces a **zero-trust, privacy-by-design** approach:

```
┌────────────────────────────────────────────────────────┐
│               Privacy Guardrails Matrix                │
├───────────────────────────────┬────────────────────────┤
│ Video Streaming               │ Local in browser only  │
│ Video Storage                 │ Zero persistent video  │
│ Audio Streaming               │ Local in browser only  │
│ Audio Storage                 │ Zero audio recordings  │
│ Anomaly Evidence Snapshots    │ Low-res on-violation   │
│ AI Decision Autonomy          │ Zero auto-disqualify   │
│ Decision Authority            │ 100% human-in-the-loop │
└───────────────────────────────┴────────────────────────┘
```

---

## 2. In-Browser Local Processing Architecture

Unlike legacy proctoring solutions that stream continuous webcam and microphone recordings to offshore third-party call centers or cloud storage buckets:

1. **Edge AI Processing**:
   - The `@mediapipe/tasks-vision` `FaceDetector` WebAssembly model is downloaded once by the client browser.
   - Video frames are captured from `HTMLVideoElement`, transferred directly to WebGL/GPU memory on the candidate's machine, evaluated, and immediately garbage-collected.
   - Raw video pixels **never leave the user's browser**.
2. **Web Audio Decibel Processing**:
   - Audio from `navigator.mediaDevices.getUserMedia({ audio: true })` feeds into an `AudioContext` and `AnalyserNode`.
   - The system calculates Root Mean Square (RMS) energy.
   - The audio stream is **never connected to an `AudioDestinationNode` or `MediaRecorder`**.
   - No audio clips or voice recordings are ever created, stored, or transmitted.
3. **Evidence Snapshots on High-Confidence Violations**:
   - Only when a severe anomaly occurs (e.g., secondary unauthorized face detected with confidence $> 0.80$), an ephemeral low-resolution canvas snapshot ($320 \times 240$ JPEG, quality 0.5) is taken for evidence.
   - The snapshot is encrypted in transit and stored in a private, signed-URL Supabase storage bucket accessible solely to the course faculty and assigned invigilator.
   - Retention policy automatically purges evidence 30 days after the examination grade is certified.

---

## 3. Answer Key Protection & Network Tampering Countermeasures

A critical vulnerability in poorly designed online examination software is exposing correct answers in client-side JavaScript state or JSON payloads.

### Threat Vector 1: Chrome DevTools Network Tab Inspection
- **Attack**: A tech-savvy student opens DevTools, inspects `/api/exams/[id]` or the initial page props, and extracts `is_correct: true` or the solution array.
- **Mitigation**:
  - The database query executed during an active exam selects strictly:
    ```sql
    SELECT q.id, q.order_index, q.type, q.prompt, q.points,
           qo.id, qo.label, qo.content
    FROM questions q
    LEFT JOIN question_options qo ON qo.question_id = q.id
    WHERE q.exam_id = $1;
    ```
  - The `question_options.is_correct` and `questions.explanation` columns are **completely excluded** from the query projection and TypeScript interface for candidates.
  - The correct answers exist **only on the server**.

### Threat Vector 2: Client-Side Score Manipulation
- **Attack**: Student intercepts the submission payload and modifies `score: 100.00` or `trust_score: 100.00`.
- **Mitigation**:
  - The submission endpoint receives only `{ sessionId: string }`.
  - The server computes the score by fetching student selections from `answers` and comparing with `question_options.is_correct` in a secure PostgreSQL transaction.
  - The `score` and `trust_score` columns on `exam_sessions` are write-protected from student roles via RLS.

---

## 4. Authentication, Session & Token Security

1. **HTTP-Only, Secure, SameSite Cookies**:
   - Auth tokens are managed through `@supabase/ssr` using HTTP-Only cookies.
   - JavaScript execution cannot access session cookies, mitigating XSS token theft.
2. **Server-Side Token Re-Validation**:
   - The middleware never trusts unverified JWTs. It executes:
     ```typescript
     const { data: { user }, error } = await supabase.auth.getUser();
     ```
   - This re-validates the token with Supabase Auth servers on every route request.
3. **Strict Route Segregation (RBAC)**:
   - `/admin/*` requires role `admin`.
   - `/faculty/*` requires role `faculty` or `admin`.
   - `/invigilator/*` requires role `invigilator`, `faculty`, or `admin`.
   - `/student/*` requires role `student`.
   - `/exam/[id]` verifies student enrollment in the course and active exam schedule.

---

## 5. Web Application Hardening (OWASP Top 10)

| Vulnerability | Attack Vector | AI ExamGuard Protection |
|---|---|---|
| **SQL Injection** | Malicious input in forms or filters | Supabase parameterized queries and PostgreSQL prepared statements. Zero raw string concatenation in SQL queries. |
| **XSS (Cross-Site Scripting)** | Malicious scripts in question prompts | React JSX default HTML escaping; DOMPurify sanitization on rich-text question bodies; strict Content Security Policy (CSP). |
| **CSRF** | Forged cross-site requests | Next.js Server Actions enforce Origin and Host header verification by default. Cookies configured with `SameSite=Lax`. |
| **Replay & Timing Attacks**| Submitting answers after deadline | Server-side validation against `exams.end_time` with a hard 60-second grace window for network latency. Submissions past grace period are rejected. |
| **Tampered Telemetry** | Scripting false "clean" proctoring events | Random server heartbeats and continuous timestamp sequencing. |

---

## 6. Secrets Hygiene & Environment Isolation

- Public variables prefixed with `NEXT_PUBLIC_` contain non-sensitive identifiers only (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- Secret keys (`SUPABASE_SECRET_KEY`, service role keys) are strictly restricted to Node.js server environments and injected via Vercel encrypted environment variables.
- Git repository enforces `.gitignore` rules preventing `.env*` tracking, with automated pre-commit scanning.

