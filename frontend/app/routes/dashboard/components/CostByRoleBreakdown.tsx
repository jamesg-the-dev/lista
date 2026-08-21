import { Empty, EmptyDescription, EmptyTitle } from '~/components/ui/empty';
import { Skeleton } from '~/components/ui/skeleton';

import type { CostBreakdown } from '../types';
import { CLASSIFICATION_META, currency2 } from '../types';

interface CostByRoleBreakdownProps {
  breakdown: CostBreakdown | undefined;
  loading: boolean;
}

export function CostByRoleBreakdown({ breakdown, loading }: CostByRoleBreakdownProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!breakdown || breakdown.byRole.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No roster data yet</EmptyTitle>
        <EmptyDescription>
          No shifts were rostered for this venue in the selected week.
        </EmptyDescription>
      </Empty>
    );
  }

  const sorted = [...breakdown.byRole].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map(r => {
        const meta = CLASSIFICATION_META[r.classification];
        const pct =
          breakdown.totalCost > 0 ? (r.totalCost / breakdown.totalCost) * 100 : 0;
        return (
          <div key={r.classification} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{meta.label}</span>
              <span className="font-sans font-medium tabular-nums">
                {currency2(r.totalCost)}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--muted)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'var(--foreground)' }}
              />
            </div>
          </div>
        );
      })}
      <div
        className="mt-1 flex items-center justify-between border-t pt-2 text-sm"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>
          Total
        </span>
        <span className="font-sans font-semibold tabular-nums">
          {currency2(breakdown.totalCost)}
        </span>
      </div>
    </div>
  );
}
