import { NextResponse } from 'next/server';
import {
  ReportingService,
  parseReportFiltersFromSearchParams,
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
    const filters = parseReportFiltersFromSearchParams(url.searchParams);
    const reportTypeParam = url.searchParams.get('reportType');

    const suite = await ReportingService.generateReportSuite(filters);

    if (
      reportTypeParam &&
      VALID_REPORT_TYPES.includes(reportTypeParam as ReportType)
    ) {
      const selectedType = reportTypeParam as ReportType;
      return NextResponse.json(
        {
          ...suite,
          selectedReportType: selectedType,
          selectedRows: suite.reports[selectedType],
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(suite, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Failed to generate institutional reports.');
  }
}

