import { ClockIcon } from 'lucide-react';

import { Skeleton } from '~/components/ui/skeleton';

import type { LabourForecastSummary } from '../types';
import { currency2 } from '../types';

interface ForecastActualStubProps {
  summary: LabourForecastSummary | undefined;
  loading: boolean;
}

// Forecast-vs-actual comparison — the "actual" side is an explicit, visible
// stub, not a working feature. It depends on real clock-in data from
// CLAUDE.md build order step 6, which doesn't exist. Per that plan: show
// the forecast side (which real budget-target data backs today) and make
// the missing "actual" side obviously a stub in the UI itself — not just a
// code comment — so it can't be mistaken for a real, if currently empty,
// number once step 6 ships.
export function ForecastActualStub({ summary, loading }: ForecastActualStubProps) {
  if (loading) {
    return (
      <div className="flex gap-3">
        <Skeleton className="h-24 flex-1" />
        <Skeleton className="h-24 flex-1" />
      </div>
    );
  }

  const forecast = summary?.forecastTarget ?? null;

  return (
    <div className="flex gap-3">
      <div className="flex flex-1 flex-col justify-between rounded-lg border border-border bg-muted p-4">
        <p className="font-sans text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Forecast
        </p>
        <p className="mt-2 font-sans text-2xl font-semibold tabular-nums">
          {forecast != null ? currency2(forecast) : 'No target set'}
        </p>
      </div>

      <div
        className="flex flex-1 flex-col justify-between rounded-lg border border-dashed border-border p-4"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--muted) 0, var(--muted) 6px, transparent 6px, transparent 12px)',
        }}
      >
        <p className="flex items-center gap-1.5 font-sans text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          <ClockIcon size={12} />
          Actual — not yet available
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Unlocks once staff clock in/out (GPS-verified time tracking) goes live. Shown
          here so it's obvious this isn't a working comparison yet — not a silently-empty
          number.
        </p>
      </div>
    </div>
  );
}
