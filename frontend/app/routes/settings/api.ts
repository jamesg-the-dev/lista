import { apiClient } from '~/lib/api-client';

import type { TradingHourSession, VenueProfileDto, VenueProfileTabValue } from './types';
import { toTradingHourSessionInputDto, toUpdateVenueProfileRequestDto } from './types';

// Backed by VenueController (backend/src/RosterApp.Api/Controllers/
// VenueController.cs). Creation (POST /api/organisations/{id}/venues) and
// org-wide listing aren't called from here yet — the venue switcher sources
// its list from useCurrentAccount() instead, matching the existing
// staff/roster convention (see staff/types.ts's file header).

export function fetchVenueProfile(venueId: string): Promise<VenueProfileDto> {
  return apiClient.get<VenueProfileDto>(`/api/venues/${venueId}/profile`);
}

export function updateVenueProfile(
  venueId: string,
  value: VenueProfileTabValue,
): Promise<VenueProfileDto> {
  return apiClient.put<VenueProfileDto>(
    `/api/venues/${venueId}/profile`,
    toUpdateVenueProfileRequestDto(value),
  );
}

export function updateVenueTradingHours(
  venueId: string,
  sessions: TradingHourSession[],
): Promise<VenueProfileDto> {
  return apiClient.put<VenueProfileDto>(`/api/venues/${venueId}/trading-hours`, {
    sessions: sessions.map(toTradingHourSessionInputDto),
  });
}
