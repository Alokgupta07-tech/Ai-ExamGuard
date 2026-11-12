# AI ExamGuard — Demonstration Seed Data Specifications

**Tenant:** SRM University–AP (`srmap-demo`)  
**Shared Temporary Demo Password:** `ExamGuardDemo!2026#`  
**Security Notice:** Individual credentials with unmasked login tokens are preserved in the git-ignored local file `docs/demo-credentials.local.md`.

---

## 1. Seed Accounts Summary (18 Total Accounts)

### Core Demonstration Personas (5 Accounts)

| Email | Full Name | Role | ID / Roll No. | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `admin@examguard-demo.example.com` | SRM AP University Administrator | Admin | `ADMIN-SRMAP-01` | Full institutional command, audit logs, user management, feedback review |
| `faculty@examguard-demo.example.com` | Prof. Marcus Sterling | Instructor | `FACULTY-001` | Faculty assessment authoring, examination publishing, live monitoring |
| `invigilator@examguard-demo.example.com` | Amina Patel (Chief Invigilator) | Invigilator | `INVIG-001` | Real-time multi-candidate telemetry oversight, incident adjudication |
| `student1@examguard-demo.example.com` | Demo Student One | Student | `DEMO-S001` | Candidate exam taking, device pre-flight check, CLA-3 and Mid-Sem attempts |
| `student2@examguard-demo.example.com` | Demo Student Two | Student | `DEMO-S002` | Secondary candidate for multi-candidate live invigilator telemetry grid |

### Individual Faculty Accounts (Matching Timetable) (11 Accounts)

| Email | Faculty Name | Staff ID | Assigned Course | Role |
| :--- | :--- | :--- | :--- | :--- |
| `faculty.cse202.1@example.com` | Dr. Lipismita Panigrahi | 25065 | CSE-202 (C++) | Primary Instructor |
| `faculty.cse202.2@example.com` | Dr. Tabiya Manzoor | 25173 | CSE-202 (C++) | Co-Instructor |
| `faculty.cse203.1@example.com` | Dr. Saduri Das | 26211 | CSE-203 (Discrete Math) | Primary Instructor |
| `faculty.cse204.1@example.com` | Dr. Abhimanyu Bar | 26021 | CSE-204 (Algorithms) | Primary Instructor |
| `faculty.cse204.2@example.com` | Dr. Banovoth Raja Sekhar | 25403 | CSE-204 (Algorithms) | Co-Instructor |
| `faculty.cse207.1@example.com` | Dr. Manoj Kumar Yadav | 25235 | CSE-207 (Digital Electronics) | Primary Instructor |
| `faculty.cse207.2@example.com` | Mr. Harsh Ranjan | 26382 | CSE-207 (Digital Electronics) | Co-Instructor |
| `faculty.cse213.1@example.com` | Mr. Balvinder Singh Bondili | 24101 | CSE-213 (Advanced Java) | Primary Instructor |
| `faculty.cse213.2@example.com` | Mr. S Gavaskar | 24106 | CSE-213 (Advanced Java) | Co-Instructor |
| `faculty.ent243.1@example.com` | Ms. Divya Veshapogu | 22237 | ENT-243 (Entrepreneurship) | Lead Faculty |
| `faculty.sec203.1@example.com` | Mr. Skilling Course Five Four | TMP054 | SEC-203 (Soft Skills) | Skill Trainer |

### Linked Faculty & Reviewer Accounts (2 Accounts)

| Email | Designated Role | Institutional Affiliation |
| :--- | :--- | :--- |
| `alokkumar_s@srmap.edu.in` | Instructor (CSE-203 Lead) | SRM University–AP Faculty |
| `agupta88094@gmail.com` | Admin / Lead Architect | Platform Engineering |

---

## 2. Seeded Courses (7 Courses)

1. **`CSE-202`** — Object Oriented Programming with C++ (3-0-1-4)
2. **`CSE-203`** — Discrete Mathematics (3-0-0-3)
3. **`CSE-204`** — Design and Analysis of Algorithms (3-0-1-4)
4. **`CSE-207`** — Digital Electronics (3-0-1-4)
5. **`CSE-213`** — Advanced Java Programming (3-0-1-4)
6. **`ENT-243`** — Essence of Entrepreneurship (3-0-0-3)
7. **`SEC-203`** — Aptitude for Engineers - III (1-0-1-2)

---

## 3. Seeded Examinations (21 Total Examinations)

### Pattern 1: CLA-3 Continuous Assessment (7 Published Exams, 70 MCQs)
- **Format:** 10 Multiple-Choice Questions per exam (Single choice).
- **Duration:** 45 minutes.
- **Scoring:** 10 Points Total (1 Point per question), Negative marking: 0.25 penalty per wrong response.
- **Status:** `published` and assigned to all enrolled candidates.
- **Automated Grading:** Enabled on server submission.

### Pattern 2: Mid-Semester Written Examinations (7 Published Exams, 49 Questions)
- **Format:** 7 Comprehensive Descriptive/Written Questions per exam.
- **Selection Rule:** Answer ANY 5 of 7 questions (8 marks each, 40 marks total).
- **Duration:** 90 minutes.
- **Status:** `published` and assigned to all enrolled candidates.
- **Grading:** Descriptive rubric outline and solution keys for faculty evaluation.

### Pattern 3: End-Semester Written Examinations (7 Draft Exams, 70 Questions)
- **Format:** 10 Comprehensive Descriptive/Written Questions per exam.
- **Duration:** 180 minutes (Total 100 Marks).
- **Status:** `draft` (Tagged `"PROVISIONAL DEMO TEMPLATE"`).
- **Purpose:** Demonstrates faculty examination drafting and blueprint inspection without prematurely publishing final semester tests.

**Total Academic Questions Seeded:** 189 questions across 7 core academic disciplines.

