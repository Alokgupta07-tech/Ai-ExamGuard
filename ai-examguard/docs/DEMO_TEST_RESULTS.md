# AI ExamGuard — Demonstration Test Matrix & Execution Verification

**Institution:** SRM University–AP  
**Execution Timestamp:** November 12, 2026  
**Compiler Verdict:** 100% Pass (0 Errors)  
**Seeding Verdict:** 18 Accounts, 7 Courses, 21 Exams, 189 Questions Active in Supabase  

---

## 1. Persona Authentication & Permission Matrix

| Account Identifier | Role | Expected Landing | Access Check | Auto-Tenant Bootstrap | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `admin@examguard-demo.example.com` | `admin` | `/admin` | Full Admin | Verified | **PASS** |
| `faculty@examguard-demo.example.com` | `instructor` | `/faculty` | Course & Exam Author | Verified | **PASS** |
| `invigilator@examguard-demo.example.com` | `invigilator` | `/invigilator` | Live Telemetry Grid | Verified | **PASS** |
| `student1@examguard-demo.example.com` | `student` | `/student` | Candidate Portal | Verified | **PASS** |
| `student2@examguard-demo.example.com` | `student` | `/student` | Candidate Portal | Verified | **PASS** |
| `faculty.cse202.1@example.com` | `instructor` | `/faculty` | CSE-202 Authoring | Verified | **PASS** |
| `faculty.cse202.2@example.com` | `instructor` | `/faculty` | CSE-202 Co-Instructor | Verified | **PASS** |
| `faculty.cse203.1@example.com` | `instructor` | `/faculty` | CSE-203 Lead | Verified | **PASS** |
| `faculty.cse204.1@example.com` | `instructor` | `/faculty` | CSE-204 Lead | Verified | **PASS** |
| `faculty.cse204.2@example.com` | `instructor` | `/faculty` | CSE-204 Co-Instructor | Verified | **PASS** |
| `faculty.cse207.1@example.com` | `instructor` | `/faculty` | CSE-207 Lead | Verified | **PASS** |
| `faculty.cse207.2@example.com` | `instructor` | `/faculty` | CSE-207 Co-Instructor | Verified | **PASS** |
| `faculty.cse213.1@example.com` | `instructor` | `/faculty` | CSE-213 Lead | Verified | **PASS** |
| `faculty.cse213.2@example.com` | `instructor` | `/faculty` | CSE-213 Co-Instructor | Verified | **PASS** |
| `faculty.ent243.1@example.com` | `instructor` | `/faculty` | ENT-243 Lead | Verified | **PASS** |
| `faculty.sec203.1@example.com` | `instructor` | `/faculty` | SEC-203 Lead | Verified | **PASS** |
| `alokkumar_s@srmap.edu.in` | `instructor` | `/faculty` | SRM AP Faculty Lead | Auto-Linked | **PASS** |
| `agupta88094@gmail.com` | `admin` | `/admin` | Lead Platform Architect | Auto-Linked | **PASS** |

---

## 2. Examination Database & Question Ingestion Verification

| Course Code | CLA-3 (MCQs) | Mid-Sem (Descriptive) | End-Sem (Draft) | Total Qs Seeded | Rubrics Attached | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CSE-202** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **CSE-203** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **CSE-204** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **CSE-207** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **CSE-213** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **ENT-243** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **SEC-203** | 10 MCQs | 7 Written | 10 Written | 27 Questions | Yes (5-of-7) | **PASS** |
| **TOTALS** | **70 MCQs** | **49 Written** | **70 Written** | **189 Questions** | **All 7 Courses** | **PASS** |

---

## 3. Viewport & Device Responsiveness Audit

| Target Viewport | Screen Resolution | Device Emulation | Observed Table Behavior | Clipping Detected | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile Narrow** | 390 × 844 px | iPhone 13/14/15 Pro | Responsive card list with stacked badges & full buttons | **0 px (None)** | **PASS** |
| **Mobile Standard** | 406 × 695 px | Android Galaxy / Pixel | Clean card list with touch-friendly spacing | **0 px (None)** | **PASS** |
| **Tablet Portrait** | 768 × 1024 px | iPad Mini / Air | Smooth table layout with high contrast borders | **0 px (None)** | **PASS** |
| **Desktop High-Res** | 1440 × 900 px | Laptop / Monitor | Full enterprise multi-column sortable table | **0 px (None)** | **PASS** |

---

## 4. End-to-End Integrity Engine Verification

1. **Circular Countdown Timer:** SVG stroke-dashoffset recalculates on authoritative server sync tick every 250ms.
2. **5-of-7 Attempt Enforcement:** When 5 answers are populated, remaining questions are locked from input until an existing answer is cleared.
3. **Continuous Auto-Save:** Queued locally in `localStorage` outbox and flushed via micro-batch PUT requests to `/api/student/exams/[examId]/answers`.
4. **Proctoring Anomaly Stream:** WebAssembly face landmark analysis correctly raises `NO_FACE_DETECTED` or `MULTIPLE_FACES_DETECTED` signals to invigilator live stream without streaming raw video.

