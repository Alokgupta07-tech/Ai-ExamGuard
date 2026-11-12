# AI ExamGuard — Quality Assurance & Test Verification Report

**Environment:** SRM University–AP Demo (`srmap-demo`)  
**Test Suite:** End-to-End Functional, Integrity, and Viewport Matrix  
**Compiler Status:** `npx tsc --noEmit` exited with code 0 (0 errors)  
**Production Build:** `npm run build` compiled 58 routes successfully in 26.0s  

---

## 1. Test Verification Summary

| Test Domain | Target Specification | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Authentication** | Automatic membership bootstrap to `srmap-demo` | **PASSED** | Unlinked users auto-join `srmap-demo` as Student; no 401/tenant errors |
| **Profile Sync** | Dynamic Supabase client retrieval | **PASSED** | Static closure eliminated; token refresh verified |
| **Exam Publishing** | Pattern-aware publishing validation | **PASSED** | CLA-3 checks 10 MCQs; Mid-Sem checks 7 essay Qs; End-Sem flags draft |
| **Mobile Responsiveness** | Responsive card stacking on viewports < 768px | **PASSED** | Zero horizontal overflow on 390×844, 406×695, and 768×1024 |
| **Attempt Rule** | Mid-Sem "Answer 5 of 7 questions" enforcement | **PASSED** | 6th question locked when 5 answered; clear warning displayed |
| **Descriptive Auto-Save** | Continuous syncing of written essay answers | **PASSED** | Text responses stored in DB with word count and outbox backup |
| **Timetable Component** | 8-period weekly schedule across 7 courses | **PASSED** | Interactive desktop grid & mobile card views verified |
| **Feedback System** | Star rating & comment submission | **PASSED** | Recorded in `demo_feedback` & reviewable at `/admin/feedback` |

---

## 2. Detailed Test Cases & Execution Logs

### Test Case 1: Candidate Entry & Auto-Membership Bootstrap
- **Actor:** `student1@examguard-demo.example.com`
- **Action:** Sign in and navigate to `/student`.
- **Expected:** Auto-resolves membership to SRM University–AP. Loads upcoming courses and examinations.
- **Observed:** Candidate portal loaded in < 250ms with 7 enrolled courses and 14 published examinations. Zero tenant errors.

### Test Case 2: Mid-Semester 5-of-7 Selection Enforcement
- **Actor:** `student1@examguard-demo.example.com`
- **Exam:** `CSE-202 Mid-Semester Written Examination (Fall 2026)`
- **Steps:**
  1. Answer Question 1 (Object-oriented inheritance derivation).
  2. Answer Question 2 (Polymorphism virtual table analysis).
  3. Answer Question 3 (Template metaprogramming code snippet).
  4. Answer Question 4 (Exception handling RAII protocol).
  5. Answer Question 5 (File stream serialization buffer).
  6. Attempt to type in Question 6.
- **Observed:**
  - After Question 5 was answered, counter updated to `5 / 5 questions answered`.
  - On Question 6, the textarea was disabled with notice: *"Maximum selection limit reached. You have already answered 5 of the 7 questions."*
  - Clicking "Clear Answer" on Question 5 immediately unlocked Question 6 for response.

### Test Case 3: Mobile Viewport Examination Table Audit
- **Devices Tested:**
  - iPhone 13/14/15 (390 × 844 px)
  - Samsung Galaxy S22/S23 (406 × 695 px)
  - iPad Mini / Air (768 × 1024 px)
- **Observed:**
  - Below 768px, `DataTable` smoothly switches to the native card stack.
  - All status badges, course codes, and action buttons (`Resume Exam`, `Enter Exam`) are fully visible within the viewport without horizontal scrolling or text clipping.

### Test Case 4: Invigilator Real-Time Stream & Review
- **Actor:** `invigilator@examguard-demo.example.com`
- **Action:** Open `/invigilator/overview` and trigger a test proctoring alert.
- **Observed:**
  - Live status badge displays `Invigilation Active` with pulsating indicator.
  - Telemetry event appears in real-time timeline with classification and candidate roll number.
