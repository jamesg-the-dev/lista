import {
  mockFetchCostBreakdown,
  mockFetchForecastSummary,
  mockFetchLabourCostTrend,
  mockFetchVenues,
} from "./mock-data";
import type {
  CostBreakdownDto,
  LabourCostTrendPointDto,
  LabourForecastSummaryDto,
  VenueDto,
} from "./types";

// Stubbed API layer backed by an in-memory mock dataset — see mock-data.ts.
// Real function signatures, called with an artificial delay so loading
// states are exercised for real. When the backend exists, mock-data.ts
// gets deleted and only the body of each function below changes to a real
// fetch call — hooks.ts, and every component, stay untouched. Follows the
// same pattern as routes/roster/api.ts and routes/staff/api.ts.

export async function fetchVenues(): Promise<VenueDto[]> {
  return mockFetchVenues();
}

export async function fetchLabourCostTrend(
  venueId: string,
  weeks: number,
): Promise<LabourCostTrendPointDto[]> {
  return mockFetchLabourCostTrend(venueId, weeks);
}

export async function fetchCostBreakdown(
  venueId: string,
  weekStartIso: string,
): Promise<CostBreakdownDto> {
  return mockFetchCostBreakdown(venueId, weekStartIso);
}

export async function fetchForecastSummary(
  venueId: string,
  weekStartIso: string,
): Promise<LabourForecastSummaryDto> {
  return mockFetchForecastSummary(venueId, weekStartIso);
}
