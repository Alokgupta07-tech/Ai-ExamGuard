import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildCsvDocument, escapeCsvCell } from '@/lib/utils/csv';
import {
  evaluateSessionRiskAndCorrelations,
  mapRowToCanonicalEvent,
  type RawProctorEventRow,
} from '@/lib/proctoring/risk-engine';
import type {
  AuditAction,
  ExamStatus,
  ReviewStatus,
  SessionStatus,
  UserRole,
} from '@/types/database';
import type { AuditLogView, ProctorEventView, ReviewActionHistoryEntry, ReviewCaseView } from '@/types/dashboard';
import type { EventOrigin, RiskCategory } from '@/types/proctoring';
import type {
  AdminAuditLogFilterParams,
  EventFrequencyReportRow,
  ExaminationLevelReportRow,
  ExaminationSubmissionReportRow,
  IndividualCandidateReportRow,
  MonitoringStatusReportRow,
  ReportFilterOptions,
  ReportFilterParams,
  ReportSuitePayload,
  ReportType,
  ReviewOutcomeReportRow,
  UniversityActivityReportRow,
} from '@/types/reporting';

export interface ReportCourseInput {
  id: string;
  tenantId: string;
  code: string;
  name: string;
}

export interface ReportExamInput {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  departmentCode: string;
  tenantId: string;
  title: string;
  status: ExamStatus;
  totalPoints: number;
  passingMarks: number;
  startTime: string;
  endTime: string;
  questionCount: number;
}

export interface ReportSessionInput {
  id: string;
  examId: string;
  examTitle: string;
  courseId: string;
  courseCode: string;
  departmentCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: SessionStatus;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  answeredCount: number;
  totalQuestionCount: number;
  score: number | null;
  totalPoints: number;
  passingMarks: number;
  trustScore: number;
  riskCategory: RiskCategory;
  hardwareStatus: Record<string, unknown>;
}

export interface ReportAuditInput {
  id: string;
  tenantId: string;
  createdAt: string;
}

export interface ComputeReportInput {
  universityId: string;
  universityName: string;
  universities: Array<{ id: string; name: string; slug: string }>;
  courses: ReportCourseInput[];
  exams: ReportExamInput[];
  sessions: ReportSessionInput[];
  proctorEvents: ProctorEventView[];
  reviewCases: ReviewCaseView[];
  reviewActions: ReviewActionHistoryEntry[];
  auditLogs: ReportAuditInput[];
  filters: ReportFilterParams;
}

export function deriveDepartmentCode(courseCode: string | null | undefined): string {
  if (!courseCode) return 'GENERAL';
  const prefix = courseCode.trim().split('-')[0]?.toUpperCase();
  return prefix && prefix.length > 0 ? prefix : 'GENERAL';
}

function parseDateBoundary(value: string | null | undefined, endOfDay: boolean): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Treat pure YYYY-MM-DD inputs as full calendar days UTC-inclusive
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : ms;
  }
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

function withinDateRange(
  iso: string | null | undefined,
  fromMs: number | null,
  toMs: number | null
): boolean {
  if (fromMs === null && toMs === null) return true;
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return false;
  if (fromMs !== null && ms < fromMs) return false;
  if (toMs !== null && ms > toMs) return false;
  return true;
}

function matchesReviewStatusFilter(params: {
  filterStatus: string | null | undefined;
  caseStatus: ReviewStatus | 'no_case';
  sessionEvents: ProctorEventView[];
}): boolean {
  const target = params.filterStatus?.trim();
  if (!target) return true;
  if (params.caseStatus === target) return true;
  if (params.sessionEvents.some((ev) => ev.reviewStatus === target)) return true;
  return false;
}

function deriveHardwareConnectionStatus(
  hardwareStatus: Record<string, unknown>,
  key: 'camera' | 'microphone'
): 'connected' | 'disconnected' | 'unknown' {
  const val = hardwareStatus[key];
  if (val === true) return 'connected';
  if (val === false) return 'disconnected';
  if (typeof val === 'string') {
    if (val === 'connected' || val === 'ready' || val === 'granted') return 'connected';
    if (val === 'disconnected' || val === 'denied' || val === 'unavailable') return 'disconnected';
  }
  return 'unknown';
}

export function computeReportSuite(input: ComputeReportInput): ReportSuitePayload {
  const filters = input.filters;
  const fromMs = parseDateBoundary(filters.dateFrom, false);
  const toMs = parseDateBoundary(filters.dateTo, true);

  const examById = new Map(input.exams.map((e) => [e.id, e]));
  const sessionById = new Map(input.sessions.map((s) => [s.id, s]));
  const reviewCaseBySession = new Map<string, ReviewCaseView>();
  for (const rc of input.reviewCases) {
    reviewCaseBySession.set(rc.sessionId, rc);
  }

  const eventsBySession = new Map<string, ProctorEventView[]>();
  for (const ev of input.proctorEvents) {
    const arr = eventsBySession.get(ev.sessionId) || [];
    arr.push(ev);
    eventsBySession.set(ev.sessionId, arr);
  }

  const actionsByCase = new Map<string, ReviewActionHistoryEntry[]>();
  for (const act of input.reviewActions) {
    const arr = actionsByCase.get(act.reviewCaseId) || [];
    arr.push(act);
    actionsByCase.set(act.reviewCaseId, arr);
  }

  // Filter events first using event-level filters + structural hierarchy filters
  const filteredEvents = input.proctorEvents.filter((ev) => {
    const session = sessionById.get(ev.sessionId);
    const exam = examById.get(ev.examId);
    const dept = session?.departmentCode || exam?.departmentCode || 'GENERAL';
    const courseId = session?.courseId || exam?.courseId || '';

    if (filters.department && dept !== filters.department) return false;
    if (filters.courseId && courseId !== filters.courseId) return false;
    if (filters.examId && ev.examId !== filters.examId) return false;
    if (filters.studentId && session?.studentId !== filters.studentId) return false;
    if (filters.eventType && ev.eventType !== filters.eventType) return false;
    if (!withinDateRange(ev.occurredAt || ev.createdAt, fromMs, toMs)) return false;

    if (filters.reviewStatus) {
      const caseStatus = reviewCaseBySession.get(ev.sessionId)?.status ?? 'no_case';
      if (ev.reviewStatus !== filters.reviewStatus && caseStatus !== filters.reviewStatus) {
        return false;
      }
    }
    return true;
  });

  // Filter sessions consistently against all 8 criteria
  const filteredSessions = input.sessions.filter((s) => {
    const sessEvents = eventsBySession.get(s.id) || [];
    const caseStatus = reviewCaseBySession.get(s.id)?.status ?? 'no_case';

    if (filters.department && s.departmentCode !== filters.department) return false;
    if (filters.courseId && s.courseId !== filters.courseId) return false;
    if (filters.examId && s.examId !== filters.examId) return false;
    if (filters.studentId && s.studentId !== filters.studentId) return false;
    if (!withinDateRange(s.startedAt || s.createdAt, fromMs, toMs)) return false;
    if (filters.eventType && !sessEvents.some((ev) => ev.eventType === filters.eventType)) {
      return false;
    }
    if (
      !matchesReviewStatusFilter({
        filterStatus: filters.reviewStatus,
        caseStatus,
        sessionEvents: sessEvents,
      })
    ) {
      return false;
    }
    return true;
  });

  // 1. Individual Candidate Report
  const individualCandidate: IndividualCandidateReportRow[] = filteredSessions.map((s) => {
    const allSessEvents = eventsBySession.get(s.id) || [];
    const matchingEvents = filters.eventType
      ? allSessEvents.filter((ev) => ev.eventType === filters.eventType)
      : allSessEvents;
    const rc = reviewCaseBySession.get(s.id);
    const progressPercent =
      s.totalQuestionCount > 0
        ? Math.round((s.answeredCount / s.totalQuestionCount) * 100)
        : 0;

    return {
      sessionId: s.id,
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      universityName: input.universityName,
      departmentCode: s.departmentCode,
      courseCode: s.courseCode,
      examId: s.examId,
      examTitle: s.examTitle,
      sessionStatus: s.status,
      progressPercent,
      score: s.score,
      trustScore: s.trustScore,
      riskCategory: s.riskCategory,
      reviewStatus: rc?.status ?? 'no_case',
      totalEvents: matchingEvents.length,
      aiDetectionEvents: matchingEvents.filter((e) => e.eventOrigin === 'ai_detection').length,
      browserEvents: matchingEvents.filter((e) => e.eventOrigin === 'browser_telemetry').length,
      simulatedEvents: matchingEvents.filter((e) => e.isSimulated || e.eventOrigin === 'simulated_demo').length,
      cameraConnected: deriveHardwareConnectionStatus(s.hardwareStatus, 'camera') === 'connected',
      microphoneConnected:
        deriveHardwareConnectionStatus(s.hardwareStatus, 'microphone') === 'connected',
      startedAt: s.startedAt,
      submittedAt: s.submittedAt,
    };
  });

  // 2. Examination-Level Report
  const filteredExams = input.exams.filter((e) => {
    if (filters.department && e.departmentCode !== filters.department) return false;
    if (filters.courseId && e.courseId !== filters.courseId) return false;
    if (filters.examId && e.id !== filters.examId) return false;
    // When student/event/review/date filters are narrow, keep exams that either have matching sessions or fall in range
    const hasScopedNarrowFilter = Boolean(
      filters.studentId || filters.eventType || filters.reviewStatus || fromMs !== null || toMs !== null
    );
    if (hasScopedNarrowFilter) {
      return (
        filteredSessions.some((s) => s.examId === e.id) ||
        (!filters.studentId &&
          !filters.eventType &&
          !filters.reviewStatus &&
          withinDateRange(e.startTime, fromMs, toMs))
      );
    }
    return true;
  });

  const examinationLevel: ExaminationLevelReportRow[] = filteredExams.map((e) => {
    const examSessions = filteredSessions.filter((s) => s.examId === e.id);
    const examEvents = filteredEvents.filter((ev) => ev.examId === e.id);
    const gradedOrScored = examSessions.filter((s) => s.score !== null);
    const submittedCount = examSessions.filter(
      (s) => s.status === 'submitted' || s.status === 'graded' || s.status === 'under_review'
    ).length;

    const avgScore =
      gradedOrScored.length > 0
        ? Number(
            (
              gradedOrScored.reduce((acc, s) => acc + Number(s.score || 0), 0) /
              gradedOrScored.length
            ).toFixed(1)
          )
        : null;

    const avgTrust =
      examSessions.length > 0
        ? Math.round(
            examSessions.reduce((acc, s) => acc + s.trustScore, 0) / examSessions.length
          )
        : 100;

    return {
      examId: e.id,
      examTitle: e.title,
      universityName: input.universityName,
      departmentCode: e.departmentCode,
      courseCode: e.courseCode,
      courseName: e.courseName,
      examStatus: e.status,
      totalSessions: examSessions.length,
      submittedCount,
      averageScore: avgScore,
      averageTrustScore: avgTrust,
      priorityReviewCount: examSessions.filter((s) => s.riskCategory === 'PRIORITY_REVIEW').length,
      reviewSuggestedCount: examSessions.filter((s) => s.riskCategory === 'REVIEW_SUGGESTED').length,
      totalEvents: examEvents.length,
      startTime: e.startTime,
      endTime: e.endTime,
    };
  });

  // 3. University Activity Report (grouped by department inside active university)
  const deptCodesSet = new Set<string>();
  for (const c of input.courses) {
    const dept = deriveDepartmentCode(c.code);
    if (!filters.department || dept === filters.department) {
      if (!filters.courseId || c.id === filters.courseId) {
        deptCodesSet.add(dept);
      }
    }
  }
  if (deptCodesSet.size === 0 && (!filters.department || filters.department === 'GENERAL')) {
    deptCodesSet.add(filters.department || 'GENERAL');
  }

  const filteredAuditCount = input.auditLogs.filter((a) =>
    withinDateRange(a.createdAt, fromMs, toMs)
  ).length;

  const universityActivity: UniversityActivityReportRow[] = Array.from(deptCodesSet)
    .sort()
    .map((deptCode) => {
      const deptCourses = input.courses.filter(
        (c) => deriveDepartmentCode(c.code) === deptCode && (!filters.courseId || c.id === filters.courseId)
      );
      const deptExams = filteredExams.filter((e) => e.departmentCode === deptCode);
      const deptSessions = filteredSessions.filter((s) => s.departmentCode === deptCode);
      const deptSessionIds = new Set(deptSessions.map((s) => s.id));
      const deptEvents = filteredEvents.filter((ev) => deptSessionIds.has(ev.sessionId));
      const deptReviewActions = input.reviewActions.filter(
        (ra) => deptSessionIds.has(ra.sessionId) && withinDateRange(ra.createdAt, fromMs, toMs)
      ).length;

      return {
        universityId: input.universityId,
        universityName: input.universityName,
        departmentCode: deptCode,
        coursesCount: deptCourses.length,
        examinationsCount: deptExams.length,
        totalSessions: deptSessions.length,
        completedSessions: deptSessions.filter(
          (s) => s.status === 'submitted' || s.status === 'graded'
        ).length,
        activeSessions: deptSessions.filter((s) => s.status === 'in_progress').length,
        totalEvents: deptEvents.length,
        reviewActionsCount: deptReviewActions,
        auditActionsCount: filteredAuditCount,
      };
    });

  // 4. Event Frequency Report
  const freqMap = new Map<
    string,
    {
      eventType: string;
      sourceModule: string;
      eventOrigin: EventOrigin;
      occurrences: number;
      sessions: Set<string>;
      totalDurationMs: number;
      highOrCriticalCount: number;
      pendingReviewCount: number;
      flaggedCount: number;
      dismissedOrClearedCount: number;
      simulatedCount: number;
    }
  >();

  for (const ev of filteredEvents) {
    const key = `${ev.eventType}::${ev.sourceModule}::${ev.eventOrigin}`;
    const existing = freqMap.get(key) || {
      eventType: ev.eventType,
      sourceModule: ev.sourceModule,
      eventOrigin: ev.eventOrigin,
      occurrences: 0,
      sessions: new Set<string>(),
      totalDurationMs: 0,
      highOrCriticalCount: 0,
      pendingReviewCount: 0,
      flaggedCount: 0,
      dismissedOrClearedCount: 0,
      simulatedCount: 0,
    };

    existing.occurrences += 1;
    existing.sessions.add(ev.sessionId);
    existing.totalDurationMs += ev.durationMs ?? 0;
    if (ev.severity === 'high' || ev.severity === 'critical') existing.highOrCriticalCount += 1;
    if (ev.reviewStatus === 'pending_review') existing.pendingReviewCount += 1;
    if (ev.reviewStatus === 'flagged') existing.flaggedCount += 1;
    if (ev.reviewStatus === 'dismissed' || ev.reviewStatus === 'cleared') {
      existing.dismissedOrClearedCount += 1;
    }
    if (ev.isSimulated || ev.eventOrigin === 'simulated_demo') existing.simulatedCount += 1;

    freqMap.set(key, existing);
  }

  const eventFrequency: EventFrequencyReportRow[] = Array.from(freqMap.values())
    .map((item) => {
      const totalDurationSeconds = Number((item.totalDurationMs / 1000).toFixed(1));
      const averageDurationSeconds =
        item.occurrences > 0 ? Number((totalDurationSeconds / item.occurrences).toFixed(1)) : 0;
      return {
        eventType: item.eventType,
        sourceModule: item.sourceModule,
        eventOrigin: item.eventOrigin,
        occurrences: item.occurrences,
        uniqueSessions: item.sessions.size,
        totalDurationSeconds,
        averageDurationSeconds,
        highOrCriticalCount: item.highOrCriticalCount,
        pendingReviewCount: item.pendingReviewCount,
        flaggedCount: item.flaggedCount,
        dismissedOrClearedCount: item.dismissedOrClearedCount,
        simulatedCount: item.simulatedCount,
      };
    })
    .sort((a, b) => b.occurrences - a.occurrences);

  // 5. Monitoring Status Report
  const monitoringStatus: MonitoringStatusReportRow[] = filteredSessions.map((s) => {
    const sessEvents = eventsBySession.get(s.id) || [];
    const camStatus = deriveHardwareConnectionStatus(s.hardwareStatus, 'camera');
    const micStatus = deriveHardwareConnectionStatus(s.hardwareStatus, 'microphone');
    const browserInterruptions = sessEvents.filter(
      (ev) =>
        ev.eventType === 'TAB_HIDDEN' ||
        ev.eventType === 'TAB_SWITCH' ||
        ev.eventType === 'FULLSCREEN_EXIT' ||
        ev.eventType === 'WINDOW_BLUR' ||
        ev.eventType === 'SESSION_CONNECTION_INTERRUPTED'
    ).length;
    const deviceDisconnects = sessEvents.filter(
      (ev) =>
        ev.eventType === 'CAMERA_DISCONNECTED' ||
        ev.eventType === 'CAMERA_PERMISSION_DENIED' ||
        ev.eventType === 'MICROPHONE_DISCONNECTED' ||
        ev.eventType === 'MICROPHONE_PERMISSION_DENIED'
    ).length;

    let monitoringHealth: MonitoringStatusReportRow['monitoringHealth'] = 'Healthy';
    if (camStatus === 'disconnected' || deviceDisconnects > 0) {
      monitoringHealth = 'Attention Needed';
    } else if (micStatus === 'disconnected' || browserInterruptions >= 2) {
      monitoringHealth = 'Degraded';
    }

    const latestEventIso =
      sessEvents.length > 0
        ? sessEvents
            .map((e) => e.occurredAt || e.createdAt)
            .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
        : null;

    return {
      sessionId: s.id,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      universityName: input.universityName,
      departmentCode: s.departmentCode,
      courseCode: s.courseCode,
      examTitle: s.examTitle,
      sessionStatus: s.status,
      cameraStatus: camStatus,
      microphoneStatus: micStatus,
      browserInterruptionCount: browserInterruptions,
      deviceDisconnectionCount: deviceDisconnects,
      monitoringHealth,
      lastEventAt: latestEventIso ?? null,
    };
  });

  // 6. Review Outcome Report
  const filteredSessionIds = new Set(filteredSessions.map((s) => s.id));
  const reviewOutcome: ReviewOutcomeReportRow[] = input.reviewCases
    .filter((rc) => {
      if (!filteredSessionIds.has(rc.sessionId)) return false;
      if (!withinDateRange(rc.createdAt, fromMs, toMs)) return false;
      if (filters.reviewStatus && rc.status !== filters.reviewStatus) {
        const sessEvents = eventsBySession.get(rc.sessionId) || [];
        if (!sessEvents.some((ev) => ev.reviewStatus === filters.reviewStatus)) {
          return false;
        }
      }
      return true;
    })
    .map((rc) => {
      const session = sessionById.get(rc.sessionId);
      const caseActions = (actionsByCase.get(rc.id) || []).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
      const latestAction = caseActions[0] || null;
      return {
        reviewCaseId: rc.id,
        sessionId: rc.sessionId,
        studentName: session?.studentName || rc.studentName,
        studentEmail: session?.studentEmail || rc.studentEmail,
        universityName: input.universityName,
        departmentCode: session?.departmentCode || deriveDepartmentCode(rc.courseCode),
        courseCode: session?.courseCode || rc.courseCode,
        examTitle: session?.examTitle || rc.examTitle,
        reviewStatus: rc.status,
        priority: rc.priority,
        riskCategory: rc.riskCategory,
        trustScore: rc.trustScore,
        totalEvents: rc.events.length,
        actionsTakenCount: caseActions.length,
        latestActionType: latestAction?.actionType ?? null,
        latestActionMessage: latestAction?.message ?? rc.summary ?? null,
        createdAt: rc.createdAt,
        reviewedAt: rc.reviewedAt,
      };
    });

  // 7. Examination Submission Report
  const examinationSubmission: ExaminationSubmissionReportRow[] = filteredSessions.map((s) => {
    const scorePercent =
      s.score !== null && s.totalPoints > 0
        ? Number(((s.score / s.totalPoints) * 100).toFixed(1))
        : null;

    let outcome: ExaminationSubmissionReportRow['outcome'] = 'In Progress';
    if (s.status === 'terminated') {
      outcome = 'Terminated';
    } else if (s.score !== null) {
      outcome = s.score >= s.passingMarks ? 'Passed' : 'Below Passing';
    } else if (s.status === 'submitted' || s.status === 'under_review') {
      outcome = 'Pending Grading';
    }

    const durationMinutes =
      s.startedAt && s.submittedAt
        ? Math.max(0, Math.round((Date.parse(s.submittedAt) - Date.parse(s.startedAt)) / 60000))
        : null;

    return {
      sessionId: s.id,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      universityName: input.universityName,
      departmentCode: s.departmentCode,
      courseCode: s.courseCode,
      examTitle: s.examTitle,
      sessionStatus: s.status,
      answeredCount: s.answeredCount,
      totalQuestions: s.totalQuestionCount,
      rawScore: s.score,
      totalPoints: s.totalPoints,
      scorePercent,
      passingMarks: s.passingMarks,
      outcome,
      startedAt: s.startedAt,
      submittedAt: s.submittedAt,
      durationMinutes,
    };
  });

  // Options metadata from full accessible tenant data
  const departmentSet = new Set<string>(input.courses.map((c) => deriveDepartmentCode(c.code)));
  const studentMap = new Map<string, { id: string; fullName: string; email: string }>();
  for (const s of input.sessions) {
    if (!studentMap.has(s.studentId)) {
      studentMap.set(s.studentId, {
        id: s.studentId,
        fullName: s.studentName,
        email: s.studentEmail,
      });
    }
  }
  const eventTypeSet = new Set<string>(input.proctorEvents.map((ev) => ev.eventType));

  const options: ReportFilterOptions = {
    universities: input.universities,
    departments: Array.from(departmentSet).sort(),
    courses: input.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      departmentCode: deriveDepartmentCode(c.code),
    })),
    exams: input.exams.map((e) => ({
      id: e.id,
      title: e.title,
      courseId: e.courseId,
      courseCode: e.courseCode,
      departmentCode: e.departmentCode,
    })),
    students: Array.from(studentMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    eventTypes: Array.from(eventTypeSet).sort(),
    reviewStatuses: [
      'pending',
      'in_review',
      'flagged',
      'escalated',
      'cleared',
      'pending_review',
      'acknowledged',
      'dismissed',
    ],
  };

  const averageTrustScore =
    filteredSessions.length > 0
      ? Math.round(
          filteredSessions.reduce((acc, s) => acc + s.trustScore, 0) / filteredSessions.length
        )
      : 100;

  return {
    generatedAt: new Date().toISOString(),
    activeUniversityId: input.universityId,
    activeUniversityName: input.universityName,
    appliedFilters: filters,
    options,
    summary: {
      totalCandidates: new Set(filteredSessions.map((s) => s.studentId)).size,
      totalExams: filteredExams.length,
      totalSessions: filteredSessions.length,
      totalEvents: filteredEvents.length,
      priorityReviewSessions: filteredSessions.filter((s) => s.riskCategory === 'PRIORITY_REVIEW')
        .length,
      submittedSessions: filteredSessions.filter(
        (s) => s.status === 'submitted' || s.status === 'graded' || s.status === 'under_review'
      ).length,
      averageTrustScore,
    },
    reports: {
      individual_candidate: individualCandidate,
      examination_level: examinationLevel,
      university_activity: universityActivity,
      event_frequency: eventFrequency,
      monitoring_status: monitoringStatus,
      review_outcome: reviewOutcome,
      examination_submission: examinationSubmission,
    },
  };
}

export { escapeCsvCell, buildCsvDocument };

export function serializeReportToCsv(
  reportType: ReportType,
  suite: ReportSuitePayload
): { filename: string; csv: string; rowCount: number } {
  const dateStamp = suite.generatedAt.slice(0, 10);

  switch (reportType) {
    case 'individual_candidate': {
      const rows = suite.reports.individual_candidate;
      return {
        filename: `examguard-individual-candidate-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'Session ID',
            'Student Name',
            'Student Email',
            'University',
            'Department',
            'Course',
            'Examination',
            'Session Status',
            'Progress (%)',
            'Score',
            'Trust Score (%)',
            'Risk Category',
            'Review Status',
            'Total Events',
            'AI Events',
            'Browser Events',
            'Simulated Events',
            'Camera Connected',
            'Mic Connected',
            'Started At',
            'Submitted At',
          ],
          rows.map((r) => [
            r.sessionId,
            r.studentName,
            r.studentEmail,
            r.universityName,
            r.departmentCode,
            r.courseCode,
            r.examTitle,
            r.sessionStatus,
            r.progressPercent,
            r.score ?? 'Pending',
            r.trustScore,
            r.riskCategory,
            r.reviewStatus,
            r.totalEvents,
            r.aiDetectionEvents,
            r.browserEvents,
            r.simulatedEvents,
            r.cameraConnected ? 'Yes' : 'No',
            r.microphoneConnected ? 'Yes' : 'No',
            r.startedAt ?? '',
            r.submittedAt ?? '',
          ])
        ),
      };
    }

    case 'examination_level': {
      const rows = suite.reports.examination_level;
      return {
        filename: `examguard-examination-level-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'Exam ID',
            'Examination Title',
            'University',
            'Department',
            'Course Code',
            'Course Name',
            'Status',
            'Total Sessions',
            'Submitted Sessions',
            'Average Score',
            'Average Trust Score (%)',
            'Priority Review Sessions',
            'Review Suggested Sessions',
            'Total Events',
            'Start Time',
            'End Time',
          ],
          rows.map((r) => [
            r.examId,
            r.examTitle,
            r.universityName,
            r.departmentCode,
            r.courseCode,
            r.courseName,
            r.examStatus,
            r.totalSessions,
            r.submittedCount,
            r.averageScore ?? 'N/A',
            r.averageTrustScore,
            r.priorityReviewCount,
            r.reviewSuggestedCount,
            r.totalEvents,
            r.startTime,
            r.endTime,
          ])
        ),
      };
    }

    case 'university_activity': {
      const rows = suite.reports.university_activity;
      return {
        filename: `examguard-university-activity-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'University ID',
            'University',
            'Department',
            'Courses',
            'Examinations',
            'Total Sessions',
            'Completed Sessions',
            'Active Sessions',
            'Monitoring Events',
            'Review Actions',
            'Audit Log Actions',
          ],
          rows.map((r) => [
            r.universityId,
            r.universityName,
            r.departmentCode,
            r.coursesCount,
            r.examinationsCount,
            r.totalSessions,
            r.completedSessions,
            r.activeSessions,
            r.totalEvents,
            r.reviewActionsCount,
            r.auditActionsCount,
          ])
        ),
      };
    }

    case 'event_frequency': {
      const rows = suite.reports.event_frequency;
      return {
        filename: `examguard-event-frequency-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'Event Type',
            'Source Module',
            'Origin',
            'Occurrences',
            'Unique Sessions',
            'Total Duration (s)',
            'Avg Duration (s)',
            'High/Critical Count',
            'Pending Review',
            'Flagged',
            'Dismissed/Cleared',
            'Simulated Demo Count',
          ],
          rows.map((r) => [
            r.eventType,
            r.sourceModule,
            r.eventOrigin,
            r.occurrences,
            r.uniqueSessions,
            r.totalDurationSeconds,
            r.averageDurationSeconds,
            r.highOrCriticalCount,
            r.pendingReviewCount,
            r.flaggedCount,
            r.dismissedOrClearedCount,
            r.simulatedCount,
          ])
        ),
      };
    }

    case 'monitoring_status': {
      const rows = suite.reports.monitoring_status;
      return {
        filename: `examguard-monitoring-status-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'Session ID',
            'Student Name',
            'Student Email',
            'University',
            'Department',
            'Course',
            'Examination',
            'Session Status',
            'Camera Status',
            'Microphone Status',
            'Browser Interruptions',
            'Device Disconnections',
            'Monitoring Health',
            'Last Telemetry Event',
          ],
          rows.map((r) => [
            r.sessionId,
            r.studentName,
            r.studentEmail,
            r.universityName,
            r.departmentCode,
            r.courseCode,
            r.examTitle,
            r.sessionStatus,
            r.cameraStatus,
            r.microphoneStatus,
            r.browserInterruptionCount,
            r.deviceDisconnectionCount,
            r.monitoringHealth,
            r.lastEventAt ?? '',
          ])
        ),
      };
    }

    case 'review_outcome': {
      const rows = suite.reports.review_outcome;
      return {
        filename: `examguard-review-outcome-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'Review Case ID',
            'Session ID',
            'Student Name',
            'Student Email',
            'University',
            'Department',
            'Course',
            'Examination',
            'Review Status',
            'Priority',
            'Risk Category',
            'Trust Score (%)',
            'Events Count',
            'Actions Taken',
            'Latest Action Type',
            'Latest Action Note',
            'Created At',
            'Reviewed At',
          ],
          rows.map((r) => [
            r.reviewCaseId,
            r.sessionId,
            r.studentName,
            r.studentEmail,
            r.universityName,
            r.departmentCode,
            r.courseCode,
            r.examTitle,
            r.reviewStatus,
            r.priority,
            r.riskCategory,
            r.trustScore,
            r.totalEvents,
            r.actionsTakenCount,
            r.latestActionType ?? '',
            r.latestActionMessage ?? '',
            r.createdAt,
            r.reviewedAt ?? '',
          ])
        ),
      };
    }

    case 'examination_submission': {
      const rows = suite.reports.examination_submission;
      return {
        filename: `examguard-examination-submission-${dateStamp}.csv`,
        rowCount: rows.length,
        csv: buildCsvDocument(
          [
            'Session ID',
            'Student Name',
            'Student Email',
            'University',
            'Department',
            'Course',
            'Examination',
            'Session Status',
            'Answered Questions',
            'Total Questions',
            'Raw Score',
            'Total Points',
            'Score (%)',
            'Passing Marks',
            'Outcome',
            'Duration (min)',
            'Started At',
            'Submitted At',
          ],
          rows.map((r) => [
            r.sessionId,
            r.studentName,
            r.studentEmail,
            r.universityName,
            r.departmentCode,
            r.courseCode,
            r.examTitle,
            r.sessionStatus,
            r.answeredCount,
            r.totalQuestions,
            r.rawScore ?? 'Pending',
            r.totalPoints,
            r.scorePercent ?? 'Pending',
            r.passingMarks,
            r.outcome,
            r.durationMinutes ?? '',
            r.startedAt ?? '',
            r.submittedAt ?? '',
          ])
        ),
      };
    }
  }
}

async function resolveAuthorizedStaffContext(requestedUniversityId?: string | null): Promise<{
  userId: string;
  tenantId: string;
  tenantName: string;
  roles: UserRole[];
  universities: Array<{ id: string; name: string; slug: string }>;
}> {
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
    throw new Error(`Failed to verify institutional permissions: ${memError.message}`);
  }

  const allowedStaffRoles: UserRole[] = ['admin', 'invigilator', 'instructor'];
  const staffRows = ((memberships || []) as { tenant_id: string; role: UserRole }[]).filter((m) =>
    allowedStaffRoles.includes(m.role)
  );

  const firstStaff = staffRows[0];
  if (!firstStaff) {
    throw new Error('Forbidden: Staff reporting requires admin, invigilator, or instructor role.');
  }

  const staffTenantIds = Array.from(new Set(staffRows.map((m) => m.tenant_id)));
  const targetTenantId =
    requestedUniversityId && requestedUniversityId.trim().length > 0
      ? requestedUniversityId.trim()
      : firstStaff.tenant_id;

  if (!staffTenantIds.includes(targetTenantId)) {
    throw new Error('Forbidden: You do not hold staff permissions for the selected university.');
  }

  const { data: tenantRows } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .in('id', staffTenantIds)
    .order('name', { ascending: true });

  const universities = (tenantRows || []) as Array<{ id: string; name: string; slug: string }>;
  const activeUniversity = universities.find((t) => t.id === targetTenantId) || {
    id: targetTenantId,
    name: 'University Tenant',
    slug: 'university',
  };

  return {
    userId: user.id,
    tenantId: targetTenantId,
    tenantName: activeUniversity.name,
    roles: staffRows.filter((m) => m.tenant_id === targetTenantId).map((m) => m.role),
    universities,
  };
}

export class ReportingService {
  static async generateReportSuite(filters: ReportFilterParams): Promise<ReportSuitePayload> {
    const ctx = await resolveAuthorizedStaffContext(filters.universityId);
    const isAdminOrInvigilator =
      ctx.roles.includes('admin') || ctx.roles.includes('invigilator');

    let courseQuery = supabaseAdmin
      .from('courses')
      .select('id, tenant_id, instructor_id, code, name')
      .eq('tenant_id', ctx.tenantId)
      .order('code', { ascending: true });

    if (!isAdminOrInvigilator && ctx.roles.includes('instructor')) {
      courseQuery = courseQuery.eq('instructor_id', ctx.userId);
    }

    const { data: rawCourses, error: courseErr } = await courseQuery;
    if (courseErr) {
      throw new Error(`Failed to fetch courses for report: ${courseErr.message}`);
    }

    const courseRows = (rawCourses || []) as {
      id: string;
      tenant_id: string;
      instructor_id: string;
      code: string;
      name: string;
    }[];
    const courseIds = courseRows.map((c) => c.id);
    const courseMap = new Map(courseRows.map((c) => [c.id, c]));

    let examRows: {
      id: string;
      course_id: string;
      tenant_id: string;
      title: string;
      status: ExamStatus;
      total_points: number;
      passing_marks: number;
      start_time: string;
      end_time: string;
    }[] = [];

    if (courseIds.length > 0) {
      const { data: rawExams } = await supabaseAdmin
        .from('exams')
        .select(
          'id, course_id, tenant_id, title, status, total_points, passing_marks, start_time, end_time'
        )
        .eq('tenant_id', ctx.tenantId)
        .in('course_id', courseIds)
        .order('start_time', { ascending: false });

      examRows = (rawExams || []) as typeof examRows;
    }

    const examIds = examRows.map((e) => e.id);
    const examMap = new Map(examRows.map((e) => [e.id, e]));

    const [questionsRes, sessionsRes, auditRes] = await Promise.all([
      examIds.length > 0
        ? supabaseAdmin.from('questions').select('id, exam_id').in('exam_id', examIds)
        : Promise.resolve({ data: [] as { id: string; exam_id: string }[] }),
      examIds.length > 0
        ? supabaseAdmin
            .from('exam_sessions')
            .select(
              'id, exam_id, tenant_id, student_id, status, started_at, submitted_at, score, trust_score, hardware_status, created_at'
            )
            .eq('tenant_id', ctx.tenantId)
            .in('exam_id', examIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({
            data: [] as {
              id: string;
              exam_id: string;
              tenant_id: string;
              student_id: string;
              status: SessionStatus;
              started_at: string | null;
              submitted_at: string | null;
              score: number | null;
              trust_score: number;
              hardware_status: Record<string, unknown> | null;
              created_at: string;
            }[],
          }),
      supabaseAdmin
        .from('audit_logs')
        .select('id, tenant_id, created_at')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const questionRows = (questionsRes.data || []) as { id: string; exam_id: string }[];
    const questionCountByExam = new Map<string, number>();
    for (const q of questionRows) {
      questionCountByExam.set(q.exam_id, (questionCountByExam.get(q.exam_id) || 0) + 1);
    }

    const sessionRows = (sessionsRes.data || []) as {
      id: string;
      exam_id: string;
      tenant_id: string;
      student_id: string;
      status: SessionStatus;
      started_at: string | null;
      submitted_at: string | null;
      score: number | null;
      trust_score: number;
      hardware_status: Record<string, unknown> | null;
      created_at: string;
    }[];
    const sessionIds = sessionRows.map((s) => s.id);
    const sessionMap = new Map(sessionRows.map((s) => [s.id, s]));

    const [answersRes, eventsRes, casesRes, actionsRes] =
      sessionIds.length > 0
        ? await Promise.all([
            supabaseAdmin
              .from('session_answers')
              .select('session_id')
              .in('session_id', sessionIds),
            supabaseAdmin
              .from('proctor_events')
              .select('id, session_id, tenant_id, event_type, severity, confidence, details, created_at')
              .eq('tenant_id', ctx.tenantId)
              .in('session_id', sessionIds)
              .order('created_at', { ascending: false })
              .limit(2500),
            supabaseAdmin
              .from('review_cases')
              .select(
                'id, tenant_id, session_id, status, priority, summary, assigned_to, created_at, reviewed_at'
              )
              .eq('tenant_id', ctx.tenantId)
              .in('session_id', sessionIds)
              .order('created_at', { ascending: false }),
            supabaseAdmin
              .from('review_actions')
              .select('id, review_case_id, session_id, reviewer_id, action_type, message, created_at')
              .in('session_id', sessionIds)
              .order('created_at', { ascending: false }),
          ])
        : [
            { data: [] as { session_id: string }[] },
            { data: [] as RawProctorEventRow[] },
            {
              data: [] as {
                id: string;
                tenant_id: string;
                session_id: string;
                status: ReviewStatus;
                priority: number;
                summary: string | null;
                assigned_to: string | null;
                created_at: string;
                reviewed_at: string | null;
              }[],
            },
            {
              data: [] as {
                id: string;
                review_case_id: string;
                session_id: string;
                reviewer_id: string;
                action_type: string;
                message: string;
                created_at: string;
              }[],
            },
          ];

    const answerRows = (answersRes.data || []) as { session_id: string }[];
    const answeredCountBySession = new Map<string, number>();
    for (const ans of answerRows) {
      answeredCountBySession.set(
        ans.session_id,
        (answeredCountBySession.get(ans.session_id) || 0) + 1
      );
    }

    const eventRows = (eventsRes.data || []) as RawProctorEventRow[];
    const caseRows = (casesRes.data || []) as {
      id: string;
      tenant_id: string;
      session_id: string;
      status: ReviewStatus;
      priority: number;
      summary: string | null;
      assigned_to: string | null;
      created_at: string;
      reviewed_at: string | null;
    }[];
    const reviewActionRows = (actionsRes.data || []) as {
      id: string;
      review_case_id: string;
      session_id: string;
      reviewer_id: string;
      action_type: string;
      message: string;
      created_at: string;
    }[];

    const profileIds = new Set<string>();
    for (const s of sessionRows) profileIds.add(s.student_id);
    for (const a of reviewActionRows) profileIds.add(a.reviewer_id);

    const profileMap = new Map<string, { fullName: string; email: string }>();
    if (profileIds.size > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(profileIds));

      for (const p of (profiles || []) as { id: string; full_name: string; email: string }[]) {
        profileMap.set(p.id, { fullName: p.full_name, email: p.email });
      }
    }

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
        eventType: canonical.eventType as ProctorEventView['eventType'],
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

    const assessmentBySession = new Map<
      string,
      ReturnType<typeof evaluateSessionRiskAndCorrelations>['assessment']
    >();
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

    const courses: ReportCourseInput[] = courseRows.map((c) => ({
      id: c.id,
      tenantId: c.tenant_id,
      code: c.code,
      name: c.name,
    }));

    const exams: ReportExamInput[] = examRows.map((e) => {
      const course = courseMap.get(e.course_id);
      const code = course?.code || 'COURSE';
      return {
        id: e.id,
        courseId: e.course_id,
        courseCode: code,
        courseName: course?.name || 'Course',
        departmentCode: deriveDepartmentCode(code),
        tenantId: e.tenant_id,
        title: e.title,
        status: e.status,
        totalPoints: e.total_points,
        passingMarks: e.passing_marks ?? 0,
        startTime: e.start_time,
        endTime: e.end_time,
        questionCount: questionCountByExam.get(e.id) || 0,
      };
    });

    const sessions: ReportSessionInput[] = sessionRows.map((s) => {
      const exam = examMap.get(s.exam_id);
      const course = exam ? courseMap.get(exam.course_id) : undefined;
      const student = profileMap.get(s.student_id);
      const assessment = assessmentBySession.get(s.id);
      const code = course?.code || 'COURSE';
      return {
        id: s.id,
        examId: s.exam_id,
        examTitle: exam?.title || 'Examination',
        courseId: exam?.course_id || '',
        courseCode: code,
        departmentCode: deriveDepartmentCode(code),
        studentId: s.student_id,
        studentName: student?.fullName || 'Candidate',
        studentEmail: student?.email || 'N/A',
        status: s.status,
        startedAt: s.started_at,
        submittedAt: s.submitted_at,
        createdAt: s.created_at,
        answeredCount: answeredCountBySession.get(s.id) || 0,
        totalQuestionCount: exam ? questionCountByExam.get(exam.id) || 0 : 0,
        score: s.score !== null ? Number(s.score) : null,
        totalPoints: exam?.total_points ?? 100,
        passingMarks: exam?.passing_marks ?? 0,
        trustScore: Number(s.trust_score ?? assessment?.trustScore ?? 100),
        riskCategory: assessment?.riskCategory ?? 'NORMAL',
        hardwareStatus: s.hardware_status || {},
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
      reviewerName: profileMap.get(a.reviewer_id)?.fullName || 'Reviewer',
      actionType: a.action_type as ReviewActionHistoryEntry['actionType'],
      message: a.message,
      createdAt: a.created_at,
    }));

    const auditLogs: ReportAuditInput[] = (
      (auditRes.data || []) as { id: string; tenant_id: string; created_at: string }[]
    ).map((a) => ({
      id: a.id,
      tenantId: a.tenant_id,
      createdAt: a.created_at,
    }));

    return computeReportSuite({
      universityId: ctx.tenantId,
      universityName: ctx.tenantName,
      universities: ctx.universities,
      courses,
      exams,
      sessions,
      proctorEvents,
      reviewCases,
      reviewActions,
      auditLogs,
      filters,
    });
  }

  static async logReportExport(params: {
    universityId: string;
    reportType: ReportType | 'audit_logs';
    filters: Record<string, unknown>;
    rowCount: number;
  }) {
    const ctx = await resolveAuthorizedStaffContext(params.universityId);
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      action: 'SETTINGS_CHANGED',
      entity_type: params.reportType === 'audit_logs' ? 'audit_log' : 'report',
      entity_id: null,
      details: {
        auditCategory:
          params.reportType === 'audit_logs' ? 'AUDIT_LOG_EXPORTED' : 'REPORT_EXPORTED',
        reportType: params.reportType,
        rowCount: params.rowCount,
        filters: params.filters,
      },
    });
  }

  static async getAdminAuditLogs(params: AdminAuditLogFilterParams): Promise<{
    logs: AuditLogView[];
    availableActions: AuditAction[];
  }> {
    const ctx = await resolveAuthorizedStaffContext(null);
    if (!ctx.roles.includes('admin')) {
      throw new Error('Forbidden: Administrative audit logs require admin role.');
    }

    const limit = Math.min(Math.max(params.limit ?? 200, 10), 500);
    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, details, created_at')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params.action && params.action !== 'all') {
      query = query.eq('action', params.action);
    }
    if (params.actorId) {
      query = query.eq('user_id', params.actorId);
    }
    if (params.entityType) {
      query = query.eq('entity_type', params.entityType);
    }

    const fromMs = parseDateBoundary(params.dateFrom, false);
    const toMs = parseDateBoundary(params.dateTo, true);
    if (fromMs !== null) {
      query = query.gte('created_at', new Date(fromMs).toISOString());
    }
    if (toMs !== null) {
      query = query.lte('created_at', new Date(toMs).toISOString());
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    const rawRows = (data || []) as {
      id: string;
      user_id: string | null;
      action: AuditAction;
      entity_type: string | null;
      entity_id: string | null;
      details: Record<string, unknown> | null;
      created_at: string;
    }[];

    const actorIds = Array.from(
      new Set(rawRows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))
    );
    const profileMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', actorIds);
      for (const p of (profiles || []) as { id: string; full_name: string; email: string }[]) {
        profileMap.set(p.id, `${p.full_name} (${p.email})`);
      }
    }

    const search = params.search?.trim().toLowerCase() || '';
    const logs: AuditLogView[] = rawRows
      .map((r) => ({
        id: r.id,
        userId: r.user_id,
        actorName: (r.user_id && profileMap.get(r.user_id)) || 'System',
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details || {},
        createdAt: r.created_at,
      }))
      .filter((log) => {
        if (!search) return true;
        return (
          log.action.toLowerCase().includes(search) ||
          log.actorName.toLowerCase().includes(search) ||
          (log.entityType || '').toLowerCase().includes(search) ||
          JSON.stringify(log.details).toLowerCase().includes(search)
        );
      });

    const availableActions = Array.from(new Set(rawRows.map((r) => r.action))).sort() as AuditAction[];
    return { logs, availableActions };
  }
}

export function parseReportFiltersFromSearchParams(
  params: URLSearchParams
): ReportFilterParams {
  const clean = (key: string): string | null => {
    const val = params.get(key)?.trim();
    return val && val !== 'all' ? val : null;
  };
  return {
    universityId: clean('universityId'),
    department: clean('department'),
    courseId: clean('courseId'),
    examId: clean('examId'),
    studentId: clean('studentId'),
    dateFrom: clean('dateFrom'),
    dateTo: clean('dateTo'),
    eventType: clean('eventType'),
    reviewStatus: clean('reviewStatus'),
  };
}

export function serializeAuditLogsToCsv(logs: AuditLogView[]): {
  filename: string;
  csv: string;
  rowCount: number;
} {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `examguard-audit-logs-${dateStamp}.csv`,
    rowCount: logs.length,
    csv: buildCsvDocument(
      ['Audit ID', 'Timestamp', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'Details JSON'],
      logs.map((l) => [
        l.id,
        l.createdAt,
        l.action,
        l.actorName,
        l.entityType ?? 'system',
        l.entityId ?? '',
        JSON.stringify(l.details ?? {}),
      ])
    ),
  };
}
