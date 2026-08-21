import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import { currentAccountQueryOptions } from '~/lib/account/hooks';

import * as api from './api';
import {
  aggregateDailyTrendToWeeks,
  mapCostBreakdown,
  mapLabourForecastSummary,
} from './types';

// No controller lists venues (see types.ts's file header) — reuses the
// account query's cache entry via `select` rather than issuing a second
// request, and maps AccountVenueDto's shape down to this route's Venue type.
export function useVenues() {
  return useQuery({
    ...currentAccountQueryOptions,
    select: account => account.venues.map(v => ({ id: v.venueId, name: v.name })),
  });
}

// Monday of the ISO week containing `dt`, matching the codebase's existing
// "Luxon weekday: 1=Mon..7=Sun" convention (see routes/roster/types.ts)
// rather than Luxon's locale-dependent startOf("week").
function weekStartOf(dt: DateTime): DateTime {
  return dt.minus({ days: dt.weekday - 1 }).startOf('day');
}

export function useLabourCostTrend(venueId: string, weeks: number) {
  return useQuery({
    queryKey: ['labourCostTrend', venueId, weeks],
    queryFn: async () => {
      const currentWeekStart = weekStartOf(DateTime.now());
      const from = currentWeekStart.minus({ weeks: weeks - 1 });
      const to = currentWeekStart.plus({ days: 6 });
      const days = await api.fetchCostTrend(venueId, from.toISODate()!, to.toISODate()!);
      return aggregateDailyTrendToWeeks(days);
    },
    enabled: !!venueId,
  });
}

export function useCostBreakdown(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ['costBreakdown', venueId, weekStartIso],
    queryFn: async () => {
      const dtos = await api.fetchCostByRole(venueId, weekStartIso);
      return mapCostBreakdown(dtos, venueId, DateTime.fromISO(weekStartIso));
    },
    enabled: !!venueId && !!weekStartIso,
  });
}

export function useForecastSummary(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ['forecastSummary', venueId, weekStartIso],
    queryFn: async () =>
      mapLabourForecastSummary(await api.fetchForecastSummary(venueId, weekStartIso)),
    enabled: !!venueId && !!weekStartIso,
  });
}
