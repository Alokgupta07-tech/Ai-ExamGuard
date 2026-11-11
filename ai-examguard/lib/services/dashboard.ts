import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  AuditAction,
  EventSeverity,
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

  const { data: memberships, error: memError } = await supabaseAdmin
    .from('memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id);

  if (memError) {
    throw new Error(`Failed to verify institutional role: ${memError.message}`);
  }

  const rows = (memberships || []) as { tenant_id: string; role: UserRole }[];
  const matching = rows.filter((r) => allowedRoles.includes(r.role));
  const firstMatch = matching[0];

  if (!firstMatch) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(', ')}] institutional roles.`
    );
  }

  const activeTenantId = firstMatch.tenant_id;
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
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: profile?.email || user.email || '',
    fullName:
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'User',
    tenantId: activeTenantId,
    tenantName: tenant?.name || 'University Tenant',
    tenantSlug: tenant?.slug || 'default',
    tenantDomain: tenant?.domain ?? null,
    tenantSettings: (tenant?.settings as TenantSettings) || {},
    roles: tenantRoles,
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

  if (courseFilterIds && courseFilterIds.length > 0) {
    coursesQuery = coursesQuery.in('id', courseFilterIds);
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
      'id, course_id, tenant_id, title, description, duration_minutes, start_time, end_time, status, total_points, settings, created_by, created_at'
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
    duration_minutes: number;
    start_time: string;
    end_time: string;
    status: ExamStatus;
    total_points: number;
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
          .select('id, exam_id, order_index, type, prompt, points, created_at')
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

  const [{ data: rawEvents }, { data: rawCases }] = await Promise.all([
    sessionIds.length > 0
      ? supabaseAdmin
          .from('proctor_events')
          .select('id, session_id, event_type, severity, confidence, details, created_at')
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
  ]);

  const eventRows = (rawEvents || []) as {
    id: string;
    session_id: string;
    event_type: EventType;
    severity: EventSeverity;
    confidence: number | null;
    details: Record<string, unknown> | null;
    created_at: string;
  }[];

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

  const profileMap = await buildProfileMap([
    ...coursesRows.map((c) => c.instructor_id),
    ...enrollmentRows.map((e) => e.student_id),
    ...sessionRows.map((s) => s.student_id),
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
      durationMinutes: e.duration_minutes,
      startTime: e.start_time,
      endTime: e.end_time,
      status: e.status,
      totalPoints: e.total_points,
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
      createdAt: q.created_at,
    };
  });

  const sessions: SessionView[] = sessionRows.map((s) => {
    const exam = examMap.get(s.exam_id);
    const course = exam ? courseMap.get(exam.course_id) : undefined;
    const student = profileMap.get(s.student_id);
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
      score: s.score !== null ? Number(s.score) : null,
      trustScore: Number(s.trust_score ?? 100),
      hardwareStatus: s.hardware_status || {},
      createdAt: s.created_at,
    };
  });

  const proctorEvents: ProctorEventView[] = eventRows.map((ev) => {
    const session = sessionMap.get(ev.session_id);
    const exam = session ? examMap.get(session.exam_id) : undefined;
    const student = session ? profileMap.get(session.student_id) : undefined;
    return {
      id: ev.id,
      sessionId: ev.session_id,
      examTitle: exam?.title || 'Examination',
      studentName: student?.fullName || 'Candidate',
      eventType: ev.event_type,
      severity: ev.severity,
      confidence: ev.confidence !== null ? Number(ev.confidence) : null,
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

  const reviewCases: ReviewCaseView[] = caseRows.map((rc) => {
    const session = sessionMap.get(rc.session_id);
    const exam = session ? examMap.get(session.exam_id) : undefined;
    const course = exam ? courseMap.get(exam.course_id) : undefined;
    const student = session ? profileMap.get(session.student_id) : undefined;
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
      trustScore: Number(session?.trust_score ?? 100),
      summary: rc.summary,
      assignedTo: rc.assigned_to,
      createdAt: rc.created_at,
      reviewedAt: rc.reviewed_at,
      events: eventsBySession.get(rc.session_id) || [],
    };
  });

  return {
    courses,
    exams,
    questions,
    sessions,
    proctorEvents,
    reviewCases,
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

    const integrations: IntegrationConfigView[] = ((rawIntegrations || []) as {
      id: string;
      integration_type: IntegrationConfigView['integrationType'];
      provider_name: string;
      is_active: boolean;
      config: Record<string, unknown> | null;
      updated_at: string;
    }[]).map((i) => ({
      id: i.id,
      integrationType: i.integration_type,
      providerName: i.provider_name,
      isActive: i.is_active,
      configSummary: (i.config?.endpoint as string | undefined) || 'Configured',
      updatedAt: i.updated_at,
    }));

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

    // Filter STRICTLY to published/active/completed exams and THIS student's sessions only
    const studentVisibleExams = academic.exams.filter(
      (e) => e.status === 'published' || e.status === 'active' || e.status === 'completed'
    );
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
    const { error } = await supabaseAdmin.from('integration_configs').upsert(
      {
        tenant_id: actor.tenantId,
        integration_type: payload.integrationType,
        provider_name: payload.providerName.trim(),
        is_active: payload.isActive,
        config: { endpoint: payload.endpoint.trim() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,integration_type,provider_name' }
    );

    if (error) {
      throw new Error(`Failed to save integration: ${error.message}`);
    }
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

    const { error: actionError } = await supabaseAdmin.from('review_actions').insert({
      review_case_id: input.reviewCaseId,
      session_id: input.sessionId,
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
      .eq('id', input.reviewCaseId);

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
