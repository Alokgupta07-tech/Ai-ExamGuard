import { NextResponse } from 'next/server';
import {
  ReportingService,
  parseReportFiltersFromSearchParams,
  serializeReportToCsv,
} from '@/lib/services/reporting';
import { handleExamSessionApiError } from '@/lib/utils/request-meta';
import type { ReportType } from '@/types/reporting';

const VALID_REPORT_TYPES: ReportType[] = [
  'individual_candidate',
  'examination_level',
  'university_activity',
  'event_frequency',
  'monitoring_status',
  'review_outcome',
  'examination_submission',
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawType = url.searchParams.get('reportType') || 'individual_candidate';

    if (!VALID_REPORT_TYPES.includes(rawType as ReportType)) {
      return NextResponse.json(
        { error: `Unsupported reportType: ${rawType}` },
        { status: 400 }
      );
    }

    const reportType = rawType as ReportType;
    const filters = parseReportFiltersFromSearchParams(url.searchParams);
    const suite = await ReportingService.generateReportSuite(filters);
    const { filename, csv, rowCount } = serializeReportToCsv(reportType, suite);

    await ReportingService.logReportExport({
      universityId: suite.activeUniversityId,
      reportType,
      filters: filters as Record<string, unknown>,
      rowCount,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Export-Row-Count': String(rowCount),
      },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Failed to export CSV report.');
  }
}

