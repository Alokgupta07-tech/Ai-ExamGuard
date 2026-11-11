'use client';

import React, { useSyncExternalStore } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const noop = () => {};
const emptySubscribe = () => noop;

/** Returns true only after client hydration so Recharts ResponsiveContainer avoids SSR zero-width warnings. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export interface TimeSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

export interface DistributionPoint {
  name: string;
  value: number;
  fill?: string;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

function TelemetryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-sidebar/95 px-3 py-2 text-xs">
      <p className="font-mono font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>{entry.name}:</span>
          <span className="font-mono font-semibold text-primary tabular-reading">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Responsive area chart for examination activity & event density over time.
 */
export function ActivityAreaChart({
  data,
  primaryLabel = 'Sessions',
  secondaryLabel = 'Events',
}: {
  data: TimeSeriesPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const mounted = useIsClient();

  if (!mounted) {
    return <div className="h-full w-full rounded-md bg-surface-elevated/30 animate-pulse" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="cyanAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="tealAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#243249" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<TelemetryTooltip />} />
        <Area
          type="monotone"
          dataKey="primary"
          name={primaryLabel}
          stroke="#38BDF8"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#cyanAreaFill)"
        />
        {data.some((d) => d.secondary !== undefined) && (
          <Area
            type="monotone"
            dataKey="secondary"
            name={secondaryLabel}
            stroke="#2DD4BF"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#tealAreaFill)"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Responsive categorical bar chart for usage analytics, role breakdown, or score distributions.
 */
export function DistributionBarChart({
  data,
  valueLabel = 'Count',
  barColor = '#38BDF8',
}: {
  data: DistributionPoint[];
  valueLabel?: string;
  barColor?: string;
}) {
  const mounted = useIsClient();

  if (!mounted) {
    return <div className="h-full w-full rounded-lg bg-surface-elevated/30 animate-pulse" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#243249" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<TelemetryTooltip />} />
        <Bar dataKey="value" name={valueLabel} fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}
