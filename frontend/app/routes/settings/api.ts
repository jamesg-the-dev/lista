import { apiClient } from '~/lib/api-client';

import type {
  AwardClassificationDto,
  AwardConfigurationDto,
  AwardDto,
  AwardPayTabValue,
  PublicHolidayDto,
  RoleAwardMappingDto,
  RoleDto,
  RosterComplianceConfigurationDto,
  RosterRulesTabValue,
  TradingHourSession,
  VenueAvailabilitySettings,
  VenueHolidayOverrideDto,
  VenueProfileDto,
  VenueProfileTabValue,
} from './types';
import {
  toAddVenueHolidayOverrideRequestDto,
  toCreateRoleRequestDto,
  toSetRoleAwardMappingRequestDto,
  toTradingHourSessionInputDto,
  toUpdateAwardConfigurationRequestDto,
  toUpdateRosterComplianceConfigurationRequestDto,
  toUpdateVenueAvailabilitySettingsRequestDto,
  toUpdateVenueProfileRequestDto,
} from './types';

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

// Backed by AwardConfigurationController.

export function fetchAvailableAwards(): Promise<AwardDto[]> {
  return apiClient.get<AwardDto[]>('/api/awards');
}

export function fetchActiveAwardConfiguration(
  venueId: string,
): Promise<AwardConfigurationDto | null> {
  return apiClient.get<AwardConfigurationDto | null>(
    `/api/venues/${venueId}/award-configuration`,
  );
}

export function fetchAwardConfigurationHistory(
  venueId: string,
): Promise<AwardConfigurationDto[]> {
  return apiClient.get<AwardConfigurationDto[]>(
    `/api/venues/${venueId}/award-configuration/history`,
  );
}

export function updateAwardConfiguration(
  venueId: string,
  value: AwardPayTabValue,
): Promise<AwardConfigurationDto> {
  return apiClient.put<AwardConfigurationDto>(
    `/api/venues/${venueId}/award-configuration`,
    toUpdateAwardConfigurationRequestDto(value),
  );
}

// Backed by RosterComplianceController.

export function fetchActiveRosterComplianceConfiguration(
  venueId: string,
): Promise<RosterComplianceConfigurationDto | null> {
  return apiClient.get<RosterComplianceConfigurationDto | null>(
    `/api/venues/${venueId}/roster-compliance-configuration`,
  );
}

export function fetchRosterComplianceConfigurationHistory(
  venueId: string,
): Promise<RosterComplianceConfigurationDto[]> {
  return apiClient.get<RosterComplianceConfigurationDto[]>(
    `/api/venues/${venueId}/roster-compliance-configuration/history`,
  );
}

export function updateRosterComplianceConfiguration(
  venueId: string,
  value: RosterRulesTabValue,
): Promise<RosterComplianceConfigurationDto> {
  return apiClient.put<RosterComplianceConfigurationDto>(
    `/api/venues/${venueId}/roster-compliance-configuration`,
    toUpdateRosterComplianceConfigurationRequestDto(value),
  );
}

export function fetchPublicHolidays(
  state: string,
  from: string,
  to: string,
): Promise<PublicHolidayDto[]> {
  const params = new URLSearchParams({ state, from, to });
  return apiClient.get<PublicHolidayDto[]>(`/api/public-holidays?${params.toString()}`);
}

export function fetchVenueHolidayOverrides(venueId: string): Promise<VenueHolidayOverrideDto[]> {
  return apiClient.get<VenueHolidayOverrideDto[]>(`/api/venues/${venueId}/holiday-overrides`);
}

export function addVenueHolidayOverride(
  venueId: string,
  overrideDate: string,
  name: string,
): Promise<VenueHolidayOverrideDto> {
  return apiClient.post<VenueHolidayOverrideDto>(
    `/api/venues/${venueId}/holiday-overrides`,
    toAddVenueHolidayOverrideRequestDto(overrideDate, name),
  );
}

export function updateVenueAvailabilitySettings(
  venueId: string,
  value: VenueAvailabilitySettings,
): Promise<VenueProfileDto> {
  return apiClient.put<VenueProfileDto>(
    `/api/venues/${venueId}/availability-settings`,
    toUpdateVenueAvailabilitySettingsRequestDto(value),
  );
}

// Backed by RoleController.

export function fetchRolesForVenue(venueId: string): Promise<RoleDto[]> {
  return apiClient.get<RoleDto[]>(`/api/venues/${venueId}/roles`);
}

export function fetchUnmappedRoles(venueId: string): Promise<RoleDto[]> {
  return apiClient.get<RoleDto[]>(`/api/venues/${venueId}/roles/unmapped`);
}

export function createRole(
  venueId: string,
  displayName: string,
  colorTag: string | null,
): Promise<RoleDto> {
  return apiClient.post<RoleDto>(
    `/api/venues/${venueId}/roles`,
    toCreateRoleRequestDto(displayName, colorTag),
  );
}

export function deactivateRole(roleId: string): Promise<void> {
  return apiClient.post<void>(`/api/roles/${roleId}/deactivate`);
}

// Award classification reference data + role mapping — backed by
// AwardConfigurationController (same controller as the Award & Pay tab,
// since RoleAwardMapping's domain lives alongside AwardConfiguration — see
// FEATURE_SETTINGS_STAFF_ROLES.md §1's cross-reference).

export function fetchAwardClassifications(awardId: string): Promise<AwardClassificationDto[]> {
  return apiClient.get<AwardClassificationDto[]>(`/api/awards/${awardId}/classifications`);
}

export function setRoleAwardMapping(
  venueId: string,
  roleId: string,
  awardClassificationId: string,
): Promise<RoleAwardMappingDto> {
  return apiClient.put<RoleAwardMappingDto>(
    `/api/venues/${venueId}/role-award-mappings/${roleId}`,
    toSetRoleAwardMappingRequestDto(awardClassificationId),
  );
}
