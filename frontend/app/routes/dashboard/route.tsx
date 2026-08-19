import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyTitle } from "~/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { useVenueContextStore } from "~/lib/venue-context";

import { CostByRoleBreakdown } from "./components/CostByRoleBreakdown";
import { ForecastActualStub } from "./components/ForecastActualStub";
import { TrendChart } from "./components/TrendChart";
import {
  useCostBreakdown,
  useForecastSummary,
  useLabourCostTrend,
  useVenues,
} from "./hooks";
import { formatWeekLabel, mustFindVenue } from "./types";

// Trailing-window options for the trend chart. Default is 8 weeks (~2
// months) — enough to read a real trend without the chart becoming
// cluttered or the mock/real weekly-total data getting too sparse; 4 and
// 12 are offered either side for a tighter or a longer view. Flagged here
// per the brief rather than picked silently.
const TRAILING_WINDOW_OPTIONS = [4, 8, 12] as const;
const DEFAULT_TRAILING_WEEKS = 8;

export default function LabourCostDashboard() {
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();
  const [trailingWeeks, setTrailingWeeks] = useState<number>(
    DEFAULT_TRAILING_WEEKS,
  );
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

  const breakdownQuery = useCostBreakdown(
    activeVenueId,
    effectiveWeekIso ?? "",
  );
  const forecastQuery = useForecastSummary(
    activeVenueId,
    effectiveWeekIso ?? "",
  );

  if (venuesQuery.isLoading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <Spinner className="size-6" />
      </div>
    );
  }

  if (venuesQuery.isError) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ background: "var(--background)" }}
      >
        <Empty>
          <EmptyTitle>Couldn't load the dashboard</EmptyTitle>
          <EmptyDescription>
            {venuesQuery.error?.message ??
              "Something went wrong. Try again shortly."}
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const venue = mustFindVenue(venues, activeVenueId);

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-auto gap-2 rounded-lg px-3 py-2"
                  style={{ background: "var(--muted)" }}
                />
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: "var(--foreground)" }}
              />
              <div className="text-left">
                <p className="font-sans font-semibold text-sm uppercase leading-tight">
                  {venue.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {venue.suburb}
                </p>
              </div>
              <ChevronDownIcon
                size={14}
                className="ml-1 shrink-0"
                style={{ color: "var(--muted-foreground)" }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64"
              style={{
                background: "var(--muted)",
                borderColor: "var(--border)",
              }}
            >
              {venues.map((v) => (
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
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {v.suburb}
                    </p>
                  </div>
                  {v.id === activeVenueId && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--foreground)" }}
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className="hidden md:block pl-4 border-l"
            style={{ borderColor: "var(--border)" }}
          >
            <h1 className="font-sans font-semibold text-sm uppercase tracking-wide">
              Labour cost dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 flex flex-col gap-6">
        {/* Week-over-week trend */}
        <section
          className="rounded-lg border p-5"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-sans font-semibold text-sm">
                Week-over-week labour cost
              </h2>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {venue.name} — trailing {trailingWeeks} weeks
              </p>
            </div>
            <div
              className="flex items-center gap-1 rounded-lg border p-0.5"
              style={{ borderColor: "var(--border)" }}
            >
              {TRAILING_WINDOW_OPTIONS.map((weeks) => (
                <Button
                  key={weeks}
                  size="sm"
                  variant={trailingWeeks === weeks ? "default" : "ghost"}
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
          <section
            className="rounded-lg border p-5"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-sans font-semibold text-sm">Cost by role</h2>
              {trend.length > 0 && effectiveWeekIso && (
                <Select
                  value={effectiveWeekIso}
                  onValueChange={(value) => setSelectedWeekIso(value)}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...trend].reverse().map((p) => {
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

          <section
            className="rounded-lg border p-5"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <h2 className="font-sans font-semibold text-sm mb-4">
              Forecast vs actual
            </h2>
            <ForecastActualStub
              summary={forecastQuery.data}
              loading={forecastQuery.isLoading || trendQuery.isLoading}
            />
          </section>
        </div>

        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Figures shown are illustrative for demo purposes — not authoritative
          payroll or legal advice.
        </p>
      </main>
    </div>
  );
}
