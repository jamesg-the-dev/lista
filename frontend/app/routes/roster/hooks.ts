import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import * as api from "./api";
import type { ComplianceOverrideInput, ShiftInput } from "./types";
import {
  mapComplianceOverride,
  mapComplianceViolation,
  mapShift,
  mapStaffMember,
} from "./types";

export function useVenues() {
  return useQuery({ queryKey: ["venues"], queryFn: api.fetchVenues });
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

// A shift edit can change both its own compliance status and its
// neighbours' (e.g. editing Monday's end time changes whether Tuesday's
// shift now has enough rest) — invalidate both narrowest keys together
// rather than a blanket refetch.
function invalidateWeek(queryClient: QueryClient, venueId: string, weekStartIso: string) {
  queryClient.invalidateQueries({ queryKey: ["shifts", venueId, weekStartIso] });
  queryClient.invalidateQueries({
    queryKey: ["complianceViolations", venueId, weekStartIso],
  });
}

export function useSaveShift(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShiftInput) => api.saveShift(venueId, weekStartIso, input),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}

export function useDeleteShift(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shiftId: string) => api.deleteShift(venueId, weekStartIso, shiftId),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}

export function useBudgetTarget(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["budgetTarget", venueId, weekStartIso],
    queryFn: () => api.fetchBudgetTarget(venueId, weekStartIso),
    enabled: !!venueId,
  });
}

export function useSaveBudgetTarget(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weeklyTarget: number | null) =>
      api.saveBudgetTarget(venueId, weekStartIso, weeklyTarget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTarget", venueId, weekStartIso] });
    },
  });
}

export function useComplianceViolations(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["complianceViolations", venueId, weekStartIso],
    queryFn: async () =>
      (await api.fetchComplianceViolations(venueId, weekStartIso)).map(mapComplianceViolation),
    enabled: !!venueId,
  });
}

export function useComplianceOverrides(venueId: string, weekStartIso: string) {
  return useQuery({
    queryKey: ["complianceOverrides", venueId, weekStartIso],
    queryFn: async () =>
      (await api.fetchComplianceOverrides(venueId, weekStartIso)).map(mapComplianceOverride),
    enabled: !!venueId,
  });
}

export function useSaveComplianceOverride(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ComplianceOverrideInput) =>
      api.saveComplianceOverride(venueId, weekStartIso, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["complianceOverrides", venueId, weekStartIso],
      });
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

export function useCopyPreviousWeekRoster(venueId: string, weekStartIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.copyPreviousWeekRoster(venueId, weekStartIso),
    onSuccess: () => invalidateWeek(queryClient, venueId, weekStartIso),
  });
}
