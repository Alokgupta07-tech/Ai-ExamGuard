import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const out: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  }
  return out;
}

interface DemoUserSpec {
  email: string;
  fullName: string;
  role: 'admin' | 'instructor' | 'invigilator' | 'student';
  label: string;
}

const DEMO_USERS: DemoUserSpec[] = [
  {
    email: 'admin@demo-university.edu',
    fullName: 'Dr. Elena Vance (Demo Admin)',
    role: 'admin',
    label: 'University Admin',
  },
  {
    email: 'faculty@demo-university.edu',
    fullName: 'Prof. Marcus Sterling (Demo Faculty)',
    role: 'instructor',
    label: 'Faculty',
  },
  {
    email: 'invigilator@demo-university.edu',
    fullName: 'Amina Patel (Demo Invigilator)',
    role: 'invigilator',
    label: 'Invigilator',
  },
  {
    email: 'student1@demo-university.edu',
    fullName: 'Rohan Sharma (Student One)',
    role: 'student',
    label: 'Student One',
  },
  {
    email: 'student2@demo-university.edu',
    fullName: 'Maya Lin (Student Two)',
    role: 'student',
    label: 'Student Two',
  },
];

async function main() {
  const fileEnv = loadEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? fileEnv.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
  }

  // Never hardcode credentials in source control: accept runtime env var or generate ephemeral CSPRNG password
  const demoPassword =
    process.env.DEMO_ACCOUNT_PASSWORD?.trim() || `Demo#${crypto.randomBytes(9).toString('base64url')}9`;

  const adminDb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Upsert Demo University Tenant
  const { data: existingTenant } = await adminDb
    .from('tenants')
    .select('id')
    .eq('slug', 'demo-university')
    .maybeSingle();

  let tenantId = existingTenant?.id;
  if (!tenantId) {
    const { data: insertedTenant, error: tErr } = await adminDb
      .from('tenants')
      .insert({
        name: 'Demo University (AI ExamGuard Showcase)',
        slug: 'demo-university',
        domain: 'demo-university.edu',
        settings: {
          require_camera: true,
          require_audio: true,
          require_fullscreen: true,
          max_violations_threshold: 10,
        },
      })
      .select('id')
      .single();
    if (tErr || !insertedTenant) {
      throw new Error(`Failed creating demo tenant: ${tErr?.message}`);
    }
    tenantId = insertedTenant.id;
  }

  // 2. Ensure all 5 Demo Auth Users + Profiles + Memberships
  const { data: listedUsers, error: listErr } = await adminDb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw new Error(`Failed listing auth users: ${listErr.message}`);

  const userIdByRole: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  for (const spec of DEMO_USERS) {
    const existing = listedUsers.users.find(
      (u) => u.email?.toLowerCase() === spec.email.toLowerCase()
    );
    let userId: string;
    if (existing) {
      userId = existing.id;
      await adminDb.auth.admin.updateUserById(userId, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: spec.fullName },
      });
    } else {
      const { data: created, error: cErr } = await adminDb.auth.admin.createUser({
        email: spec.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: spec.fullName },
      });
      if (cErr || !created.user) {
        throw new Error(`Failed creating demo user ${spec.email}: ${cErr?.message}`);
      }
      userId = created.user.id;
    }

    await adminDb.from('profiles').upsert({
      id: userId,
      email: spec.email,
      full_name: spec.fullName,
    });

    await adminDb.from('memberships').upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role: spec.role,
      },
      { onConflict: 'tenant_id,user_id,role' }
    );

    userIdByRole[spec.label] = userId;
    userIds[spec.email] = userId;
  }

  const facultyId = userIdByRole['Faculty']!;
  const adminId = userIdByRole['University Admin']!;
  const invigilatorId = userIdByRole['Invigilator']!;
  const studentOneId = userIdByRole['Student One']!;
  const studentTwoId = userIdByRole['Student Two']!;

  // 3. Seed realistic courses
  const { data: existingCourse } = await adminDb
    .from('courses')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', 'CS-301')
    .eq('semester', 'Fall 2026')
    .maybeSingle();

  let courseId = existingCourse?.id;
  if (!courseId) {
    const { data: newCourse, error: cErr } = await adminDb
      .from('courses')
      .insert({
        tenant_id: tenantId,
        instructor_id: facultyId,
        name: 'Distributed Systems & Cloud Security',
        code: 'CS-301',
        semester: 'Fall 2026',
        description: 'Core university engineering course with integrity-monitored examinations.',
      })
      .select('id')
      .single();
    if (cErr || !newCourse) throw new Error(`Failed creating CS-301 course: ${cErr?.message}`);
    courseId = newCourse.id;
  }

  await adminDb
    .from('enrollments')
    .upsert(
      [
        { course_id: courseId, student_id: studentOneId },
        { course_id: courseId, student_id: studentTwoId },
      ],
      { onConflict: 'course_id,student_id' }
    );

  // 4. Published Active Demo Examination (ready for Student One / Two to launch right now)
  const { data: existingActiveExam } = await adminDb
    .from('exams')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('title', 'CS-301 Cloud & Integrity Assessment (Live Demo)')
    .maybeSingle();

  const now = Date.now();
  let activeExamId = existingActiveExam?.id;
  if (!activeExamId) {
    const { data: newExam, error: eErr } = await adminDb
      .from('exams')
      .insert({
        course_id: courseId,
        tenant_id: tenantId,
        created_by: facultyId,
        title: 'CS-301 Cloud & Integrity Assessment (Live Demo)',
        description: 'Live demonstration examination verifying MediaPipe camera, Web Audio RMS, and Supabase Realtime monitoring.',
        duration_minutes: 60,
        start_time: new Date(now - 30 * 60_000).toISOString(),
        end_time: new Date(now + 24 * 60 * 60_000).toISOString(),
        status: 'published',
        total_points: 10,
        settings: {
          require_camera: true,
          require_audio: true,
          require_fullscreen: true,
          max_violations_threshold: 10,
          negative_marking: false,
        },
      })
      .select('id')
      .single();
    if (eErr || !newExam) throw new Error(`Failed creating active demo exam: ${eErr?.message}`);
    activeExamId = newExam.id;

    const { data: qRows } = await adminDb
      .from('questions')
      .insert([
        {
          exam_id: activeExamId,
          order_index: 1,
          type: 'mcq_single',
          prompt: 'Which mechanism enforces per-student row isolation inside PostgreSQL regardless of client state?',
          points: 5,
          explanation: 'PostgreSQL Row-Level Security (RLS) evaluates auth.uid() policies per row inside the database engine.',
        },
        {
          exam_id: activeExamId,
          order_index: 2,
          type: 'mcq_single',
          prompt: 'Where does MediaPipe Face Landmarker inference execute in AI ExamGuard?',
          points: 5,
          explanation: 'All video frames remain local in the student browser via WebAssembly/WebGL with only metadata alerts sent to the backend.',
        },
      ])
      .select('id, order_index');

    if (qRows && qRows.length === 2) {
      const q1 = qRows.find((q) => q.order_index === 1)!;
      const q2 = qRows.find((q) => q.order_index === 2)!;
      await adminDb.from('question_answer_keys').insert([
        { question_id: q1.id, label: 'A', content: 'PostgreSQL Row-Level Security (RLS)', is_correct: true, order_index: 1 },
        { question_id: q1.id, label: 'B', content: 'LocalStorage CSS flags', is_correct: false, order_index: 2 },
        { question_id: q2.id, label: 'A', content: 'Locally in the candidate browser', is_correct: true, order_index: 1 },
        { question_id: q2.id, label: 'B', content: 'Uploaded continuously as raw video', is_correct: false, order_index: 2 },
      ]);
    }
  } else {
    // Keep active demo window fresh when re-run
    await adminDb
      .from('exams')
      .update({
        start_time: new Date(now - 30 * 60_000).toISOString(),
        end_time: new Date(now + 24 * 60 * 60_000).toISOString(),
        status: 'published',
      })
      .eq('id', activeExamId);
  }

  await adminDb
    .from('exam_assignments')
    .upsert(
      [
        { exam_id: activeExamId, student_id: studentOneId },
        { exam_id: activeExamId, student_id: studentTwoId },
      ],
      { onConflict: 'exam_id,student_id' }
    );

  // 5. Historical Completed Demo Examination (demonstrates submitted answers + separated simulated demo event)
  const { data: existingHistoryExam } = await adminDb
    .from('exams')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('title', 'CS-301 Historical Sample (Completed + Simulated Telemetry)')
    .maybeSingle();

  if (!existingHistoryExam) {
    const { data: histExam } = await adminDb
      .from('exams')
      .insert({
        course_id: courseId,
        tenant_id: tenantId,
        created_by: facultyId,
        title: 'CS-301 Historical Sample (Completed + Simulated Telemetry)',
        description: 'Completed sample exam demonstrating graded submission plus explicitly tagged simulated_demo events.',
        duration_minutes: 45,
        start_time: new Date(now - 4 * 60 * 60_000).toISOString(),
        end_time: new Date(now - 2 * 60 * 60_000).toISOString(),
        status: 'completed',
        total_points: 10,
      })
      .select('id')
      .single();

    if (histExam) {
      const { data: hq } = await adminDb
        .from('questions')
        .insert({
          exam_id: histExam.id,
          order_index: 1,
          type: 'mcq_single',
          prompt: 'Does RMS audio amplitude alone identify human speech or speaker identity?',
          points: 10,
          explanation: 'No; RMS measures acoustic energy only, requiring a VAD classifier for speech probability.',
        })
        .select('id')
        .single();

      if (hq) {
        const { data: opts } = await adminDb
          .from('question_answer_keys')
          .insert([
            { question_id: hq.id, label: 'A', content: 'No — RMS measures acoustic energy only', is_correct: true, order_index: 1 },
            { question_id: hq.id, label: 'B', content: 'Yes — RMS identifies speakers automatically', is_correct: false, order_index: 2 },
          ])
          .select('id, is_correct');

        const correctOpt = opts?.find((o) => o.is_correct);
        await adminDb.from('exam_assignments').insert({ exam_id: histExam.id, student_id: studentTwoId });

        const { data: histSession } = await adminDb
          .from('exam_sessions')
          .insert({
            exam_id: histExam.id,
            student_id: studentTwoId,
            tenant_id: tenantId,
            status: 'submitted',
            started_at: new Date(now - 3 * 60 * 60_000).toISOString(),
            submitted_at: new Date(now - 2.5 * 60 * 60_000).toISOString(),
            score: 100,
            trust_score: 88,
          })
          .select('id')
          .single();

        if (histSession && correctOpt) {
          await adminDb.from('session_answers').insert({
            session_id: histSession.id,
            question_id: hq.id,
            selected_option_id: correctOpt.id,
            is_correct: true,
            points_awarded: 10,
          });

          // Explicitly separated SIMULATED DEMO event (never conflated with real AI detections)
          await adminDb.from('proctor_events').insert({
            session_id: histSession.id,
            tenant_id: tenantId,
            event_type: 'TAB_SWITCH',
            severity: 'low',
            confidence: 0.75,
            details: {
              phase9EventType: 'TAB_HIDDEN',
              isSimulated: true,
              eventOrigin: 'simulated_demo',
              canonicalEvent: {
                eventType: 'TAB_HIDDEN',
                sourceModule: 'browser_visibility',
                eventOrigin: 'simulated_demo',
                isSimulated: true,
                durationMs: 4200,
                explanation: '[SIMULATED DEMO EVENT] Sample visibility change seeded for dashboard walkthrough.',
                reviewStatus: 'cleared',
                reviewedBy: invigilatorId,
              },
            },
          });
        }
      }
    }
  }

  await adminDb.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: adminId,
    action: 'SETTINGS_UPDATED',
    entity_type: 'tenant',
    entity_id: tenantId,
    details: { operation: 'demo_seed_refreshed', rolesSeeded: DEMO_USERS.length },
  });

  console.log('\n=== AI ExamGuard Demo University Setup Complete ===');
  console.log(`Tenant ID: ${tenantId} (slug: demo-university)`);
  console.log(`Active Demo Exam ID: ${activeExamId}`);
  console.log('Demo Accounts (password generated/supplied at runtime; not stored in git):');
  for (const spec of DEMO_USERS) {
    console.log(`- ${spec.label}: ${spec.email} | id=${userIds[spec.email]}`);
  }
  console.log(`Runtime Password Used: ${demoPassword}\n`);
}

main().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});

