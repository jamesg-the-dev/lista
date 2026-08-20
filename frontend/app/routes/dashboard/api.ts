import { apiClient } from "~/lib/api-client";

import type { CostByRoleDto, CostTrendDayDto, ForecastSummaryDto } from "./types";

// Backed by LabourCostController — see types.ts's file header for why
// fetchForecastSummary calls RosterController's budget-summary endpoint
// instead. Venues come from useCurrentAccount() (see hooks.ts's useVenues),
// not from here.

export function fetchCostTrend(
  venueId: string,
  from: string,
  to: string,
): Promise<CostTrendDayDto[]> {
  const params = new URLSearchParams({ from, to });
  return apiClient.get<CostTrendDayDto[]>(`/api/venues/${venueId}/labour-cost/trend?${params}`);
}

export function fetchCostByRole(
  venueId: string,
  weekStartIso: string,
): Promise<CostByRoleDto[]> {
  const params = new URLSearchParams({ weekStart: weekStartIso });
  return apiClient.get<CostByRoleDto[]>(`/api/venues/${venueId}/labour-cost/by-role?${params}`);
}

export function fetchForecastSummary(
  venueId: string,
  weekStartIso: string,
): Promise<ForecastSummaryDto> {
  const params = new URLSearchParams({ weekStart: weekStartIso });
  return apiClient.get<ForecastSummaryDto>(
    `/api/venues/${venueId}/roster/budget-summary?${params}`,
  );
}
