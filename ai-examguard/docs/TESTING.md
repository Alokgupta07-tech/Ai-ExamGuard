# AI ExamGuard — Quality Assurance & Testing Specification

## 1. Quality Strategy & Testing Pyramid

AI ExamGuard enforces a zero-regression, multi-layer verification strategy designed to ensure absolute reliability during live institutional examinations:

```
          / \
         / E2E \       Playwright User Journeys (Candidate & Invigilator)
        /-------\
       / Integr. \     Server Action & API Route Tests (Supabase RLS)
      /-----------\
     / Unit / AI   \   MediaPipe Detection Mocks, Audio RMS, Scoring Algorithms
    /---------------\
   / Static Analysis \ TypeScript Strict Mode, ESLint, Next.js Build Checks
  /-------------------\
```

---

## 2. Static Analysis & Build Verification Protocol

Every development phase must pass three automated gates before code is committed:

```bash
# 1. ESLint Static Code Quality Check
npm run lint

# 2. Strict TypeScript Type Compilation Check
npx tsc --noEmit

# 3. Next.js Turbopack Production Build Verification
npm run build
```

**Quality Rules**:
- Zero `any` types in mission-critical modules (exam engine, scoring, RLS callers).
- Zero unused imports or dead variables.
- All dynamic App Router parameters (`params`, `searchParams`) and headers/cookies (`cookies()`) must be properly typed and awaited.

---

## 3. Edge AI & Proctoring Test Protocols

### 3.1. MediaPipe Face Detection Test Matrix

| Test Scenario | Test Input / Setup | Expected AI Signal | Tolerance / Threshold |
|---|---|---|---|
| **Normal Candidate** | Single face centered in camera view, adequate lighting | `FACE_DETECTED`, count = 1 | Confidence $\ge 0.70$ |
| **Candidate Leaves** | Candidate steps completely out of frame | `NO_FACE_DETECTED`, count = 0 | Triggers warning if duration $> 3.0\text{s}$ |
| **Secondary Person** | Colleague stands next to or behind candidate | `MULTIPLE_FACES`, count $\ge 2$ | Immediate critical event if confidence $\ge 0.65$ |
| **Occlusion / Mask** | Hand covering mouth/nose or paper covering face | `FACE_OCCLUDED` or `NO_FACE` | Event emitted with bounding box dimensions |
| **Extreme Angle** | Head turned $> 60^\circ$ left/right away from screen | Absence of front-facing landmarks | Emits attention shift alert |
| **Low Light / Glare** | Sub-optimal illumination | Low confidence warning prompt | Informs candidate to increase lighting |

### 3.2. Web Audio Acoustic Test Matrix

| Acoustic Profile | Audio Stimulus | Expected Behavior |
|---|---|---|
| **Quiet Exam Room** | Ambient background hum ($-60\text{ dB}$ to $-50\text{ dB}$) | Silence recognized; zero violation events emitted. |
| **Normal Speech / Phone Call**| Sustained vocal speech ($-35\text{ dB}$ to $-20\text{ dB}$) | `AUDIO_ANOMALY` logged with duration and average RMS. |
| **Transient Noise (Cough, Sneeze, Keystrokes)** | Brief sharp impulse $< 0.8\text{ s}$ | Filtered out by temporal smoothing ($0.3\text{ s}$ time constant) to prevent false positives. |

---

## 4. Row-Level Security (RLS) & Tenant Isolation Test Suite

A dedicated SQL/Integration test suite verifies role boundaries:

```typescript
describe('Supabase RLS Role Boundaries', () => {
  test('Student cannot view is_correct column in question_options', async () => {
    // Authenticate as Student
    const client = createTestClient('student_user');
    const { data } = await client.from('question_options').select('*');
    // Ensure is_correct is not returned or null
    expect(data?.[0]).not.toHaveProperty('is_correct');
  });

  test('Student cannot view other candidates exam_sessions', async () => {
    const client = createTestClient('student_A');
    const { data } = await client.from('exam_sessions').select('*').eq('student_id', 'student_B_id');
    expect(data).toHaveLength(0);
  });

  test('Student cannot modify their own trust_score', async () => {
    const client = createTestClient('student_user');
    const { error } = await client
      .from('exam_sessions')
      .update({ trust_score: 100.00 })
      .eq('id', 'my_session_id');
    expect(error).toBeDefined(); // RLS policy blocks update
  });

  test('Faculty can only edit exams in courses they teach', async () => {
    const client = createTestClient('faculty_A');
    const { error } = await client
      .from('exams')
      .update({ title: 'Hacked Title' })
      .eq('course_id', 'course_taught_by_faculty_B');
    expect(error).toBeDefined();
  });
});
```

---

## 5. Performance, Memory & Battery Benchmarking

Continuous AI vision monitoring in a browser can cause overheating or thermal throttling if unoptimized.

- **Frame Rate Target**: 5 FPS (200ms throttle between evaluations).
- **CPU Target**: $\le 15\%$ CPU consumption on standard quad-core laptops (Intel i5 11th Gen / Apple M1 / AMD Ryzen 5).
- **RAM Footprint**: WebAssembly memory footprint capped at $\le 120\text{ MB}$.
- **Network Ingestion Bandwidth**: Client violation batches debounced to 3–5 seconds; payload size $\le 4\text{ KB}$ per transmission.

---

## 6. Network Resilience & Offline Recovery Protocol

Online exams frequently encounter Wi-Fi drops or momentary ISP packet loss.

1. **Local State Buffering**:
   - Every candidate answer is immediately cached in `localStorage` / `IndexedDB` before sending network requests.
   - If a save answer action fails due to network disconnect, a retry queue automatically attempts resubmission every 3 seconds.
   - A non-intrusive offline status banner informs the candidate: *"Network offline — your responses are safely cached locally. Do not close the window."*
2. **Heartbeat Re-synchronization**:
   - When the network restores, all pending queued answers and buffered proctoring events are synchronized in chronological order.
3. **Grace Period on Submission**:
   - An active 60-second grace window past `exam.end_time` accommodates latency and pending retry queues.

