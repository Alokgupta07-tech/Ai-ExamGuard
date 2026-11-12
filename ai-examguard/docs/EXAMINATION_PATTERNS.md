# AI ExamGuard — Examination Delivery Patterns & Integrity Mechanics

**Institution:** SRM University–AP  
**Author:** Lead Examination Systems Architect  
**Scope:** Architecture and UI mechanics of objective, descriptive, and draft assessment models.

---

## 1. Overview of Supported Assessment Patterns

To satisfy the diverse evaluation standards of Indian universities and technical institutes (such as SRM University–AP, IITs, and NITs), AI ExamGuard implements three distinct examination architectures:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI EXAMGUARD PATTERNS                           │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ Pattern 1: CLA-3        │ Pattern 2: Mid-Sem   │ Pattern 3: End-Sem    │
│ Continuous Assessment   │ Written Examination  │ Final Examination     │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ • 10 Objective MCQs     │ • 7 Descriptive Qs   │ • 10 Descriptive Qs   │
│ • 1 Mark Each (10 Pts)  │ • 8 Marks Each       │ • 10 Marks Each       │
│ • 0.25 Negative Marking │ • Rule: Answer 5/7   │ • Full Syllabus Scope │
│ • Instant Server Scoring│ • Total: 40 Marks    │ • Status: Draft       │
│ • Status: Published     │ • Status: Published  │ • Provisional Demo    │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

---

## 2. Pattern 1: Continuous Assessment (CLA-3)

### Academic Purpose
Continuous Learning Assessment (CLA-3) measures foundational conceptual mastery across weekly lecture units.

### Mechanics & Rules
- **Structure:** 10 Multiple-Choice Questions (Single choice).
- **Time Window:** 45 minutes countdown timer with visual progress ring.
- **Negative Marking:** Fraction of $0.25$ deducted per incorrect answer ($-\text{Points} \times 0.25$).
- **Scoring Pipeline:** Evaluated authoritatively on the server upon submission. Client-side answer payloads only transmit `questionId` and `selectedOptionId`; correct answers and explanations are never exposed to the browser.

---

## 3. Pattern 2: Mid-Semester Written Examination (The 5-of-7 Rule)

### Academic Purpose
Mid-Semester examinations assess architectural comprehension, algorithmic design, and rigorous written derivation.

### The "Answer Any 5 of 7" Selection Rule
In accordance with SRM University–AP academic regulations, students are presented with 7 questions and required to answer **any 5 questions**:

1. **Attempt Tracker:**
   - The top banner and question navigator continuously display `Answered: X / 5 required`.
   - Each question card clearly identifies whether it has been answered.

2. **Selection Limit Enforcement:**
   - Once 5 questions contain an answer (written text exceeding 0 characters or an option selected), the remaining 2 questions enter a **Locked State**.
   - If a student navigates to an unanswered 6th or 7th question and attempts to type or select an answer, the input is blocked and a helpful notice appears:
     > *"Maximum selection limit reached. You have already answered 5 of the 7 questions. To answer this question, return to one of your previously answered questions and click 'Clear Answer'."*
   - This prevents ambiguous submissions and ensures deterministic evaluation.

3. **Descriptive Workspace & Rubrics:**
   - A distraction-free, auto-saving text area with word counter and character counter.
   - Rubric guidance displayed alongside each question detailing expected diagrams, derivations, and point allocations.

---

## 4. Pattern 3: End-Semester Examination (Provisional Draft Template)

### Academic Purpose
Final comprehensive semester examinations covering units 1 through 5.

### Draft Status & Governance
- End-Semester examinations remain in `draft` status in the demonstration environment.
- Tagged with prominent `"PROVISIONAL DEMO TEMPLATE"` banners to reflect university governance: final examination papers may only be published by the Controller of Examinations (CoE) once exam halls, invigilator rosters, and seat allocations are officially gazetted.

---

## 5. Offline Recovery & Resilient Synchronization

Candidate responses are safeguarded through a three-tier resilience engine:
1. **Local Outbox Queue:** Answers are written immediately to `localStorage` before initiating network transmission.
2. **Debounced Batch Flusher:** Answers are dispatched in micro-batches (140ms debounce) to reduce HTTP request volume.
3. **Offline Recovery:** If Wi-Fi or campus Ethernet drops, answers accumulate in the local queue with a non-intrusive warning: *"Connection interrupted. Your answers are queued safely on this device and will sync automatically when you reconnect."* Once network connectivity resumes, the queue flushes automatically.

