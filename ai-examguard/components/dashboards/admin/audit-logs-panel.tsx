'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, FilterX, Loader2, RefreshCw, Search } from 'lucide-react';
import { AlertPanel } from '@/components/shared/alert-panel';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatShortDateTime } from '@/lib/utils/dashboard-formatters';
import type { AuditLogView } from '@/types/dashboard';
import type { AuditAction } from '@/types/database';

function summarizeAuditDetails(details: Record<string, unknown>): string {
  const category = typeof details.auditCategory === 'string' ? details.auditCategory : null;
  const provider = typeof details.providerName === 'string' ? details.providerName : null;
  const reportType = typeof details.reportType === 'string' ? details.reportType : null;
  const rowCount = typeof details.rowCount === 'number' ? details.rowCount : null;
  const newStatus = typeof details.newStatus === 'string' ? details.newStatus : null;

  const parts: string[] = [];
  if (category) parts.push(category);
  if (provider) parts.push(`Provider: ${provider}`);
  if (reportType) parts.push(`Report: ${reportType}`);
  if (rowCount !== null) parts.push(`Rows: ${rowCount}`);
  if (newStatus) parts.push(`Status: ${newStatus}`);

  if (parts.length > 0) return parts.join(' • ');
  const keys = Object.keys(details);
  return keys.length > 0 ? keys.slice(0, 4).join(', ') : 'Standard operational audit event';
}

export function AuditLogsPanel({ initialLogs }: { initialLogs: AuditLogView[] }) {
  const [logs, setLogs] = useState<AuditLogView[]>(initialLogs);
  const [availableActions, setAvailableActions] = useState<AuditAction[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'critical';
    message: string;
  } | null>(null);

  const buildQuery = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter);
      if (search.trim()) params.set('search', search.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) params.set(k, v);
      }
      return params.toString();
    },
    [actionFilter, search, dateFrom, dateTo]
  );

  const refreshAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQuery();
      const res = await fetch(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          tone: 'critical',
          message: json?.error || 'Failed to load administrative audit logs.',
        });
        return;
      }
      setLogs((json.logs || []) as AuditLogView[]);
      setAvailableActions((json.availableActions || []) as AuditAction[]);
    } catch (err: unknown) {
      setFeedback({
        tone: 'critical',
        message: (err as Error).message || 'Network error refreshing audit logs.',
      });
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const qs = buildQuery();
        const res = await fetch(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!active) return;
        if (res.ok) {
          setLogs((json.logs || []) as AuditLogView[]);
          setAvailableActions((json.availableActions || []) as AuditAction[]);
        }
      } catch {
        // Keep initialLogs silently on initial mount network glitch
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [buildQuery]);

  const handleExportCsv = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      const qs = buildQuery({ format: 'csv' });
      const res = await fetch(`/api/admin/audit-logs?${qs}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFeedback({
          tone: 'critical',
          message: (err as { error?: string }).error || 'Audit log export failed.',
        });
        return;
      }
      const csvText = await res.text();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || 'examguard-audit-logs.csv';
      const rowCount = res.headers.get('x-export-row-count') || String(logs.length);

      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedback({
        tone: 'success',
        message: `Exported ${rowCount} audit log record(s) to ${filename}.`,
      });
      await refreshAuditLogs();
    } catch (err: unknown) {
      setFeedback({
        tone: 'critical',
        message: (err as Error).message || 'Audit log export failed.',
      });
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setActionFilter('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setFeedback(null);
  };

  const columns: DataTableColumn<AuditLogView>[] = [
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      sortValue: (a) => a.action,
      render: (a) => (
        <StatusBadge tone="teal" className="font-mono text-[10px]">
          {a.action}
        </StatusBadge>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (a) => <span className="text-xs text-foreground">{a.actorName}</span>,
    },
    {
      key: 'entity',
      header: 'Target & Metadata',
      render: (a) => (
        <div className="max-w-md space-y-0.5">
          <span className="font-mono text-xs text-primary">{a.entityType || 'system'}</span>
          <p className="text-xs text-muted-foreground truncate">
            {summarizeAuditDetails(a.details || {})}
          </p>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Timestamp',
      sortable: true,
      sortValue: (a) => a.createdAt,
      render: (a) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortDateTime(a.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
              Action Type
            </Label>
            <select
              id="audit-action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            >
              <option value="all">All Audited Actions</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="audit-search" className="text-xs text-muted-foreground">
              Search Actor, Entity or Metadata
            </Label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                id="audit-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="audit-from" className="text-xs text-muted-foreground">
              From Date
            </Label>
            <Input
              id="audit-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="audit-to" className="text-xs text-muted-foreground">
              To Date
            </Label>
            <Input
              id="audit-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
            <FilterX className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={refreshAuditLogs} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export Audit CSV
          </Button>
        </div>
      </div>

      {feedback && (
        <AlertPanel
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Audit Export Recorded' : 'Audit Log Error'}
          description={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <DataTable
        data={logs}
        columns={columns}
        getRowKey={(a) => a.id}
        searchable={false}
        emptyTitle="No Matching Audit Logs"
        emptyDescription="Privileged administrative actions, exports, reviews, and security updates appear here."
      />
    </div>
  );
}

