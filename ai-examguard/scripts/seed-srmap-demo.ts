import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  CORE_DEMO_ACCOUNTS,
  INDIVIDUAL_FACULTY_ACCOUNTS,
  COURSES_SPEC,
  TIMETABLE_SLOTS,
  DEMO_PASSWORD,
  loadEnvLocal,
  type DemoAccount,
} from './srmap-demo-specs';
import {
  CLA3_MCQ_BANK,
  MIDSEM_WRITTEN_BANK,
  ENDSEM_WRITTEN_BANK,
} from './srmap-exam-questions';

async function main() {
  console.log('====================================================');
  console.log('AI ExamGuard — SRM University–AP Demo Environment Seeder');
  console.log('====================================================\n');

  // Safety checks
  const isDemo =
    process.env.DEMO_MODE === 'true' ||
    process.env.ALLOW_DEMO_SEED === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (!isDemo) {
    throw new Error('Refusing to seed demo environment: ALLOW_DEMO_SEED=true is required and NODE_ENV must not be production.');
  }

  const fileEnv = loadEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? fileEnv.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Upsert Canonical Tenant: SRM University–AP
  console.log('1. Setting up Canonical Tenant: SRM University–AP (srmap-demo)...');
  
  // Also check if test-uni exists to migrate or unify
  const { data: existingTenant } = await client
    .from('tenants')
    .select('id, name, slug, settings')
    .or('slug.eq.srmap-demo,slug.eq.test-uni')
    .maybeSingle();

  let tenantId = existingTenant?.id;
  const tenantSettings = {
    location: 'Neerukonda, Mangalagiri, Andhra Pradesh',
    institution_type: 'State Private University',
    require_camera: true,
    require_audio: true,
    require_fullscreen: true,
    max_violations_threshold: 10,
    academic_term: 'Even Semester 2026',
    timetable: TIMETABLE_SLOTS,
    course_faculty: COURSES_SPEC.map(c => ({
      courseCode: c.code,
      courseName: c.name,
      faculty: c.allFaculty,
      rooms: c.rooms
    })),
  };

  if (!tenantId) {
    const { data: newTenant, error: tErr } = await client
      .from('tenants')
      .insert({
        name: 'SRM University–AP',
        slug: 'srmap-demo',
        domain: 'srmap.edu.in',
        settings: tenantSettings,
      })
      .select('id')
      .single();

    if (tErr) throw new Error(`Failed to create tenant: ${tErr.message}`);
    tenantId = newTenant.id;
  } else {
    // Update existing tenant to canonical SRM University-AP metadata
    await client
      .from('tenants')
      .update({
        name: 'SRM University–AP',
        slug: 'srmap-demo',
        domain: 'srmap.edu.in',
        settings: tenantSettings,
      })
      .eq('id', tenantId);
  }
  console.log(`   Tenant Ready: SRM University–AP (ID: ${tenantId})\n`);

  // 2. Provision Auth Accounts, Profiles, and Memberships
  console.log('2. Provisioning Demo User Accounts, Profiles & Memberships...');
  const allAccounts: DemoAccount[] = [...CORE_DEMO_ACCOUNTS, ...INDIVIDUAL_FACULTY_ACCOUNTS];
  const userMap = new Map<string, string>(); // email -> userId

  const { data: existingUsers } = await client.auth.admin.listUsers();
  const existingUserMap = new Map((existingUsers?.users || []).map(u => [u.email?.toLowerCase(), u]));

  for (const acc of allAccounts) {
    const normalizedEmail = acc.email.toLowerCase();
    let userId: string;

    const existingAuth = existingUserMap.get(normalizedEmail);
    if (existingAuth) {
      userId = existingAuth.id;
      // Ensure password is set to demo password if needed
      await client.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: acc.fullName,
          role: acc.role,
          tenant_slug: 'srmap-demo',
          staff_or_student_id: acc.staffOrStudentId,
        },
      });
    } else {
      const { data: newUser, error: createErr } = await client.auth.admin.createUser({
        email: acc.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: acc.fullName,
          role: acc.role,
          tenant_slug: 'srmap-demo',
          staff_or_student_id: acc.staffOrStudentId,
        },
      });
      if (createErr) {
        throw new Error(`Failed to create auth user ${acc.email}: ${createErr.message}`);
      }
      userId = newUser.user.id;
    }

    userMap.set(normalizedEmail, userId);

    // Upsert Profile
    await client.from('profiles').upsert({
      id: userId,
      email: acc.email,
      full_name: acc.fullName,
      updated_at: new Date().toISOString(),
    });

    // Upsert Membership in srmap-demo
    await client.from('memberships').upsert({
      tenant_id: tenantId,
      user_id: userId,
      role: acc.role,
      updated_at: new Date().toISOString(),
    });
  }

  // Also ensure existing real dev users have profiles and memberships in srmap-demo
  const existingSpecialEmails = ['alokkumar_s@srmap.edu.in', 'agupta88094@gmail.com'];
  for (const specEmail of existingSpecialEmails) {
    const specUser = existingUserMap.get(specEmail.toLowerCase());
    if (specUser) {
      const isStudent = specEmail.includes('alokkumar');
      const role = isStudent ? 'student' : 'admin';
      const fullName = isStudent ? 'Alok Kumar (Student)' : 'Alok Gupta (Administrator)';
      
      await client.from('profiles').upsert({
        id: specUser.id,
        email: specEmail,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      });

      await client.from('memberships').upsert({
        tenant_id: tenantId,
        user_id: specUser.id,
        role: role,
        updated_at: new Date().toISOString(),
      });

      userMap.set(specEmail.toLowerCase(), specUser.id);
      console.log(`   Connected existing user: ${specEmail} as ${role}`);
    }
  }

  console.log(`   Successfully provisioned ${allAccounts.length + existingSpecialEmails.length} user accounts.\n`);

  // 3. Upsert 7 Courses
  console.log('3. Seeding 7 SRM University–AP Courses...');
  const courseIdMap = new Map<string, string>(); // courseCode -> courseId

  for (const c of COURSES_SPEC) {
    const primaryFacultyId = userMap.get(c.primaryFacultyEmail.toLowerCase()) || userMap.get('faculty@examguard-demo.example.com')!;
    
    // Check if course already exists in this tenant
    const { data: existingCourse } = await client
      .from('courses')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', c.code)
      .maybeSingle();

    let courseId = existingCourse?.id;
    const desc = `${c.name} [L-T-P-C: ${c.ltpc}]. Instructors: ${c.allFaculty.map(f => `${f.name} (${f.staffId})`).join(', ')}. Classrooms: ${c.rooms.join(', ')}.`;

    if (!courseId) {
      const { data: inserted, error: cErr } = await client
        .from('courses')
        .insert({
          tenant_id: tenantId,
          code: c.code,
          name: c.name,
          instructor_id: primaryFacultyId,
          semester: 'Spring 2026',
          description: desc,
        })
        .select('id')
        .single();
      if (cErr) throw new Error(`Failed to insert course ${c.code}: ${cErr.message}`);
      courseId = inserted.id;
    } else {
      await client
        .from('courses')
        .update({
          name: c.name,
          instructor_id: primaryFacultyId,
          semester: 'Spring 2026',
          description: desc,
        })
        .eq('id', courseId);
    }

    courseIdMap.set(c.code, courseId);
    console.log(`   Course ${c.code}: ${c.name} (ID: ${courseId})`);
  }
  console.log('');

  // 4. Enroll Demo Students in all 7 courses
  console.log('4. Enrolling Demo Students in Courses...');
  const studentEmails = [
    'student1@examguard-demo.example.com',
    'student2@examguard-demo.example.com',
    'alokkumar_s@srmap.edu.in',
  ];

  for (const sEmail of studentEmails) {
    const sId = userMap.get(sEmail.toLowerCase());
    if (!sId) continue;
    for (const [code, cId] of courseIdMap.entries()) {
      await client.from('enrollments').upsert({
        course_id: cId,
        student_id: sId,
      });
    }
  }
  console.log('   Enrolled demo students across all 7 courses.\n');

  // 5. Create 21 Examinations & Question Banks
  console.log('5. Authoring 21 Examinations & 189 Academic Questions...');
  
  const student1Id = userMap.get('student1@examguard-demo.example.com')!;
  const student2Id = userMap.get('student2@examguard-demo.example.com')!;
  const alokStudentId = userMap.get('alokkumar_s@srmap.edu.in');
  const studentIdsToAssign = [student1Id, student2Id, ...(alokStudentId ? [alokStudentId] : [])];

  const now = new Date();
  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
  const windowEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days ahead

  for (const c of COURSES_SPEC) {
    const courseId = courseIdMap.get(c.code)!;
    const facultyId = userMap.get(c.primaryFacultyEmail.toLowerCase()) || userMap.get('faculty@examguard-demo.example.com')!;

    // ------------------------------------------------------------------------
    // 5A. CLA-3 Examination (MCQ, 10 Questions, Published)
    // ------------------------------------------------------------------------
    const cla3Title = `${c.code}: Continuous Learning Assessment 3 (CLA-3)`;
    const { data: existingCla3 } = await client
      .from('exams')
      .select('id')
      .eq('course_id', courseId)
      .ilike('title', `%CLA-3%`)
      .maybeSingle();

    let cla3Id = existingCla3?.id;
    if (!cla3Id) {
      const { data: inserted, error: eErr } = await client
        .from('exams')
        .insert({
          course_id: courseId,
          tenant_id: tenantId,
          created_by: facultyId,
          title: cla3Title,
          description: `All 10 Multiple Choice Questions are compulsory. Suggested duration: 20 minutes. Automatic objective evaluation.`,
          duration_minutes: 20,
          total_points: 10,
          passing_marks: 5,
          start_time: windowStart,
          end_time: windowEnd,
          status: 'published',
          settings: {
            require_camera: true,
            require_audio: true,
            require_fullscreen: true,
            max_violations_threshold: 10,
            exam_type: 'mcq_cla3',
            max_questions_to_answer: 10,
            evaluation_type: 'automated',
          },
        })
        .select('id')
        .single();
      if (eErr) throw new Error(`Failed to create CLA-3 exam for ${c.code}: ${eErr.message}`);
      cla3Id = inserted.id;
    } else {
      await client
        .from('exams')
        .update({
          title: cla3Title,
          status: 'published',
          total_points: 10,
          passing_marks: 5,
          start_time: windowStart,
          end_time: windowEnd,
        })
        .eq('id', cla3Id);
    }

    // Insert 10 CLA-3 MCQs
    const rawCode = c.code.replace('-', '');
    const mcqs = CLA3_MCQ_BANK[c.code] || CLA3_MCQ_BANK[rawCode] || [];
    for (let i = 0; i < mcqs.length; i++) {
      const qSpec = mcqs[i];
      if (!qSpec) continue;
      const { data: existingQ } = await client
        .from('questions')
        .select('id')
        .eq('exam_id', cla3Id)
        .eq('order_index', i)
        .maybeSingle();

      let qId = existingQ?.id;
      if (!qId) {
        const { data: insQ, error: qErr } = await client
          .from('questions')
          .insert({
            exam_id: cla3Id,
            order_index: i,
            type: 'mcq_single',
            prompt: qSpec.prompt,
            points: qSpec.points,
            explanation: qSpec.explanation,
            metadata: { topic: c.code, isCompulsory: true },
          })
          .select('id')
          .single();
        if (qErr) throw new Error(`Failed to insert question ${i} for ${c.code} CLA-3: ${qErr.message}`);
        qId = insQ.id;
      } else {
        await client
          .from('questions')
          .update({
            prompt: qSpec.prompt,
            points: qSpec.points,
            explanation: qSpec.explanation,
          })
          .eq('id', qId);
      }

      // Upsert Answer Keys (Options)
      for (let oIdx = 0; oIdx < qSpec.options.length; oIdx++) {
        const opt = qSpec.options[oIdx];
        if (!opt) continue;
        await client.from('question_answer_keys').upsert({
          question_id: qId,
          order_index: oIdx,
          label: opt.label,
          content: opt.content,
          is_correct: opt.isCorrect,
        });
      }
    }

    // Assign CLA-3 to demo students
    for (const sId of studentIdsToAssign) {
      await client.from('exam_assignments').upsert({
        exam_id: cla3Id,
        student_id: sId,
      });
    }

    // ------------------------------------------------------------------------
    // 5B. Mid-Semester Examination (Written, 7 Questions, Attempt Any 5, Published)
    // ------------------------------------------------------------------------
    const midTitle = `${c.code}: Mid-Semester Examination`;
    const { data: existingMid } = await client
      .from('exams')
      .select('id')
      .eq('course_id', courseId)
      .ilike('title', `%Mid-Semester%`)
      .maybeSingle();

    let midId = existingMid?.id;
    if (!midId) {
      const { data: inserted, error: eErr } = await client
        .from('exams')
        .insert({
          course_id: courseId,
          tenant_id: tenantId,
          created_by: facultyId,
          title: midTitle,
          description: `Answer any 5 out of 7 questions. Each question carries 10 marks. Total: 50 marks. Duration: 90 minutes. Manual faculty evaluation.`,
          duration_minutes: 90,
          total_points: 50,
          passing_marks: 25,
          start_time: windowStart,
          end_time: windowEnd,
          status: 'published',
          settings: {
            require_camera: true,
            require_audio: true,
            require_fullscreen: true,
            max_violations_threshold: 10,
            exam_type: 'written_midsem',
            max_questions_to_answer: 5,
            attempt_rule: 'any_5_of_7',
            evaluation_type: 'manual_faculty',
          },
        })
        .select('id')
        .single();
      if (eErr) throw new Error(`Failed to create Mid-Sem exam for ${c.code}: ${eErr.message}`);
      midId = inserted.id;
    } else {
      await client
        .from('exams')
        .update({
          title: midTitle,
          status: 'published',
          total_points: 50,
          passing_marks: 25,
          start_time: windowStart,
          end_time: windowEnd,
        })
        .eq('id', midId);
    }

    // Insert 7 Mid-Semester Descriptive Questions
    const midQuestions = MIDSEM_WRITTEN_BANK[c.code] || MIDSEM_WRITTEN_BANK[rawCode] || [];
    for (let i = 0; i < midQuestions.length; i++) {
      const qSpec = midQuestions[i];
      if (!qSpec) continue;
      const { data: existingQ } = await client
        .from('questions')
        .select('id')
        .eq('exam_id', midId)
        .eq('order_index', i)
        .maybeSingle();

      let qId = existingQ?.id;
      if (!qId) {
        const { data: insQ, error: qErr } = await client
          .from('questions')
          .insert({
            exam_id: midId,
            order_index: i,
            type: 'essay',
            prompt: qSpec.prompt,
            points: qSpec.points,
            explanation: qSpec.solutionOutline,
            metadata: {
              rubric: qSpec.rubric,
              solutionOutline: qSpec.solutionOutline,
              isDescriptive: true,
            },
          })
          .select('id')
          .single();
        if (qErr) throw new Error(`Failed to insert question ${i} for ${c.code} Mid-Sem: ${qErr.message}`);
        qId = insQ.id;
      } else {
        await client
          .from('questions')
          .update({
            prompt: qSpec.prompt,
            points: qSpec.points,
            explanation: qSpec.solutionOutline,
            metadata: {
              rubric: qSpec.rubric,
              solutionOutline: qSpec.solutionOutline,
              isDescriptive: true,
            },
          })
          .eq('id', qId);
      }
    }

    // Assign Mid-Sem to demo students
    for (const sId of studentIdsToAssign) {
      await client.from('exam_assignments').upsert({
        exam_id: midId,
        student_id: sId,
      });
    }

    // ------------------------------------------------------------------------
    // 5C. End-Semester Examination (Provisional Draft Template, 10 Questions, Draft)
    // ------------------------------------------------------------------------
    const endTitle = `${c.code}: End-Semester Examination (Provisional Draft)`;
    const { data: existingEnd } = await client
      .from('exams')
      .select('id')
      .eq('course_id', courseId)
      .ilike('title', `%End-Semester%`)
      .maybeSingle();

    let endId = existingEnd?.id;
    if (!endId) {
      const { data: inserted, error: eErr } = await client
        .from('exams')
        .insert({
          course_id: courseId,
          tenant_id: tenantId,
          created_by: facultyId,
          title: endTitle,
          description: `PROVISIONAL DEMO TEMPLATE: Answer any 7 out of 10 questions. 10 marks each. Suggested Total: 70 marks. Duration: 180 minutes. Requires official faculty approval before publication.`,
          duration_minutes: 180,
          total_points: 70,
          passing_marks: 35,
          start_time: windowStart,
          end_time: windowEnd,
          status: 'draft', // DRAFT as required!
          settings: {
            require_camera: true,
            require_audio: true,
            require_fullscreen: true,
            max_violations_threshold: 10,
            exam_type: 'written_endsem',
            max_questions_to_answer: 7,
            attempt_rule: 'any_7_of_10',
            is_provisional_draft: true,
            evaluation_type: 'manual_faculty',
          },
        })
        .select('id')
        .single();
      if (eErr) throw new Error(`Failed to create End-Sem exam for ${c.code}: ${eErr.message}`);
      endId = inserted.id;
    }

    // Insert 10 End-Semester Descriptive Questions
    const endQuestions = ENDSEM_WRITTEN_BANK[c.code] || ENDSEM_WRITTEN_BANK[rawCode] || [];
    for (let i = 0; i < endQuestions.length; i++) {
      const qSpec = endQuestions[i];
      if (!qSpec) continue;
      const { data: existingQ } = await client
        .from('questions')
        .select('id')
        .eq('exam_id', endId)
        .eq('order_index', i)
        .maybeSingle();

      if (!existingQ) {
        await client.from('questions').insert({
          exam_id: endId,
          order_index: i,
          type: 'essay',
          prompt: qSpec.prompt,
          points: qSpec.points,
          explanation: qSpec.solutionOutline,
          metadata: {
            rubric: qSpec.rubric,
            solutionOutline: qSpec.solutionOutline,
            isDescriptive: true,
          },
        });
      }
    }

    console.log(`   Course ${c.code}: Seeded CLA-3 (10 MCQs, Published), Mid-Sem (7 Written, Published), End-Sem (10 Written, Draft)`);
  }
  console.log('');

  // 6. Write private credentials file (Git-ignored)
  console.log('6. Generating docs/demo-credentials.local.md...');
  const credsDoc = `# AI ExamGuard — SRM University–AP Demo Credentials

> **CONFIDENTIAL DEMONSTRATION CREDENTIALS**
> These accounts are provisioned exclusively for university evaluation and faculty demonstration.
> Shared Demonstration Password: \`${DEMO_PASSWORD}\`

## Core Institutional Demonstration Accounts

| Role | Display Name | Login Email | Purpose |
|:---|:---|:---|:---|
| **Admin** | SRM AP University Administrator | \`admin@examguard-demo.example.com\` | Institutional governance, tenant audit logs, security policies, and feedback review. |
| **Faculty Lead** | Prof. Marcus Sterling | \`faculty@examguard-demo.example.com\` | Course creation, question bank authoring, exam scheduling, manual written grading. |
| **Invigilator** | Amina Patel (Chief Invigilator) | \`invigilator@examguard-demo.example.com\` | Real-time candidate roster, live incident queue, alert triage, incident review. |
| **Student One** | Demo Student One (DEMO-S001) | \`student1@examguard-demo.example.com\` | Candidate exam taking, device preflight, CLA-3 MCQ test, Mid-Sem written exam. |
| **Student Two** | Demo Student Two (DEMO-S002) | \`student2@examguard-demo.example.com\` | Candidate exam taking, secondary candidate verification. |
| **Developer Student** | Alok Kumar | \`alokkumar_s@srmap.edu.in\` | Live SRM student account linked to all 7 courses. |

## Individual Faculty Subject Accounts (From Official Timetable)

| Subject Code | Subject Name | Faculty Name | Staff ID | Login Email |
|:---|:---|:---|:---:|:---|
| **CSE 202** | Object Oriented Programming with C++ | Dr. Lipismita Panigrahi | 25065 | \`faculty.cse202.1@example.com\` |
| **CSE 202** | Object Oriented Programming with C++ | Dr. Tabiya Manzoor | 25173 | \`faculty.cse202.2@example.com\` |
| **CSE 203** | Discrete Mathematics | Dr. Saduri Das | 26211 | \`faculty.cse203.1@example.com\` |
| **CSE 204** | Design and Analysis of Algorithms | Dr. Abhimanyu Bar | 26021 | \`faculty.cse204.1@example.com\` |
| **CSE 204** | Design and Analysis of Algorithms | Dr. Banovoth Raja Sekhar | 25403 | \`faculty.cse204.2@example.com\` |
| **CSE 207** | Digital Electronics | Dr. Manoj Kumar Yadav | 25235 | \`faculty.cse207.1@example.com\` |
| **CSE 207** | Digital Electronics | Mr. Harsh Ranjan | 26382 | \`faculty.cse207.2@example.com\` |
| **CSE 213** | Advanced Java Programming | Mr. Balvinder Singh Bondili | 24101 | \`faculty.cse213.1@example.com\` |
| **CSE 213** | Advanced Java Programming | Mr. S Gavaskar | 24106 | \`faculty.cse213.2@example.com\` |
| **ENT 243** | Essence of Entrepreneurship | Ms. Divya Veshapogu | 22237 | \`faculty.ent243.1@example.com\` |
| **SEC 203** | Aptitude for Engineers – III | Mr. Skilling Course Five Four | TMP054 | \`faculty.sec203.1@example.com\` |

*All accounts share the demonstration password: \`${DEMO_PASSWORD}\`*
`;

  const credPath = path.resolve(process.cwd(), 'docs', 'demo-credentials.local.md');
  fs.mkdirSync(path.dirname(credPath), { recursive: true });
  fs.writeFileSync(credPath, credsDoc, 'utf8');
  console.log(`   Saved credentials to ${credPath}\n`);

  // Ensure .gitignore has demo-credentials.local.md
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('demo-credentials.local.md')) {
      fs.appendFileSync(gitignorePath, '\n# Private Demo Credentials\ndocs/demo-credentials.local.md\n', 'utf8');
      console.log('   Appended docs/demo-credentials.local.md to .gitignore');
    }
  }

  console.log('====================================================');
  console.log('SRM University–AP Demo Environment Successfully Seeded!');
  console.log('7 Courses, 16 Accounts, 21 Exams, 189 Questions Active.');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
