import { DateTime } from "luxon";

import { unmapRole } from "../roster/types";
import type { Role } from "../roster/types";
import type {
  CostBreakdownDto,
  LabourCostTrendPointDto,
  LabourForecastSummaryDto,
  RoleCostDto,
  VenueDto,
} from "./types";

// In-memory mock dataset standing in for the real backend — see api.ts.
// Deleted once a real .NET API exists; only the body of each api.ts
// function changes at that point. Follows the same pattern as
// routes/roster/mock-data.ts and routes/staff/mock-data.ts.
//
// Venue ids/names match those two files' mock venues so switching venue
// via the shared venue-context store behaves consistently across routes.

export const MOCK_VENUES: VenueDto[] = [
  { id: "v1", name: "Little Collins Café", suburb: "Melbourne CBD" },
  { id: "v2", name: "Fitzroy Yard", suburb: "Fitzroy" },
];

// Anchor matches routes/roster/route.tsx's WEEK_START (Mon 17 Aug 2026) so
// the most recent trend point lines up with "this week" on the roster
// builder.
const CURRENT_WEEK_START = DateTime.local(2026, 8, 17);
const TRAILING_WEEKS_AVAILABLE = 16; // covers every trailing-window option (4/8/12) with headroom

function weekStartsAgo(count: number): string[] {
  // Oldest → newest, so index `count - 1` is always the current week.
  return Array.from({ length: count }, (_, i) =>
    CURRENT_WEEK_START.minus({ weeks: count - 1 - i }).toISODate()!,
  );
}

const ALL_WEEK_STARTS = weekStartsAgo(TRAILING_WEEKS_AVAILABLE);

// Weekly-total variance multipliers, oldest → newest, applied over each
// venue's base weekly cost — deliberately uneven (not a flat or smoothly
// trending line) so the trend chart reads as a real trading pattern:
// public-holiday spikes, a quiet patch, normal week-to-week noise.
const V1_BASE_WEEKLY_COST = 8600;
const V1_VARIANCE = [
  0.97, 1.05, 0.91, 1.08, 1.12, 0.88, 1.0, 1.15, 0.93, 1.02, 0.0, 1.09, 1.18,
  0.94, 1.01, 1.04,
];
// Index 10 (5 weeks before the current week) is deliberately zeroed out —
// Little Collins Café closed for a fit-out that week. It falls inside the
// default 8-week trailing window (as well as 12), so the "no roster data
// yet" empty state in the cost-by-role breakdown is reachable without
// changing any other control first.

// Fitzroy Yard is a newer venue — only 5 trailing weeks of real trading
// history exist; earlier weeks return no data at all (venue wasn't open).
const V2_BASE_WEEKLY_COST = 3400;
const V2_VARIANCE = [0.95, 1.1, 1.02, 0.98, 1.05];

// role mix as a share of weekly total cost; must sum to 1
const ROLE_COST_SHARE: readonly [Role, number][] = [
  ["kitchen", 0.36],
  ["floor", 0.3],
  ["bar", 0.19],
  ["manager", 0.15],
];

function buildTrend(
  baseWeeklyCost: number,
  variance: number[],
): LabourCostTrendPointDto[] {
  const weekStarts = ALL_WEEK_STARTS.slice(-variance.length);
  return weekStarts.map((weekStartIso, i) => ({
    weekStartIso,
    totalCost: Math.round((baseWeeklyCost * variance[i]) / 10) * 10,
  }));
}

const V1_TREND: LabourCostTrendPointDto[] = buildTrend(
  V1_BASE_WEEKLY_COST,
  V1_VARIANCE,
);
const V2_TREND: LabourCostTrendPointDto[] = buildTrend(
  V2_BASE_WEEKLY_COST,
  V2_VARIANCE,
);

const TREND_BY_VENUE: Record<string, LabourCostTrendPointDto[]> = {
  v1: V1_TREND,
  v2: V2_TREND,
};

function buildBreakdown(
  venueId: string,
  weekStartIso: string,
  weeklyTotal: number,
): CostBreakdownDto {
  const byRole: RoleCostDto[] = ROLE_COST_SHARE.map(([role, share]) => ({
    role: unmapRole(role),
    totalCost: Math.round((weeklyTotal * share) / 5) * 5,
  }))
    // A zero-cost week (venue closed, or before it opened) naturally
    // collapses to an empty byRole array — this is what drives the "no
    // roster data yet" empty state, rather than a special case.
    .filter((r) => r.totalCost > 0);
  return { venueId, weekStartIso, byRole };
}

// weekStartIso -> weeklyTotal lookup per venue, derived from the trend
// series above so the breakdown for a given week always matches the
// figure shown on the trend chart for that same week.
function totalsByWeek(trend: LabourCostTrendPointDto[]): Record<string, number> {
  return Object.fromEntries(trend.map((p) => [p.weekStartIso, p.totalCost]));
}
const V1_TOTALS = totalsByWeek(V1_TREND);
const V2_TOTALS = totalsByWeek(V2_TREND);

const FORECAST_TARGET_BY_VENUE: Record<string, number | null> = {
  // Matches routes/roster/mock-data.ts's MOCK_BUDGET_TARGETS so the same
  // number appears on both the roster builder's budget bar and this
  // dashboard's forecast summary.
  v1: 9200,
  v2: null,
};

function delay<T>(value: T, ms = 150 + Math.random() * 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockFetchVenues(): Promise<VenueDto[]> {
  return delay(MOCK_VENUES);
}

export async function mockFetchLabourCostTrend(
  venueId: string,
  weeks: number,
): Promise<LabourCostTrendPointDto[]> {
  const trend = TREND_BY_VENUE[venueId] ?? [];
  return delay(trend.slice(-weeks));
}

export async function mockFetchCostBreakdown(
  venueId: string,
  weekStartIso: string,
): Promise<CostBreakdownDto> {
  const totals = venueId === "v2" ? V2_TOTALS : V1_TOTALS;
  const weeklyTotal = totals[weekStartIso] ?? 0;
  return delay(buildBreakdown(venueId, weekStartIso, weeklyTotal));
}

export async function mockFetchForecastSummary(
  venueId: string,
  weekStartIso: string,
): Promise<LabourForecastSummaryDto> {
  return delay({
    venueId,
    weekStartIso,
    forecastTarget: FORECAST_TARGET_BY_VENUE[venueId] ?? null,
  });
}
