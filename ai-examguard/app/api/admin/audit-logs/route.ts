import { NextResponse } from 'next/server';
import {
  ReportingService,
  serializeAuditLogsToCsv,
} from '@/lib/services/reporting';
import { handleExamSessionApiError } from '@/lib/utils/request-meta';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const actorId = url.searchParams.get('actorId');
    const entityType = url.searchParams.get('entityType');
    const search = url.searchParams.get('search');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const limitParam = url.searchParams.get('limit');
    const format = url.searchParams.get('format');

    const limit = limitParam ? Number(limitParam) : undefined;
    const result = await ReportingService.getAdminAuditLogs({
      action,
      actorId,
      entityType,
      search,
      dateFrom,
      dateTo,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    if (format === 'csv') {
      const { filename, csv, rowCount } = serializeAuditLogsToCsv(result.logs);
      await ReportingService.logReportExport({
        universityId: '',
        reportType: 'audit_logs',
        filters: { action, search, dateFrom, dateTo },
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
    }

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Failed to fetch administrative audit logs.');
  }
}

