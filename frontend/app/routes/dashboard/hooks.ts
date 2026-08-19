import { useQuery } from "@tanstack/react-query";

import * as api from "./api";
import {
  mapCostBreakdown,
  mapLabourCostTrendPoint,
  mapLabourForecastSummary,
} from "./types";

export function useVenues() {
  return useQuery({ queryKey: ["venues"], queryFn: api.fetchVenues });
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
