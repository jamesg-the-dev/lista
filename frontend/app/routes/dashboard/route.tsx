import { useMemo, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyTitle } from '~/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Spinner } from '~/components/ui/spinner';
import { useVenueContextStore } from '~/lib/venue-context';

import { CostByRoleBreakdown } from './components/CostByRoleBreakdown';
import { ForecastActualStub } from './components/ForecastActualStub';
import { TrendChart } from './components/TrendChart';
import {
  useCostBreakdown,
  useForecastSummary,
  useLabourCostTrend,
  useVenues,
} from './hooks';
import { formatWeekLabel, mustFindVenue } from './types';

// Trailing-window options for the trend chart. Default is 8 weeks (~2
// months) — enough to read a real trend without the chart becoming
// cluttered or the mock/real weekly-total data getting too sparse; 4 and
// 12 are offered either side for a tighter or a longer view. Flagged here
// per the brief rather than picked silently.
const TRAILING_WINDOW_OPTIONS = [4, 8, 12] as const;
const DEFAULT_TRAILING_WEEKS = 8;

export default function LabourCostDashboard() {
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();
  const [trailingWeeks, setTrailingWeeks] = useState<number>(DEFAULT_TRAILING_WEEKS);
  const [selectedWeekIso, setSelectedWeekIso] = useState<string | null>(null);

  const venuesQuery = useVenues();
  const trendQuery = useLabourCostTrend(activeVenueId, trailingWeeks);

  const venues = venuesQuery.data ?? [];
  const trend = useMemo(() => trendQuery.data ?? [], [trendQuery.data]);

  // The week inspected in the breakdown/forecast panels defaults to the
  // latest week in the trend series once it loads, rather than a
  // hardcoded date, so it never drifts out of sync with the mock/real data.
  const latestWeekIso =
    trend.length > 0 ? trend[trend.length - 1].weekStart.toISODate() : null;
  const effectiveWeekIso = selectedWeekIso ?? latestWeekIso;

  const breakdownQuery = useCostBreakdown(activeVenueId, effectiveWeekIso ?? '');
  const forecastQuery = useForecastSummary(activeVenueId, effectiveWeekIso ?? '');

  if (venuesQuery.isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (venuesQuery.isError) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
        <Empty>
          <EmptyTitle>Couldn't load the dashboard</EmptyTitle>
          <EmptyDescription>
            {venuesQuery.error?.message ?? 'Something went wrong. Try again shortly.'}
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const venue = mustFindVenue(venues, activeVenueId);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-auto gap-2 rounded-lg bg-muted px-3 py-2"
                />
              }
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
              <div className="text-left">
                <p className="font-sans text-sm leading-tight font-semibold uppercase">
                  {venue.name}
                </p>
              </div>
              <ChevronDownIcon size={14} className="ml-1 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-muted">
              {venues.map(v => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => {
                    setActiveVenueId(v.id);
                    setSelectedWeekIso(null);
                  }}
                  className="justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                  </div>
                  {v.id === activeVenueId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden border-l border-border pl-4 md:block">
            <h1 className="font-sans text-sm font-semibold tracking-wide uppercase">
              Labour cost dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        {/* Week-over-week trend */}
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-sans text-sm font-semibold">
                Week-over-week labour cost
              </h2>
              <p className="text-xs text-muted-foreground">
                {venue.name} — trailing {trailingWeeks} weeks
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {TRAILING_WINDOW_OPTIONS.map(weeks => (
                <Button
                  key={weeks}
                  size="sm"
                  variant={trailingWeeks === weeks ? 'default' : 'ghost'}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setTrailingWeeks(weeks)}
                >
                  {weeks}w
                </Button>
              ))}
            </div>
          </div>
          <TrendChart points={trend} loading={trendQuery.isLoading} />
        </section>

        {/* Cost by role + forecast-vs-actual, for a selected week */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-sans text-sm font-semibold">Cost by pay tier</h2>
              {trend.length > 0 && effectiveWeekIso && (
                <Select
                  value={effectiveWeekIso}
                  onValueChange={value => setSelectedWeekIso(value)}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...trend].reverse().map(p => {
                      const iso = p.weekStart.toISODate()!;
                      return (
                        <SelectItem key={iso} value={iso}>
                          Week of {formatWeekLabel(p.weekStart)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <CostByRoleBreakdown
              breakdown={breakdownQuery.data}
              loading={breakdownQuery.isLoading || trendQuery.isLoading}
            />
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 font-sans text-sm font-semibold">Forecast vs actual</h2>
            <ForecastActualStub
              summary={forecastQuery.data}
              loading={forecastQuery.isLoading || trendQuery.isLoading}
            />
          </section>
        </div>

        <p className="text-xs text-muted-foreground">
          Figures shown are illustrative for demo purposes — not authoritative payroll or
          legal advice.
        </p>
      </main>
    </div>
  );
}
