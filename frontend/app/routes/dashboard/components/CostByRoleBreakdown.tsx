import { Empty, EmptyDescription, EmptyTitle } from "~/components/ui/empty";
import { Skeleton } from "~/components/ui/skeleton";

import type { CostBreakdown } from "../types";
import { ROLE_META, currency2 } from "../types";

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
      {sorted.map((r) => {
        const meta = ROLE_META[r.role];
        const pct = breakdown.totalCost > 0 ? (r.totalCost / breakdown.totalCost) * 100 : 0;
        return (
          <div key={r.role} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                {meta.label}
              </span>
              <span className="tabular-nums font-sans font-medium">{currency2(r.totalCost)}</span>
            </div>
            <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-2 mt-1 border-t text-sm" style={{ borderColor: "var(--border)" }}>
        <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>Total</span>
        <span className="tabular-nums font-sans font-semibold">{currency2(breakdown.totalCost)}</span>
      </div>
    </div>
  );
}
