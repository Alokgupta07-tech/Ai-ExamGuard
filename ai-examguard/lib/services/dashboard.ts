import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  IntegrationFoundationService,
  toDashboardIntegrationViews,
} from '@/lib/integrations/service';
import {
  evaluateSessionRiskAndCorrelations,
  mapRowToCanonicalEvent,
  type RawProctorEventRow,
} from '@/lib/proctoring/risk-engine';
import type {
  AuditAction,
  EventType,
  ExamStatus,
  QuestionType,
  ReviewStatus,
  SessionStatus,
  TenantSettings,
  UserRole,
} from '@/types/database';
import type {
  AdminDashboardPayload,
  AuditLogView,
  CourseView,
  CreateCourseInput,
  CreateExamInput,
  ExamView,
  FacultyDashboardPayload,
  IntegrationConfigView,
  InvigilatorDashboardPayload,
  ProctorEventView,
  ProfileSummary,
  QuestionView,
  ReviewActionHistoryEntry,
  ReviewActionInput,
  ReviewCaseView,
  SessionView,
  StudentDashboardPayload,
  TenantMemberView,
} from '@/types/dashboard';

export interface VerifiedActor {
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantDomain: string | null;
  tenantSettings: TenantSettings;
  roles: UserRole[];
}

/**
 * Memoized actor membership resolution within the request lifecycle.
 * Idempotently auto-provisions missing profile and tenant membership for authenticated users.
 */
const getCachedActorData = cache(async (userId: string) => {
  const { data: memberships, error: memError } = await supabaseAdmin
    .from('memberships')
    .select('tenant_id, role')
    .eq('user_id', userId);

  if (memError) {
    throw new Error(`Failed to verify institutional role: ${memError.message}`);
  }

  let rows = (memberships || []) as { tenant_id: string; role: UserRole }[];

  // Problem A & B Fix: If no membership exists, auto-bootstrap to SRM AP canonical tenant
  if (rows.length === 0) {
    const { data: defaultTenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, domain, settings')
      .or('slug.eq.srmap-demo,slug.eq.test-uni')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (defaultTenant) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const metaRole = authUser?.user?.user_metadata?.role as string | undefined;
      const targetRole: UserRole =
        metaRole === 'admin'
          ? 'admin'
          : metaRole === 'instructor' || metaRole === 'faculty'
          ? 'instructor'
          : metaRole === 'invigilator'
          ? 'invigilator'
          : 'student';

      await supabaseAdmin.from('memberships').upsert({
        tenant_id: defaultTenant.id,
        user_id: userId,
        role: targetRole,
        updated_at: new Date().toISOString(),
      });

      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: authUser?.user?.email || '',
        full_name:
          (authUser?.user?.user_metadata?.full_name as string) ||
          authUser?.user?.email?.split('@')[0] ||
          'Institutional User',
        updated_at: new Date().toISOString(),
      });

      rows = [{ tenant_id: defaultTenant.id, role: targetRole }];
    }
  }

  const firstRow = rows[0];
  if (!firstRow) {
    throw new Error('No tenant membership found for user. Please contact your institutional administrator.');
  }

  const activeTenantId = firstRow.tenant_id;
  const tenantRoles = rows
    .filter((r) => r.tenant_id === activeTenantId)
    .map((r) => r.role);

  const [{ data: tenant }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, slug, domain, settings')
      .eq('id', activeTenantId)
      .single(),
    supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  return {
    userId,
    email: profile?.email || '',
    fullName: profile?.full_name || 'User',
    tenantId: activeTenantId,
    tenantName: tenant?.name || 'SRM University–AP',
    tenantSlug: tenant?.slug || 'srmap-demo',
    tenantDomain: tenant?.domain ?? null,
    tenantSettings: (tenant?.settings as TenantSettings) || {},
    roles: tenantRoles,
    allRows: rows,
  };
});

/**
 * Authenticates the caller via Supabase Auth and resolves their verified tenant membership & roles.
 */
export async function requireRoleActor(allowedRoles: UserRole[]): Promise<VerifiedActor> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const actorData = await getCachedActorData(user.id);
  const normalizedAllowed = new Set<string>(allowedRoles);
  if (allowedRoles.includes('instructor')) normalizedAllowed.add('faculty');
  if (allowedRoles.includes('student')) normalizedAllowed.add('candidate');

  const matching = actorData.allRows.filter((r) => {
    const rRole = r.role as string;
    return normalizedAllowed.has(rRole) ||
      (rRole === 'instructor' && normalizedAllowed.has('faculty')) ||
      (rRole === 'student' && normalizedAllowed.has('candidate'));
  });
  const firstMatch = matching[0];

  if (!firstMatch) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(', ')}] institutional roles.`
    );
  }

  return {
    userId: user.id,
    email: actorData.email || user.email || '',
    fullName:
      actorData.fullName ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'User',
    tenantId: actorData.tenantId,
    tenantName: actorData.tenantName,
    tenantSlug: actorData.tenantSlug,
    tenantDomain: actorData.tenantDomain,
    tenantSettings: actorData.tenantSettings,
    roles: actorData.roles,
  };
}

/** Builds an in-memory map of userId -> ProfileSummary for a tenant's members. */
async function buildProfileMap(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, ProfileSummary>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uniqueIds);

  for (const row of (data || []) as { id: string; email: string; full_name: string }[]) {
    map.set(row.id, {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
    });
  }
  return map;
}

/** Shared helper to map raw courses, exams, questions, sessions, events, and review cases. */
async function fetchTenantAcademicData(tenantId: string, courseFilterIds?: string[]) {
  let coursesQuery = supabaseAdmin
    .from('courses')
    .select('id, tenant_id, instructor_id, name, code, semester, description, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (courseFilterIds) {
    if (courseFilterIds.length === 0) {
      coursesQuery = coursesQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      coursesQuery = coursesQuery.in('id', courseFilterIds);
    }
  }

  const { data: rawCourses } = await coursesQuery;
  const coursesRows = (rawCourses || []) as {
    id: string;
    tenant_id: string;
    instructor_id: string;
    name: string;
    code: string;
    semester: string;
    description: string | null;
    created_at: string;
  }[];

  const courseIds = coursesRows.map((c) => c.id);

  let examsQuery = supabaseAdmin
    .from('exams')
    .select(
      'id, course_id, tenant_id, title, description, instructions, duration_minutes, start_time, end_time, status, total_points, passing_marks, negative_marking, shuffle_questions, shuffle_options, settings, created_by, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: false });

  if (courseFilterIds) {
    if (courseFilterIds.length === 0) {
      examsQuery = examsQuery.in('course_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      examsQuery = examsQuery.in('course_id', courseFilterIds);
    }
  }

  const [{ data: rawExams }, { data: rawEnrollments }] = await Promise.all([
    examsQuery,
    courseIds.length > 0
      ? supabaseAdmin
          .from('enrollments')
          .select('course_id, student_id, enrolled_at')
          .in('course_id', courseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const examsRows = (rawExams || []) as {
    id: string;
    course_id: string;
    tenant_id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    duration_minutes: number;
    start_time: string;
    end_time: string;
    status: ExamStatus;
    total_points: number;
    passing_marks: number;
    negative_marking: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    settings: Record<string, unknown>;
    created_by: string;
    created_at: string;
  }[];

  const enrollmentRows = (rawEnrollments || []) as {
    course_id: string;
    student_id: string;
    enrolled_at: string;
  }[];

  const examIds = examsRows.map((e) => e.id);

  const [{ data: rawQuestions }, { data: rawSessions }] = await Promise.all([
    examIds.length > 0
      ? supabaseAdmin
          .from('questions')
          .select('id, exam_id, order_index, type, prompt, points, category, difficulty, created_at')
          .in('exam_id', examIds)
          .order('order_index', { ascending: true })
      : Promise.resolve({ data: [] }),
    examIds.length > 0
      ? supabaseAdmin
          .from('exam_sessions')
          .select(
            'id, exam_id, student_id, tenant_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at'
          )
          .in('exam_id', examIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const questionRows = (rawQuestions || []) as {
    id: string;
    exam_id: string;
    order_index: number;
    type: QuestionType;
    prompt: string;
    points: number;
    category: string | null;
    difficulty: 'easy' | 'medium' | 'hard';
    created_at: string;
  }[];

  const sessionRows = (rawSessions || []) as {
    id: string;
    exam_id: string;
    student_id: string;
    tenant_id: string;
    status: SessionStatus;
    started_at: string | null;
    submitted_at: string | null;
    score: number | null;
    trust_score: number;
    hardware_status: { camera?: boolean; microphone?: boolean; fullscreen?: boolean } | null;
    created_at: string;
  }[];

  const sessionIds = sessionRows.map((s) => s.id);

  const [{ data: rawEvents }, { data: rawCases }, { data: rawSessionAnswers }, { data: rawReviewActions }] = await Promise.all([
    sessionIds.length > 0
      ? supabaseAdmin
          .from('proctor_events')
          .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? supabaseAdmin
          .from('review_cases')
          .select('id, session_id, assigned_to, status, priority, summary, created_at, reviewed_at')
          .in('session_id', sessionIds)
          .order('priority', { ascending: true })
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? supabaseAdmin
          .from('session_answers')
          .select('session_id')
          .in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? supabaseAdmin
          .from('review_actions')
          .select('id, review_case_id, session_id, reviewer_id, action_type, message, created_at')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false })
          .limit(150)
      : Promise.resolve({ data: [] }),
  ]);

  const eventRows = (rawEvents || []) as RawProctorEventRow[];

  const caseRows = (rawCases || []) as {
    id: string;
    session_id: string;
    assigned_to: string | null;
    status: ReviewStatus;
    priority: number;
    summary: string | null;
    created_at: string;
    reviewed_at: string | null;
  }[];

  const answerRows = (rawSessionAnswers || []) as { session_id: string }[];
  const reviewActionRows = (rawReviewActions || []) as {
    id: string;
    review_case_id: string;
    session_id: string;
    reviewer_id: string;
    action_type: ReviewActionHistoryEntry['actionType'];
    message: string | null;
    created_at: string;
  }[];

  const profileMap = await buildProfileMap([
    ...coursesRows.map((c) => c.instructor_id),
    ...enrollmentRows.map((e) => e.student_id),
    ...sessionRows.map((s) => s.student_id),
    ...reviewActionRows.map((a) => a.reviewer_id),
  ]);

  const courseMap = new Map(coursesRows.map((c) => [c.id, c]));
  const examMap = new Map(examsRows.map((e) => [e.id, e]));
  const sessionMap = new Map(sessionRows.map((s) => [s.id, s]));

  const enrollmentCountByCourse = new Map<string, number>();
  for (const enr of enrollmentRows) {
    enrollmentCountByCourse.set(
      enr.course_id,
      (enrollmentCountByCourse.get(enr.course_id) || 0) + 1
    );
  }

  const answeredCountBySession = new Map<string, number>();
  for (const ans of answerRows) {
    answeredCountBySession.set(
      ans.session_id,
      (answeredCountBySession.get(ans.session_id) || 0) + 1
    );
  }

  const questionCountByExam = new Map<string, number>();
  for (const q of questionRows) {
    questionCountByExam.set(q.exam_id, (questionCountByExam.get(q.exam_id) || 0) + 1);
  }

  const sessionCountByExam = new Map<string, number>();
  for (const s of sessionRows) {
    sessionCountByExam.set(s.exam_id, (sessionCountByExam.get(s.exam_id) || 0) + 1);
  }

  const courses: CourseView[] = coursesRows.map((c) => ({
    id: c.id,
    tenantId: c.tenant_id,
    instructorId: c.instructor_id,
    instructorName: profileMap.get(c.instructor_id)?.fullName || 'Faculty Member',
    name: c.name,
    code: c.code,
    semester: c.semester,
    description: c.description,
    enrollmentCount: enrollmentCountByCourse.get(c.id) || 0,
    createdAt: c.created_at,
  }));

  const exams: ExamView[] = examsRows.map((e) => {
    const course = courseMap.get(e.course_id);
    return {
      id: e.id,
      courseId: e.course_id,
      courseCode: course?.code || 'COURSE',
      courseName: course?.name || 'Course',
      tenantId: e.tenant_id,
      title: e.title,
      description: e.description,
      instructions: e.instructions ?? null,
      durationMinutes: e.duration_minutes,
      startTime: e.start_time,
      endTime: e.end_time,
      status: e.status,
      totalPoints: e.total_points,
      passingMarks: e.passing_marks ?? 0,
      negativeMarking: Number(e.negative_marking ?? 0),
      shuffleQuestions: Boolean(e.shuffle_questions),
      shuffleOptions: Boolean(e.shuffle_options),
      questionCount: questionCountByExam.get(e.id) || 0,
      sessionCount: sessionCountByExam.get(e.id) || 0,
      settings: e.settings || {},
      createdBy: e.created_by,
      createdAt: e.created_at,
    };
  });

  const questions: QuestionView[] = questionRows.map((q) => {
    const exam = examMap.get(q.exam_id);
    const course = exam ? courseMap.get(exam.course_id) : undefined;
    return {
      id: q.id,
      examId: q.exam_id,
      examTitle: exam?.title || 'Examination',
      courseCode: course?.code || 'COURSE',
      orderIndex: q.order_index,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      category: q.category ?? null,
      difficulty: q.difficulty || 'medium',
      createdAt: q.created_at,
    };
  });

  const proctorEvents: ProctorEventView[] = eventRows.map((ev) => {
    const session = sessionMap.get(ev.session_id);
    const exam = session ? examMap.get(session.exam_id) : undefined;
    const student = session ? profileMap.get(session.student_id) : undefined;
    const canonical = mapRowToCanonicalEvent(ev, session?.exam_id || '');
    return {
      id: canonical.eventId,
      clientEventId: canonical.clientEventId,
      universityId: canonical.universityId,
      examId: canonical.examId,
      sessionId: canonical.sessionId,
      examTitle: exam?.title || 'Examination',
      studentName: student?.fullName || 'Candidate',
      eventType: canonical.eventType as EventType,
      sourceModule: canonical.sourceModule,
      eventOrigin: canonical.eventOrigin,
      isSimulated: canonical.isSimulated,
      severity: canonical.severity,
      confidence: canonical.confidence,
      occurredAt: canonical.timestamp,
      durationMs: canonical.durationMs,
      modelVersion: canonical.modelVersion,
      explanation: canonical.explanation,
      reviewStatus: canonical.reviewStatus,
      reviewNote: canonical.reviewNote ?? null,
      reviewedAt: canonical.reviewedAt ?? null,
      reviewedBy: canonical.reviewedBy ?? null,
      details: ev.details || {},
      createdAt: ev.created_at,
    };
  });

  const eventsBySession = new Map<string, ProctorEventView[]>();
  for (const ev of proctorEvents) {
    const arr = eventsBySession.get(ev.sessionId) || [];
    arr.push(ev);
    eventsBySession.set(ev.sessionId, arr);
  }

  const assessmentBySession = new Map<string, ReturnType<typeof evaluateSessionRiskAndCorrelations>['assessment']>();
  for (const s of sessionRows) {
    const sessEvents = eventsBySession.get(s.id) || [];
    const evalRes = evaluateSessionRiskAndCorrelations({
      sessionId: s.id,
      examId: s.exam_id,
      universityId: s.tenant_id,
      priorEvents: sessEvents.map((ev) => ({
        eventId: ev.id,
        eventType: ev.eventType,
        occurredAt: ev.occurredAt,
        durationMs: ev.durationMs,
        details: ev.details,
      })),
    });
    assessmentBySession.set(s.id, evalRes.assessment);
  }

  const sessions: SessionView[] = sessionRows.map((s) => {
    const exam = examMap.get(s.exam_id);
    const course = exam ? courseMap.get(exam.course_id) : undefined;
    const student = profileMap.get(s.student_id);
    const assessment = assessmentBySession.get(s.id);
    return {
      id: s.id,
      examId: s.exam_id,
      examTitle: exam?.title || 'Examination',
      courseCode: course?.code || 'COURSE',
      studentId: s.student_id,
      studentName: student?.fullName || 'Candidate',
      studentEmail: student?.email || 'N/A',
      status: s.status,
      startedAt: s.started_at,
      submittedAt: s.submitted_at,
      durationMinutes: exam?.duration_minutes ?? undefined,
      endTime: exam?.end_time ?? null,
      answeredCount: answeredCountBySession.get(s.id) || 0,
      totalQuestionCount: exam ? questionCountByExam.get(exam.id) || 0 : 0,
      score: s.score !== null ? Number(s.score) : null,
      trustScore: Number(s.trust_score ?? assessment?.trustScore ?? 100),
      riskCategory: assessment?.riskCategory ?? 'NORMAL',
      riskScore: assessment?.riskScore ?? 0,
      riskAssessment: assessment,
      hardwareStatus: s.hardware_status || {},
      createdAt: s.created_at,
    };
  });

  const reviewCases: ReviewCaseView[] = caseRows.map((rc) => {
    const session = sessionMap.get(rc.session_id);
    const exam = session ? examMap.get(session.exam_id) : undefined;
    const course = exam ? courseMap.get(exam.course_id) : undefined;
    const student = session ? profileMap.get(session.student_id) : undefined;
    const assessment = assessmentBySession.get(rc.session_id);
    return {
      id: rc.id,
      sessionId: rc.session_id,
      examTitle: exam?.title || 'Examination',
      courseCode: course?.code || 'COURSE',
      studentId: session?.student_id || '',
      studentName: student?.fullName || 'Candidate',
      studentEmail: student?.email || 'N/A',
      status: rc.status,
      priority: rc.priority,
      trustScore: Number(session?.trust_score ?? assessment?.trustScore ?? 100),
      riskCategory: assessment?.riskCategory ?? 'NORMAL',
      riskScore: assessment?.riskScore ?? 0,
      riskAssessment: assessment,
      summary: rc.summary || assessment?.summaryExplanation || null,
      assignedTo: rc.assigned_to,
      createdAt: rc.created_at,
      reviewedAt: rc.reviewed_at,
      events: eventsBySession.get(rc.session_id) || [],
    };
  });

  const reviewActions: ReviewActionHistoryEntry[] = reviewActionRows.map((a) => ({
    id: a.id,
    reviewCaseId: a.review_case_id,
    sessionId: a.session_id,
    reviewerId: a.reviewer_id,
    reviewerName: profileMap.get(a.reviewer_id)?.fullName || 'Invigilator',
    actionType: a.action_type,
    message: a.message,
    createdAt: a.created_at,
  }));

  return {
    courses,
    exams,
    questions,
    sessions,
    proctorEvents,
    reviewCases,
    reviewActions,
    enrollments: enrollmentRows.map((enr) => {
      const course = courseMap.get(enr.course_id);
      const student = profileMap.get(enr.student_id);
      return {
        courseId: enr.course_id,
        courseCode: course?.code || 'COURSE',
        courseName: course?.name || 'Course',
        studentId: enr.student_id,
        studentName: student?.fullName || 'Student',
        studentEmail: student?.email || 'N/A',
        enrolledAt: enr.enrolled_at,
      };
    }),
  };
}

export class DashboardService {
  static async getAdminData(): Promise<AdminDashboardPayload> {
    const actor = await requireRoleActor(['admin']);

    const [{ data: rawMembers }, { data: rawLogs }, { data: rawIntegrations }, academic] =
      await Promise.all([
        supabaseAdmin
          .from('memberships')
          .select('user_id, role, created_at')
          .eq('tenant_id', actor.tenantId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('audit_logs')
          .select('id, user_id, action, entity_type, entity_id, details, created_at')
          .eq('tenant_id', actor.tenantId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabaseAdmin
          .from('integration_configs')
          .select('id, integration_type, provider_name, is_active, config, updated_at')
          .eq('tenant_id', actor.tenantId)
          .order('provider_name', { ascending: true }),
        fetchTenantAcademicData(actor.tenantId),
      ]);

    const memberRows = (rawMembers || []) as {
      user_id: string;
      role: UserRole;
      created_at: string;
    }[];
    const logRows = (rawLogs || []) as {
      id: string;
      user_id: string | null;
      action: AuditAction;
      entity_type: string | null;
      entity_id: string | null;
      details: Record<string, unknown> | null;
      created_at: string;
    }[];

    const profileMap = await buildProfileMap([
      ...memberRows.map((m) => m.user_id),
      ...logRows.map((l) => l.user_id || '').filter(Boolean),
    ]);

    const members: TenantMemberView[] = memberRows.map((m) => {
      const prof = profileMap.get(m.user_id);
      return {
        userId: m.user_id,
        role: m.role,
        fullName: prof?.fullName || 'Institutional User',
        email: prof?.email || 'N/A',
        createdAt: m.created_at,
      };
    });

    const auditLogs: AuditLogView[] = logRows.map((l) => ({
      id: l.id,
      userId: l.user_id,
      actorName: (l.user_id && profileMap.get(l.user_id)?.fullName) || 'System',
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: l.details || {},
      createdAt: l.created_at,
    }));

    const integrations: IntegrationConfigView[] = toDashboardIntegrationViews(
      (rawIntegrations || []) as {
        id: string;
        integration_type: IntegrationConfigView['integrationType'];
        provider_name: string;
        is_active: boolean;
        config: Record<string, unknown> | null;
        updated_at: string;
      }[]
    );

    return {
      tenant: {
        id: actor.tenantId,
        name: actor.tenantName,
        slug: actor.tenantSlug,
        domain: actor.tenantDomain,
        settings: actor.tenantSettings,
      },
      metrics: {
        totalStudents: members.filter((m) => m.role === 'student').length,
        totalFaculty: members.filter((m) => m.role === 'instructor').length,
        totalInvigilators: members.filter((m) => m.role === 'invigilator').length,
        totalAdmins: members.filter((m) => m.role === 'admin').length,
        activeExams: academic.exams.filter((e) => e.status === 'active' || e.status === 'published')
          .length,
        completedExams: academic.exams.filter((e) => e.status === 'completed').length,
        flaggedSessions: academic.reviewCases.filter(
          (rc) => rc.status === 'pending' || rc.status === 'flagged' || rc.status === 'escalated'
        ).length,
      },
      members,
      courses: academic.courses,
      exams: academic.exams,
      questions: academic.questions,
      sessions: academic.sessions,
      proctorEvents: academic.proctorEvents,
      reviewCases: academic.reviewCases,
      auditLogs,
      integrations,
    };
  }

  static async getFacultyData(): Promise<FacultyDashboardPayload> {
    const actor = await requireRoleActor(['instructor']);

    const { data: ownCourses } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('tenant_id', actor.tenantId)
      .eq('instructor_id', actor.userId);

    const ownCourseIds = ((ownCourses || []) as { id: string }[]).map((c) => c.id);
    const academic = await fetchTenantAcademicData(actor.tenantId, ownCourseIds);

    const now = Date.now();
    const upcomingExaminations = academic.exams.filter(
      (e) =>
        (e.status === 'published' || e.status === 'active') &&
        new Date(e.endTime).getTime() >= now
    ).length;

    const activeStudentIds = new Set(academic.enrollments.map((e) => e.studentId));
    const submissions = academic.sessions.filter(
      (s) => s.status === 'submitted' || s.status === 'graded' || s.status === 'under_review'
    ).length;
    const studentsRequiringReview = academic.reviewCases.filter(
      (rc) => rc.status === 'pending' || rc.status === 'in_review' || rc.status === 'flagged'
    ).length;

    return {
      tenantId: actor.tenantId,
      tenantName: actor.tenantName,
      metrics: {
        myExaminations: academic.exams.length,
        upcomingExaminations,
        activeStudents: activeStudentIds.size,
        submissions,
        studentsRequiringReview,
      },
      courses: academic.courses,
      exams: academic.exams,
      questions: academic.questions,
      sessions: academic.sessions,
      reviewCases: academic.reviewCases,
      proctorEvents: academic.proctorEvents,
      enrollments: academic.enrollments,
    };
  }

  static async getStudentData(): Promise<StudentDashboardPayload> {
    const actor = await requireRoleActor(['student']);

    const { data: myEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('course_id')
      .eq('student_id', actor.userId);

    const enrolledCourseIds = ((myEnrollments || []) as { course_id: string }[]).map(
      (e) => e.course_id
    );

    const academic = await fetchTenantAcademicData(actor.tenantId, enrolledCourseIds);

    const candidateExamIds = academic.exams.map((e) => e.id);
    const { data: rawAssignments, error: assignErr } =
      candidateExamIds.length > 0
        ? await supabaseAdmin
            .from('exam_assignments')
            .select('exam_id, student_id')
            .in('exam_id', candidateExamIds)
        : { data: [], error: null };

    if (assignErr) {
      throw new Error(`Failed to verify student exam assignments: ${assignErr.message}`);
    }

    const assignedStudentsByExam = new Map<string, Set<string>>();
    for (const row of (rawAssignments || []) as { exam_id: string; student_id: string }[]) {
      const set = assignedStudentsByExam.get(row.exam_id) || new Set<string>();
      set.add(row.student_id);
      assignedStudentsByExam.set(row.exam_id, set);
    }

    // Filter STRICTLY to published/active/completed exams assigned to THIS student
    const studentVisibleExams = academic.exams.filter((e) => {
      if (e.status !== 'published' && e.status !== 'active' && e.status !== 'completed') {
        return false;
      }
      const explicitRoster = assignedStudentsByExam.get(e.id);
      if (explicitRoster && explicitRoster.size > 0) {
        return explicitRoster.has(actor.userId);
      }
      return true;
    });
    const mySessions = academic.sessions.filter((s) => s.studentId === actor.userId);

    const completedSessions = mySessions.filter(
      (s) => s.status === 'submitted' || s.status === 'graded'
    );
    const now = Date.now();
    const availableExams = studentVisibleExams.filter((e) => {
      const start = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      const alreadyDone = completedSessions.some((s) => s.examId === e.id);
      return !alreadyDone && (e.status === 'active' || (e.status === 'published' && start <= now && end >= now));
    });
    const upcomingExams = studentVisibleExams.filter(
      (e) => e.status === 'published' && new Date(e.startTime).getTime() > now
    );

    const averageTrustScore =
      mySessions.length > 0
        ? Math.round(
            mySessions.reduce((acc, s) => acc + s.trustScore, 0) / mySessions.length
          )
        : 100;

    return {
      tenantId: actor.tenantId,
      tenantName: actor.tenantName,
      serverTimeMs: now,
      profile: {
        id: actor.userId,
        email: actor.email,
        fullName: actor.fullName,
      },
      metrics: {
        upcomingExams: upcomingExams.length,
        availableExams: availableExams.length,
        completedExams: completedSessions.length,
        averageTrustScore,
      },
      enrolledCourses: academic.courses,
      exams: studentVisibleExams,
      sessions: mySessions,
    };
  }

  static async getInvigilatorData(): Promise<InvigilatorDashboardPayload> {
    const actor = await requireRoleActor(['invigilator']);
    const academic = await fetchTenantAcademicData(actor.tenantId);

    const activeExams = academic.exams.filter(
      (e) => e.status === 'active' || e.status === 'published'
    );
    const activeSessions = academic.sessions.filter((s) => s.status === 'in_progress');
    const reviewRequired = academic.reviewCases.filter(
      (rc) => rc.status === 'pending' || rc.status === 'in_review' || rc.status === 'flagged'
    ).length;
    const highPriorityAlerts = academic.proctorEvents.filter(
      (ev) => ev.severity === 'high' || ev.severity === 'critical'
    ).length;

    const connectivityPool = activeSessions.length > 0 ? activeSessions : academic.sessions;
    const cameraConnectedCount = connectivityPool.filter(
      (s) => s.hardwareStatus?.camera === true
    ).length;
    const micConnectedCount = connectivityPool.filter(
      (s) => s.hardwareStatus?.microphone === true
    ).length;

    return {
      tenantId: actor.tenantId,
      tenantName: actor.tenantName,
      metrics: {
        activeCandidates: activeSessions.length,
        activeExaminations: activeExams.length,
        reviewRequired,
        highPriorityAlerts,
        cameraConnectedCount,
        cameraTotalCount: connectivityPool.length,
        micConnectedCount,
        micTotalCount: connectivityPool.length,
      },
      exams: activeExams.length > 0 ? activeExams : academic.exams,
      sessions: academic.sessions,
      proctorEvents: academic.proctorEvents,
      reviewCases: academic.reviewCases,
      reviewActions: academic.reviewActions,
    };
  }

  static async createCourse(input: CreateCourseInput) {
    const actor = await requireRoleActor(['admin', 'instructor']);
    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert({
        tenant_id: actor.tenantId,
        instructor_id: actor.userId,
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        semester: input.semester.trim(),
        description: input.description?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create course: ${error.message}`);
    }
    return data;
  }

  static async createExam(input: CreateExamInput) {
    const actor = await requireRoleActor(['admin', 'instructor']);

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, tenant_id')
      .eq('id', input.courseId)
      .eq('tenant_id', actor.tenantId)
      .single();

    if (!course) {
      throw new Error('Selected course was not found in your university tenant.');
    }

    const { data, error } = await supabaseAdmin
      .from('exams')
      .insert({
        course_id: input.courseId,
        tenant_id: actor.tenantId,
        created_by: actor.userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        duration_minutes: input.durationMinutes,
        start_time: input.startTime,
        end_time: input.endTime,
        status: 'draft',
        total_points: input.totalPoints,
        settings: {
          require_camera: input.requireCamera,
          require_audio: input.requireAudio,
          require_fullscreen: input.requireFullscreen,
          max_violations_threshold: 10,
        },
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create examination: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'EXAM_CREATED',
      entity_type: 'exam',
      entity_id: data.id,
      details: { title: input.title },
    });

    return data;
  }

  static async updateExamStatus(examId: string, status: ExamStatus) {
    const actor = await requireRoleActor(['admin', 'instructor']);
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('exams')
      .select('id, tenant_id, created_by')
      .eq('id', examId)
      .eq('tenant_id', actor.tenantId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new Error('Examination not found in your university tenant.');
    }

    if (!actor.roles.includes('admin') && existing.created_by !== actor.userId) {
      throw new Error('Forbidden: only the exam owner or university administrator may change exam status.');
    }

    const { error } = await supabaseAdmin
      .from('exams')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', examId)
      .eq('tenant_id', actor.tenantId);

    if (error) {
      throw new Error(`Failed to update examination status: ${error.message}`);
    }

    if (status === 'published') {
      await supabaseAdmin.from('audit_logs').insert({
        tenant_id: actor.tenantId,
        user_id: actor.userId,
        action: 'EXAM_PUBLISHED',
        entity_type: 'exam',
        entity_id: examId,
        details: { status },
      });
    }
  }

  static async updateTenantConfig(payload: {
    name?: string;
    domain?: string | null;
    settings: TenantSettings;
  }) {
    const actor = await requireRoleActor(['admin']);
    const updateBody: Record<string, unknown> = {
      settings: payload.settings,
      updated_at: new Date().toISOString(),
    };
    if (payload.name !== undefined) updateBody.name = payload.name.trim();
    if (payload.domain !== undefined) updateBody.domain = payload.domain?.trim() || null;

    const { error } = await supabaseAdmin
      .from('tenants')
      .update(updateBody)
      .eq('id', actor.tenantId);

    if (error) {
      throw new Error(`Failed to update tenant settings: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'SETTINGS_CHANGED',
      entity_type: 'tenant',
      entity_id: actor.tenantId,
      details: payload.settings,
    });
  }

  static async upsertIntegration(payload: {
    integrationType: IntegrationConfigView['integrationType'];
    providerName: string;
    endpoint: string;
    isActive: boolean;
  }) {
    const actor = await requireRoleActor(['admin']);
    await IntegrationFoundationService.upsertTenantConnector({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      integrationType: payload.integrationType,
      providerName: payload.providerName,
      isActive: payload.isActive,
      publicConfig: { endpoint: payload.endpoint.trim() },
    });
  }

  static async recordReviewAction(input: ReviewActionInput) {
    const actor = await requireRoleActor(['invigilator', 'instructor', 'admin']);

    const { data: reviewCase } = await supabaseAdmin
      .from('review_cases')
      .select('id, tenant_id, session_id')
      .eq('id', input.reviewCaseId)
      .eq('tenant_id', actor.tenantId)
      .single();

    if (!reviewCase) {
      throw new Error('Review case not found in your institutional tenant.');
    }

    if (input.sessionId !== reviewCase.session_id) {
      throw new Error('Forbidden: Session does not match the selected review case.');
    }

    const { error: actionError } = await supabaseAdmin.from('review_actions').insert({
      review_case_id: input.reviewCaseId,
      session_id: reviewCase.session_id,
      reviewer_id: actor.userId,
      action_type: input.actionType,
      message: input.message.trim(),
    });

    if (actionError) {
      throw new Error(`Failed to log review action: ${actionError.message}`);
    }

    const { error: caseError } = await supabaseAdmin
      .from('review_cases')
      .update({
        status: input.newStatus,
        assigned_to: actor.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', input.reviewCaseId)
      .eq('tenant_id', actor.tenantId);

    if (caseError) {
      throw new Error(`Failed to update review case: ${caseError.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'REVIEW_ACTION_TAKEN',
      entity_type: 'review_case',
      entity_id: input.reviewCaseId,
      details: { actionType: input.actionType, newStatus: input.newStatus },
    });
  }
}
