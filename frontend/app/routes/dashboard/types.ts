// Labour cost dashboard — wire types + view models. Follows CLAUDE.md's
// "wire type vs view model" convention (see routes/roster/types.ts,
// routes/staff/types.ts): DTOs match the backend query response shape
// exactly (ISO date strings, enums as ints), view models are what
// components consume (Luxon DateTime, string unions). Mapping happens
// once, at the boundary, in the mapXxx functions below.
//
// This is a reporting layer over the same award-breakdown cost data the
// Screen 3 budget bar sums per week (see CLAUDE.md's "Feature rationale"
// entry for the labour cost dashboard) — "look back and across" (trends,
// comparisons), not "look now" (that's the budget bar's job).

import { DateTime } from "luxon";

import { ROLE_META, mapRole } from "../roster/types";
import type { Role } from "../roster/types";

// ---------------------------------------------------------------------------
// Venue — duplicated per-route (id/name/suburb only, no positional encoding),
// same pattern as routes/roster/types.ts and routes/staff/types.ts. Role,
// below, is imported from routes/roster/types.ts instead of duplicated,
// because ROLE_TABLE there is a *positionally* encoded enum (unmapRole
// returns an array index) — a second copy of that table could silently
// drift out of index-alignment with the first and misattribute cost to the
// wrong role. Venue has no such hazard, so it follows the established
// per-route duplication convention.
// ---------------------------------------------------------------------------

export interface VenueDto {
  id: string;
  name: string;
  suburb: string;
}
export type Venue = VenueDto;

export function mustFindVenue(venues: Venue[], venueId: string): Venue {
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) throw new Error(`Unknown venue id: ${venueId}`);
  return venue;
}

export { ROLE_META, mapRole };
export type { Role };

// ---------------------------------------------------------------------------
// Week-over-week labour cost trend.
// ---------------------------------------------------------------------------

export interface LabourCostTrendPointDto {
  weekStartIso: string; // Monday, e.g. "2026-08-17"
  totalCost: number;
}

export interface LabourCostTrendPoint {
  weekStart: DateTime;
  totalCost: number;
}

export function mapLabourCostTrendPoint(
  dto: LabourCostTrendPointDto,
): LabourCostTrendPoint {
  return {
    weekStart: DateTime.fromISO(dto.weekStartIso),
    totalCost: dto.totalCost,
  };
}

// ---------------------------------------------------------------------------
// Cost by role, for a single selected week at the currently active venue.
// Scoped to one venue only for now — the venue switcher has no "all
// venues" / organisation-wide mode yet, so there's nothing to split a
// cross-venue breakdown across. Add a byVenue array here alongside a real
// org-wide switcher mode, rather than before one exists.
// ---------------------------------------------------------------------------

export interface RoleCostDto {
  role: number;
  totalCost: number;
}
export interface RoleCost {
  role: Role;
  totalCost: number;
}
export function mapRoleCost(dto: RoleCostDto): RoleCost {
  return { role: mapRole(dto.role), totalCost: dto.totalCost };
}

export interface CostBreakdownDto {
  venueId: string;
  weekStartIso: string;
  byRole: RoleCostDto[];
}

export interface CostBreakdown {
  venueId: string;
  weekStart: DateTime;
  byRole: RoleCost[];
  totalCost: number;
}

export function mapCostBreakdown(dto: CostBreakdownDto): CostBreakdown {
  const byRole = dto.byRole.map(mapRoleCost);
  return {
    venueId: dto.venueId,
    weekStart: DateTime.fromISO(dto.weekStartIso),
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
// ---------------------------------------------------------------------------

export interface LabourForecastSummaryDto {
  venueId: string;
  weekStartIso: string;
  forecastTarget: number | null;
}

export interface LabourForecastSummary {
  venueId: string;
  weekStart: DateTime;
  forecastTarget: number | null;
}

export function mapLabourForecastSummary(
  dto: LabourForecastSummaryDto,
): LabourForecastSummary {
  return {
    venueId: dto.venueId,
    weekStart: DateTime.fromISO(dto.weekStartIso),
    forecastTarget: dto.forecastTarget,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers — duplicated from routes/roster/types.ts (pure, no
// dependency on that route's state) rather than imported, matching the
// self-contained-route convention used everywhere else in this file.
// ---------------------------------------------------------------------------

export function currency(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}
export function currency2(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}

export function formatWeekLabel(weekStart: DateTime): string {
  return weekStart.toFormat("d LLL");
}
