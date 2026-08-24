import { Empty, EmptyDescription, EmptyTitle } from '~/components/ui/empty';
import { Skeleton } from '~/components/ui/skeleton';

import type { LabourCostTrendPoint } from '../types';
import { currency, currency2, formatWeekLabel } from '../types';

interface TrendChartProps {
  points: LabourCostTrendPoint[];
  loading: boolean;
}

// Bar chart in the same hand-rolled style as the roster builder's day-cost
// strip (routes/roster/route.tsx) — no charting library in this project, so
// this stays consistent with the one visual pattern already established
// for "$ over time" rather than introducing a second one.
export function TrendChart({ points, loading }: TrendChartProps) {
  if (loading) {
    return (
      <div className="flex h-40 items-end gap-3 px-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-8 shrink-0"
            style={{ height: `${30 + (i % 4) * 20}px` }}
          />
        ))}
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No trend data yet</EmptyTitle>
        <EmptyDescription>
          This venue has no rostered weeks in the selected window.
        </EmptyDescription>
      </Empty>
    );
  }

  const maxCost = Math.max(...points.map(p => p.totalCost), 1);
  const latestWeek = points[points.length - 1]?.weekStart;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit items-end gap-3 px-1">
        {points.map(p => {
          const isCurrent = p.weekStart.hasSame(latestWeek, 'week');
          const isClosed = p.totalCost === 0;
          const h = isClosed ? 4 : Math.max(6, (p.totalCost / maxCost) * 120);
          return (
            <div
              key={p.weekStart.toISODate()}
              className="flex w-10 shrink-0 flex-col items-center gap-1.5"
              title={
                isClosed
                  ? `${formatWeekLabel(p.weekStart)} — no roster data`
                  : `${formatWeekLabel(p.weekStart)} — ${currency2(p.totalCost)}`
              }
            >
              <p className="text-muted-foreground font-sans text-[10px] font-medium tabular-nums">
                {isClosed ? '—' : currency(p.totalCost)}
              </p>
              <div className="flex h-31 items-end">
                <div
                  className={`w-6 rounded-t ${
                    isClosed
                      ? 'border-border border border-dashed'
                      : isCurrent
                        ? 'bg-foreground'
                        : 'bg-muted'
                  }`}
                  style={{ height: `${h}px` }}
                />
              </div>
              <p
                className={`font-sans text-[11px] font-medium tabular-nums ${
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {formatWeekLabel(p.weekStart)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
