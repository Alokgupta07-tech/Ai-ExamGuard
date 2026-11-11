import type { StatusTone } from '@/components/shared/status-badge';
import type { TimelineSeverity } from '@/components/shared/event-timeline';
import type { EventSeverity, ExamStatus, ReviewStatus, SessionStatus, UserRole } from '@/types/database';
import type { EventOrigin, EventReviewStatus, RiskCategory } from '@/types/proctoring';

export function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRoleTone(role: UserRole): StatusTone {
  switch (role) {
    case 'admin':
      return 'cyan';
    case 'instructor':
      return 'teal';
    case 'invigilator':
      return 'purple';
    case 'student':
    default:
      return 'success';
  }
}

export function getExamStatusTone(status: ExamStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'published':
      return 'cyan';
    case 'completed':
      return 'teal';
    case 'archived':
      return 'neutral';
    case 'draft':
    default:
      return 'warning';
  }
}

export function getSessionStatusTone(status: SessionStatus): StatusTone {
  switch (status) {
    case 'in_progress':
      return 'cyan';
    case 'graded':
    case 'submitted':
      return 'success';
    case 'under_review':
      return 'warning';
    case 'terminated':
      return 'critical';
    case 'not_started':
    default:
      return 'neutral';
  }
}

export function getReviewStatusTone(status: ReviewStatus): StatusTone {
  switch (status) {
    case 'cleared':
      return 'success';
    case 'in_review':
      return 'cyan';
    case 'flagged':
    case 'pending':
      return 'warning';
    case 'escalated':
      return 'critical';
    default:
      return 'neutral';
  }
}

export function getRiskCategoryTone(category: RiskCategory): StatusTone {
  switch (category) {
    case 'PRIORITY_REVIEW':
      return 'critical';
    case 'REVIEW_SUGGESTED':
      return 'warning';
    case 'NORMAL':
    default:
      return 'success';
  }
}

export function formatRiskCategoryLabel(category: RiskCategory): string {
  switch (category) {
    case 'PRIORITY_REVIEW':
      return 'PRIORITY REVIEW';
    case 'REVIEW_SUGGESTED':
      return 'REVIEW SUGGESTED';
    case 'NORMAL':
    default:
      return 'NORMAL';
  }
}

export function getEventOriginMeta(
  origin: EventOrigin | undefined,
  isSimulated?: boolean
): { label: string; tone: StatusTone } {
  if (isSimulated || origin === 'simulated_demo') {
    return { label: 'Simulated Demo', tone: 'purple' };
  }
  if (origin === 'ai_detection') {
    return { label: 'Live AI Detection', tone: 'info' };
  }
  return { label: 'Browser Telemetry', tone: 'teal' };
}

export function getEventReviewStatusTone(status: EventReviewStatus): StatusTone {
  switch (status) {
    case 'dismissed':
    case 'cleared':
      return 'neutral';
    case 'acknowledged':
      return 'success';
    case 'flagged':
      return 'critical';
    case 'pending_review':
    default:
      return 'warning';
  }
}

export function mapSeverityToTimeline(severity: EventSeverity): TimelineSeverity {
  if (severity === 'low') return 'low';
  if (severity === 'medium') return 'medium';
  if (severity === 'high') return 'high';
  return 'critical';
}

export function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

