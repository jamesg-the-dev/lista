import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { currentAccountQueryOptions } from '~/lib/account/hooks';

import * as api from './api';
import type { TradingHourSession, VenueProfileTabValue } from './types';
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
