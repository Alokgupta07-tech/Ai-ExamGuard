# SRM University–AP Demonstration Walkthrough Guide

**Welcome to AI ExamGuard!**  
This guide provides a structured, 15-minute walkthrough for SRM University–AP faculty members, department deans, and examination review committee members.

---

## 1. Quick Access Credentials

All demonstration accounts share the temporary demo password:
`ExamGuardDemo!2026#`

| Role | Login Email | What to Test |
| :--- | :--- | :--- |
| **University Administrator** | `admin@examguard-demo.example.com` | Institutional command, audit trail, user permissions, and faculty feedback review |
| **Faculty Lead** | `faculty@examguard-demo.example.com` | Assessment creation, question bank inspection, live course monitoring |
| **Chief Invigilator** | `invigilator@examguard-demo.example.com` | Real-time multi-candidate telemetry grid, sensor alerts, and case adjudication |
| **Student (Candidate 1)** | `student1@examguard-demo.example.com` | Device pre-flight calibration, CLA-3 MCQ assessment, Mid-Sem written exam (5-of-7 rule) |
| **Student (Candidate 2)** | `student2@examguard-demo.example.com` | Secondary candidate for multi-session invigilator telemetry |

*(For unmasked credentials and individual faculty staff logins, consult the git-ignored file `docs/demo-credentials.local.md`.)*

---

## 2. Guided Step-by-Step Demonstration

### Step 1: Campus Showcase & Design Direction
1. Navigate to the homepage at `http://localhost:3000`.
2. Observe the clean, university-focused design language inspired by Apple, Stripe, and Linear.
3. Scroll to the **Campus Innovation Showcase** section:
   - View authentic SRM University–AP campus imagery:
     - **Academic Block & Central Library:** Reflecting institutional scale.
     - **Student Innovation Teams & Team Avyron:** Undergraduate startup engineering.
     - **The Hans India Feature:** Coverage of 34 student startup ventures at IGNITE Demo Day.

---

### Step 2: Student Experience — Timetable & Examination Taking
1. Navigate to `/login` and sign in with:
   - **Email:** `student1@examguard-demo.example.com`
   - **Password:** `ExamGuardDemo!2026#`
2. You will arrive at the **Candidate Portal** (`/student`). Notice:
   - Enrolled SRM AP courses (`CSE-202`, `CSE-203`, `CSE-204`, etc.).
   - Upcoming examinations.
3. Click the **"Timetable"** button in the header or scroll down to the **Academic Timetable**:
   - Filter by day (Monday to Friday) or by course.
   - Inspect period allocations (Periods 1 to 8, 09:00 to 17:30 IST) and classroom numbers (`C510`, `C305`, `C404`, `Seminar Hall`).
4. Enter **`CSE-202 Object Oriented Programming — CLA-3 Quiz`**:
   - Complete the **Device Pre-Flight Check** (Webcam calibration, Microphone test, Fullscreen authorization).
   - In the exam room:
     - Observe the **Circular Countdown Timer** with animated SVG progress ring.
     - Select answers for the 10 MCQs.
     - Filter questions using "View Bookmarked" and "View Unanswered".
     - Click **"Submit Answer"** and verify instant server score receipt.
5. Enter **`CSE-202 Mid-Semester Written Examination`**:
   - Observe the **Selection Rule Banner**: *"Answer any 5 of 7 questions."*
   - Type answers in the rich text area for Questions 1 through 5.
   - Notice the counter updates to `5 / 5 questions answered`.
   - Navigate to Question 6: observe that the input is locked with an explanation to clear an existing answer if switching questions.
   - Click "Clear Answer" on Question 5 and observe that Question 6 unlocks immediately.

---

### Step 3: Faculty Experience — Assessment Command
1. Sign out and sign in with:
   - **Email:** `faculty@examguard-demo.example.com`
   - **Password:** `ExamGuardDemo!2026#`
2. You will arrive at the **Faculty Command Center** (`/faculty`):
   - Notice the greeting: *"Faculty Examination Command"*.
   - Review metrics: My Examinations, Upcoming Exams, Active Students, Published Papers.
   - Click **"Course Question Bank"** to inspect the 189 academic questions seeded across the CSE curriculum.
   - Click **"Timetable"** to review the weekly lecture schedule and faculty allocations.

---

### Step 4: Invigilator Experience — Live Integrity Telemetry
1. Sign out and sign in with:
   - **Email:** `invigilator@examguard-demo.example.com`
   - **Password:** `ExamGuardDemo!2026#`
2. You will arrive at the **Live Command Center** (`/invigilator`):
   - Real-time indicator displaying `• Invigilation Active`.
   - Telemetry event feed capturing camera face presence, acoustic energy, tab switching, and fullscreen lock events.
   - Click **"Open Event"** or **"Inspect Candidate"** to review flagged incidents.

---

### Step 5: Submitting Demo Feedback & Review
1. In any dashboard header, click the prominent **"Demo Feedback"** button.
2. Select your rating (1 to 5 Stars), role persona, category, and enter your evaluation comments.
3. Click **"Submit Feedback"**.
4. To view all submitted feedback entries:
   - Sign in as `admin@examguard-demo.example.com`.
   - Click **"Demo Feedback"** in the admin header or navigate to `/admin/feedback`.
   - Inspect average ratings, feedback sentiment, and suggestions submitted by faculty members during the session.

