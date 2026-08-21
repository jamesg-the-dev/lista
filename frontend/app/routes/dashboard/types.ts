// Labour cost dashboard — wire types + view models. Follows CLAUDE.md's
// "wire type vs view model" convention (see routes/roster/types.ts,
// routes/staff/types.ts): DTOs match the backend query response shape
// exactly, view models are what components consume (Luxon DateTime, string
// unions). Mapping happens once, at the boundary, in the mapXxx functions
// below.
//
// This is a reporting layer over the same award-breakdown cost data the
// Screen 3 budget bar sums per week (see CLAUDE.md's "Feature rationale"
// entry for the labour cost dashboard) — "look back and across" (trends,
// comparisons), not "look now" (that's the budget bar's job). Backed by
// LabourCostController (backend/src/RosterApp.Api/Controllers/
// LabourCostController.cs); the forecast side reuses RosterController's
// budget-summary endpoint (see ForecastSummaryDto below) rather than a
// LabourCostController route, since it already returns exactly that field.

import { DateTime } from 'luxon';

import { CLASSIFICATION_META, mapClassification } from '../staff/types';
import type { AwardClassification } from '../staff/types';

// ---------------------------------------------------------------------------
// Venue — sourced from useCurrentAccount()'s venues (see hooks.ts's
// useVenues), not mocked or given its own endpoint — no controller lists
// venues (same as routes/roster/types.ts and routes/staff/types.ts).
// ---------------------------------------------------------------------------

export interface Venue {
  id: string;
  name: string;
}

export function mustFindVenue(venues: Venue[], venueId: string): Venue {
  const venue = venues.find(v => v.id === venueId);
  if (!venue) throw new Error(`Unknown venue id: ${venueId}`);
  return venue;
}

export { CLASSIFICATION_META };
export type { AwardClassification };

// ---------------------------------------------------------------------------
// Week-over-week labour cost trend. GetCostTrendQuery returns one point per
// *day* over an arbitrary range (ActualCost/IsActualAvailable are an
// explicit stub — see ForecastSummaryDto's comment below for why
// stub fields don't get threaded through to a view model); this screen
// still shows a weekly trend, so hooks.ts's useLabourCostTrend requests a
// day range spanning the selected trailing-week window and
// aggregateDailyTrendToWeeks below sums each ISO week's days into one
// point. TrendChart.tsx is unaffected — it only ever consumed the weekly
// view model.
// ---------------------------------------------------------------------------

export interface CostTrendDayDto {
  date: string; // ISO date-only, e.g. "2026-08-20"
  totalCost: number;
}

export interface LabourCostTrendPoint {
  weekStart: DateTime;
  totalCost: number;
}

export function aggregateDailyTrendToWeeks(
  days: CostTrendDayDto[],
): LabourCostTrendPoint[] {
  const totalByWeekStartIso = new Map<string, number>();
  for (const day of days) {
    const date = DateTime.fromISO(day.date);
    const weekStartIso = date.minus({ days: date.weekday - 1 }).toISODate()!;
    totalByWeekStartIso.set(
      weekStartIso,
      (totalByWeekStartIso.get(weekStartIso) ?? 0) + day.totalCost,
    );
  }
  return [...totalByWeekStartIso.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartIso, totalCost]) => ({
      weekStart: DateTime.fromISO(weekStartIso),
      totalCost,
    }));
}

// ---------------------------------------------------------------------------
// Cost by role, for a single selected week at the currently active venue.
// "Role" here is GetCostByRoleQuery's grouping — StaffMember.Classification
// (the MA000009 pay tier from routes/staff/types.ts), not the roster grid's
// mock Role concept (kitchen/floor/bar/manager), which has no backend
// representation at all. Scoped to one venue only for now — the venue
// switcher has no "all venues" / organisation-wide mode yet, so
// GetCostByVenueQuery (cross-venue, org-wide) stays unwired until a real
// org-wide switcher mode exists to show it in, per this file's original
// design note.
// ---------------------------------------------------------------------------

export interface CostByRoleDto {
  classification: string; // AwardClassification member name — see CLAUDE.md "Wire format for enums"
  totalCost: number;
}
export interface CostByRole {
  classification: AwardClassification;
  totalCost: number;
}
export function mapCostByRole(dto: CostByRoleDto): CostByRole {
  return {
    classification: mapClassification(dto.classification),
    totalCost: dto.totalCost,
  };
}

// GetCostByRoleQuery responds with a bare array (no venueId/weekStart
// echoed back) — venueId/weekStart are already known by the caller (see
// hooks.ts's useCostBreakdown), so this reattaches them client-side rather
// than expecting the server to.
export interface CostBreakdown {
  venueId: string;
  weekStart: DateTime;
  byRole: CostByRole[];
  totalCost: number;
}

export function mapCostBreakdown(
  dtos: CostByRoleDto[],
  venueId: string,
  weekStart: DateTime,
): CostBreakdown {
  const byRole = dtos.map(mapCostByRole);
  return {
    venueId,
    weekStart,
    byRole,
    totalCost: byRole.reduce((sum, r) => sum + r.totalCost, 0),
  };
}

// ---------------------------------------------------------------------------
// Forecast-vs-actual summary — forecast side only. Deliberately no "actual"
// field: the actual side depends on real clock-in data from CLAUDE.md build
// order step 6, which doesn't exist yet. An always-null field here would
// invite someone to wire fake data into it later without noticing it was
// meant to stay empty — add the field in step 6, once there's something
// real to put in it.
//
// Backed by GET /api/venues/{venueId}/roster/budget-summary
// (RosterController/GetBudgetSummaryQuery), not LabourCostController — it
// already returns exactly ForecastSalesTarget for a venue/week, so this
// reuses that endpoint instead of duplicating it under LabourCostController.
// ---------------------------------------------------------------------------

export interface ForecastSummaryDto {
  venueId: string;
  weekStart: string;
  totalCost: number;
  forecastSalesTarget: number | null;
  percentOfTarget: number | null;
}

export interface LabourForecastSummary {
  venueId: string;
  weekStart: DateTime;
  forecastTarget: number | null;
}

export function mapLabourForecastSummary(dto: ForecastSummaryDto): LabourForecastSummary {
  return {
    venueId: dto.venueId,
    weekStart: DateTime.fromISO(dto.weekStart),
    forecastTarget: dto.forecastSalesTarget,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers — duplicated from routes/roster/types.ts (pure, no
// dependency on that route's state) rather than imported, matching the
// self-contained-route convention used everywhere else in this file.
// ---------------------------------------------------------------------------

export function currency(n: number): string {
  return n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  });
}
export function currency2(n: number): string {
  return n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  });
}

export function formatWeekLabel(weekStart: DateTime): string {
  return weekStart.toFormat('d LLL');
}
