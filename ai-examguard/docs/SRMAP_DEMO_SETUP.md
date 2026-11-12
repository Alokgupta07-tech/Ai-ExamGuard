# SRM University–AP Demonstration Environment Setup

**Institution:** SRM University–AP (Andhra Pradesh)  
**Campus Location:** Neerukonda, Mangalagiri Mandal, Guntur District, Andhra Pradesh — 522240  
**Tenant Identifier:** `srmap-demo`  
**Tenant UUID:** `55d810b1-0555-43d2-97e2-d4a420b6173e`  
**Academic Program:** B.Tech Computer Science and Engineering (Year 2, Semester III)  
**Academic Year:** 2026–2027 (Fall 2026 Session)  

---

## 1. Overview & Institutional Context

AI ExamGuard has been configured specifically for SRM University–AP to demonstrate client-side examination proctoring, dual-format assessment delivery (objective MCQs and written descriptive examinations), and institutional integrity monitoring.

All course codes, faculty allocations, classroom venues, and timetable periods in this environment reflect the actual academic structure of the SRM University–AP School of Engineering and Sciences (SEAS).

---

## 2. Enrolled Course Registry

| Course Code | Course Name | LTPC | Primary Faculty | Co-Instructor / Support | Classrooms / Labs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CSE-202** | Object Oriented Programming with C++ | 3-0-1-4 | Dr. Lipismita Panigrahi (25065) | Dr. Tabiya Manzoor (25173) | C305, C510 |
| **CSE-203** | Discrete Mathematics | 3-0-0-3 | Dr. Saduri Das (26211) | — | C510 |
| **CSE-204** | Design and Analysis of Algorithms | 3-0-1-4 | Dr. Abhimanyu Bar (26021) | Dr. Banovoth Raja Sekhar (25403) | C510, C804 |
| **CSE-207** | Digital Electronics | 3-0-1-4 | Dr. Manoj Kumar Yadav (25235) | Mr. Harsh Ranjan (26382) | C404, C510, S514 |
| **CSE-213** | Advanced Java Programming | 3-0-1-4 | Mr. Balvinder Singh Bondili (24101) | Mr. S Gavaskar (24106) | C510, C806 |
| **ENT-243** | Essence of Entrepreneurship | 3-0-0-3 | Ms. Divya Veshapogu (22237) | — | Seminar Hall / Audi |
| **SEC-203** | Aptitude for Engineers - III | 1-0-1-2 | Skill Development Lead (TMP054) | — | C510 |

---

## 3. Official Weekly Academic Timetable

The demo environment incorporates the full 8-period weekly schedule (Periods 1 to 8, 09:00 to 17:30 IST):

### Daily Period Breakdown
- **Period 1:** 09:00 – 09:50
- **Period 2:** 10:00 – 10:50
- **Period 3:** 11:00 – 11:50
- **Period 4:** 12:00 – 12:50
- **LUNCH RECESS:** 12:50 – 14:00
- **Period 5 / 6:** 14:00 – 14:50
- **Period 7:** 15:00 – 15:50
- **Period 8:** 16:00 – 17:30

### Schedule Matrix

| Day | P1 (09:00) | P2 (10:00) | P3 (11:00) | P4 (12:00) | P5/6 (14:00) | P7 (15:00) | P8 (16:00) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Monday** | CSE-207 (C404) | CSE-207 (C404) | CSE-203 (C510) | CSE-203 (C510) | — | CSE-207 (C510) | ENT-243 (Sem. Hall) |
| **Tuesday** | CSE-213 (C806) | CSE-213 (C806) | — | CSE-202 (C510) | CSE-207 (S514) | CSE-207 (S514) | ENT-243 (Sem. Hall) |
| **Wednesday** | CSE-204 (C510) | — | CSE-202 (C305) | CSE-202 (C305) | CSE-213 (C510) | — | — |
| **Thursday** | CSE-203 (C510) | — | CSE-202 (C510) | CSE-202 (C510) | — | CSE-204 (C804) | CSE-204 (C804) |
| **Friday** | SEC-203 (C510) | SEC-203 (C510) | CSE-204 (C510) | CSE-204 (C510) | SEC-203 (C510) | CSE-213 (C510) | CSE-213 (C510) |

---

## 4. Multi-Tenant Infrastructure Settings

In `tenants` and `tenant_settings`:
- **Name:** `SRM University–AP`
- **Slug:** `srmap-demo`
- **Domain Verification:** `srmap.edu.in`
- **Integrity Baseline:**
  - `require_camera: true`
  - `require_audio: true`
  - `require_fullscreen: true`
  - `max_violations_threshold: 5`
  - `face_detection_confidence: 0.65`
  - `audio_rms_threshold_db: -28.0`
