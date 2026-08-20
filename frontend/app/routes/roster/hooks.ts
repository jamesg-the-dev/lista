import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { currentAccountQueryOptions } from "~/lib/account/hooks";

import * as api from "./api";
import type { ShiftInput } from "./types";
import { mapShift, mapStaffMember } from "./types";

// No controller lists venues (see types.ts's file header) — reuses the
// account query's cache entry via `select` rather than issuing a second
// request, and maps AccountVenueDto's shape down to this route's Venue type.
export function useVenues() {
  return useQuery({
    ...currentAccountQueryOptions,
    select: (account) => account.venues.map((v) => ({ id: v.venueId, name: v.name })),
  });
}

export function useRosterStaffMembers(venueId: string) {
  return useQuery({
    queryKey: ["roster", "staff", venueId],
    queryFn: async () => (await api.fetchStaffMembers(venueId)).map(mapStaffMember),
    enabled: !!venueId,
  });
}

export function useShifts(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["shifts", venueId, weekStartIso],
    queryFn: async () => (await api.fetchShifts(venueId, weekStartIso)).map(mapShift),
    enabled: !!venueId,
  });
}

// A shift write changes the week's budget total too (award cost is
// per-shift) — invalidate both narrowest keys together rather than a
// blanket refetch.
function invalidateWeek(queryClient: QueryClient, venueId: string, weekStartIso: string) {
  queryClient.invalidateQueries({ queryKey: ["shifts", venueId, weekStartIso] });
  queryClient.invalidateQueries({ queryKey: ["budgetSummary", venueId, weekStartIso] });
}

export function useCreateShift(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShiftInput) => api.createShift(input),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}

export function useUpdateShift(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, input }: { shiftId: string; input: ShiftInput }) =>
      api.updateShift(shiftId, input),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}

export function useDeleteShift(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => api.deleteShift(shiftId, venueId),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}

export function useBudgetSummary(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["budgetSummary", venueId, weekStartIso],
    queryFn: () => api.fetchBudgetSummary(venueId, weekStartIso),
    enabled: !!venueId,
  });
}

export function useSaveForecastSalesTarget(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (forecastSalesTarget: number | null) =>
      api.saveForecastSalesTarget(venueId, forecastSalesTarget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetSummary", venueId, weekStartIso] });
    },
  });
}

export function usePreviousWeekRoster(venueId: string, weekStartIso: string, enabled: boolean) {
  return useQuery({
    queryKey: ["previousWeekRoster", venueId, weekStartIso],
    queryFn: async () => (await api.fetchPreviousWeekRoster(venueId, weekStartIso)).map(mapShift),
    enabled: enabled && !!venueId,
  });
}

export function useDuplicateRoster(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.duplicateRoster(venueId, weekStartIso),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}
