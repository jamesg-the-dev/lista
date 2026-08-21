import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { currentAccountQueryOptions } from '~/lib/account/hooks';

import * as api from './api';
import type {
  AwardPayTabValue,
  RosterRulesTabValue,
  TradingHourSession,
  VenueProfileTabValue,
} from './types';
import { mapVenueProfile } from './types';

// Same sourcing as staff/hooks.ts's useVenues — no controller lists venues
// on its own, so useCurrentAccount() remains the allowed source per
// CLAUDE.md until a dedicated venues endpoint is wired into the frontend.
export function useVenues() {
  return useQuery({
    ...currentAccountQueryOptions,
    select: account => account.venues.map(v => ({ id: v.venueId, name: v.name })),
  });
}

export function useVenueProfile(venueId: string) {
  return useQuery({
    queryKey: ['settings', 'venue-profile', venueId],
    queryFn: async () => mapVenueProfile(await api.fetchVenueProfile(venueId)),
    enabled: !!venueId,
  });
}

export function useUpdateVenueProfile(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: VenueProfileTabValue) => api.updateVenueProfile(venueId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'venue-profile', venueId] });
    },
  });
}

export function useUpdateVenueTradingHours(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessions: TradingHourSession[]) =>
      api.updateVenueTradingHours(venueId, sessions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'venue-profile', venueId] });
    },
  });
}

// Award reference data — system-maintained, doesn't vary per venue, so it's
// cached under its own key without a venueId in it.
export function useAvailableAwards() {
  return useQuery({
    queryKey: ['settings', 'awards'],
    queryFn: api.fetchAvailableAwards,
  });
}

export function useActiveAwardConfiguration(venueId: string) {
  return useQuery({
    queryKey: ['settings', 'award-configuration', venueId],
    queryFn: () => api.fetchActiveAwardConfiguration(venueId),
    enabled: !!venueId,
  });
}

export function useAwardConfigurationHistory(venueId: string) {
  return useQuery({
    queryKey: ['settings', 'award-configuration', venueId, 'history'],
    queryFn: () => api.fetchAwardConfigurationHistory(venueId),
    enabled: !!venueId,
  });
}

export function useUpdateAwardConfiguration(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: AwardPayTabValue) => api.updateAwardConfiguration(venueId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['settings', 'award-configuration', venueId],
      });
    },
  });
}

export function useActiveRosterComplianceConfiguration(venueId: string) {
  return useQuery({
    queryKey: ['settings', 'roster-compliance-configuration', venueId],
    queryFn: () => api.fetchActiveRosterComplianceConfiguration(venueId),
    enabled: !!venueId,
  });
}

export function useRosterComplianceConfigurationHistory(venueId: string) {
  return useQuery({
    queryKey: ['settings', 'roster-compliance-configuration', venueId, 'history'],
    queryFn: () => api.fetchRosterComplianceConfigurationHistory(venueId),
    enabled: !!venueId,
  });
}

export function useUpdateRosterComplianceConfiguration(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: RosterRulesTabValue) =>
      api.updateRosterComplianceConfiguration(venueId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['settings', 'roster-compliance-configuration', venueId],
      });
    },
  });
}

// System-wide reference data keyed by state, not by venue — same treatment
// as useAvailableAwards.
export function usePublicHolidays(state: string, from: string, to: string) {
  return useQuery({
    queryKey: ['settings', 'public-holidays', state, from, to],
    queryFn: () => api.fetchPublicHolidays(state, from, to),
    enabled: !!state,
  });
}

export function useVenueHolidayOverrides(venueId: string) {
  return useQuery({
    queryKey: ['settings', 'holiday-overrides', venueId],
    queryFn: () => api.fetchVenueHolidayOverrides(venueId),
    enabled: !!venueId,
  });
}

export function useAddVenueHolidayOverride(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ overrideDate, name }: { overrideDate: string; name: string }) =>
      api.addVenueHolidayOverride(venueId, overrideDate, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'holiday-overrides', venueId] });
    },
  });
}
