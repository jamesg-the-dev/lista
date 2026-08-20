import { useQuery } from "@tanstack/react-query";

import { currentAccountQueryOptions } from "~/lib/account/hooks";

import * as api from "./api";
import {
  mapCostBreakdown,
  mapLabourCostTrendPoint,
  mapLabourForecastSummary,
} from "./types";

// No controller lists venues (see types.ts's file header) — reuses the
// account query's cache entry via `select` rather than issuing a second
// request, and maps AccountVenueDto's shape down to this route's Venue type.
export function useVenues() {
  return useQuery({
    ...currentAccountQueryOptions,
    select: (account) => account.venues.map((v) => ({ id: v.venueId, name: v.name })),
  });
}

export function useLabourCostTrend(venueId: string, weeks: number) {
  return useQuery({
    queryKey: ["labourCostTrend", venueId, weeks],
    queryFn: async () =>
      (await api.fetchLabourCostTrend(venueId, weeks)).map(mapLabourCostTrendPoint),
    enabled: !!venueId,
  });
}

export function useCostBreakdown(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["costBreakdown", venueId, weekStartIso],
    queryFn: async () =>
      mapCostBreakdown(await api.fetchCostBreakdown(venueId, weekStartIso)),
    enabled: !!venueId && !!weekStartIso,
  });
}

export function useForecastSummary(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["forecastSummary", venueId, weekStartIso],
    queryFn: async () =>
      mapLabourForecastSummary(await api.fetchForecastSummary(venueId, weekStartIso)),
    enabled: !!venueId && !!weekStartIso,
  });
}
