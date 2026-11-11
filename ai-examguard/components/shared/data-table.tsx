'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { EmptyState } from './empty-state';
import { LoadingSkeleton } from './loading-skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  toolbarActions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Reusable sortable and searchable enterprise data table with loading and empty states.
 */
export function DataTable<T>({
  data,
  columns,
  getRowKey,
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Filter records...',
  searchFilter,
  toolbarActions,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleToggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const processedData = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const filtered = trimmed
      ? data.filter((row) => {
          if (searchFilter) return searchFilter(row, trimmed);
          return JSON.stringify(row).toLowerCase().includes(trimmed);
        })
      : data;

    if (!sortKey) return filtered;
    const activeCol = columns.find((c) => c.key === sortKey);
    if (!activeCol?.sortValue) return filtered;

    const getVal = activeCol.sortValue;
    return [...filtered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, query, searchFilter, sortKey, sortDir, columns]);

  if (isLoading) {
    return <LoadingSkeleton variant="table" count={5} className={className} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(searchable || toolbarActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {searchable ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 bg-[#0B1220] border-[#243249] text-[#F8FAFC] placeholder:text-[#94A3B8]/60"
              />
            </div>
          ) : (
            <div />
          )}

          {toolbarActions && (
            <div className="flex items-center gap-2 flex-wrap">{toolbarActions}</div>
          )}
        </div>
      )}

      {processedData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="rounded-xl border border-[#243249] bg-[#111B2D] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#243249] bg-[#17243A]/60 text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
                  {columns.map((col) => {
                    const isSorted = sortKey === col.key;
                    return (
                      <th key={col.key} className={cn('px-4 py-3 font-semibold', col.className)}>
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSort(col)}
                            className="inline-flex items-center gap-1.5 hover:text-[#F8FAFC] transition-colors cursor-pointer"
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-[#38BDF8]" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-[#38BDF8]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243249]/70 text-sm">
                {processedData.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors hover:bg-[#17243A]/45',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3.5 align-middle', col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

