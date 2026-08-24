import { DateTime } from 'luxon';

import { apiClient } from '~/lib/api-client';

import type { BudgetSummaryDto, ShiftDto, ShiftInput } from './types';
import { toShiftRequestDto } from './types';

// Roster-grid staff/roles now come from the real staff/settings routes'
// hooks (useStaffMembers, useRolesForVenue — see hooks.ts), not from here.
// Venues come from useCurrentAccount() (see hooks.ts's useVenues). Every
// function below calls the real RosterController endpoints.

function previousWeekIso(weekStartIso: string): string {
  const prev = DateTime.fromISO(weekStartIso).minus({ weeks: 1 }).toISODate();
  if (!prev) throw new Error(`Invalid weekStartIso: ${weekStartIso}`);
  return prev;
}

// ---------------------------------------------------------------------------
// Shifts — RosterController
// ---------------------------------------------------------------------------

export function fetchShifts(venueId: string, weekStartIso: string): Promise<ShiftDto[]> {
  const params = new URLSearchParams({ weekStart: weekStartIso });
  return apiClient.get<ShiftDto[]>(`/api/venues/${venueId}/roster?${params}`);
}

export function createShift(input: ShiftInput): Promise<ShiftDto> {
  return apiClient.post<ShiftDto>('/api/shifts', toShiftRequestDto(input));
}

export function updateShift(shiftId: string, input: ShiftInput): Promise<ShiftDto> {
  return apiClient.put<ShiftDto>(`/api/shifts/${shiftId}`, toShiftRequestDto(input));
}

export function deleteShift(shiftId: string, venueId: string): Promise<void> {
  const params = new URLSearchParams({ venueId });
  return apiClient.delete<void>(`/api/shifts/${shiftId}?${params}`);
}

// ---------------------------------------------------------------------------
// Budget — RosterController
// ---------------------------------------------------------------------------

export function fetchBudgetSummary(
  venueId: string,
  weekStartIso: string,
): Promise<BudgetSummaryDto> {
  const params = new URLSearchParams({ weekStart: weekStartIso });
  return apiClient.get<BudgetSummaryDto>(
    `/api/venues/${venueId}/roster/budget-summary?${params}`,
  );
}

export function saveForecastSalesTarget(
  venueId: string,
  forecastSalesTarget: number | null,
): Promise<void> {
  return apiClient
    .put(`/api/venues/${venueId}/roster/forecast-sales-target`, { forecastSalesTarget })
    .then(() => undefined);
}

// ---------------------------------------------------------------------------
// Copy previous week — RosterController
// ---------------------------------------------------------------------------

export function fetchPreviousWeekRoster(
  venueId: string,
  weekStartIso: string,
): Promise<ShiftDto[]> {
  // Reuses fetchShifts against the prior week — "no previous week" naturally
  // resolves to an empty array, not an error.
  return fetchShifts(venueId, previousWeekIso(weekStartIso));
}

export function duplicateRoster(
  venueId: string,
  weekStartIso: string,
): Promise<ShiftDto[]> {
  return apiClient.post<ShiftDto[]>(`/api/venues/${venueId}/roster/duplicate`, {
    sourceWeekStart: previousWeekIso(weekStartIso),
    targetWeekStart: weekStartIso,
  });
}

// ---------------------------------------------------------------------------
// Compliance overrides — ComplianceController
// ---------------------------------------------------------------------------

// violationType is already the wire enum member name (e.g. "InsufficientRest")
// — callers pass unmapViolationType(view-model value), same convention as
// the route segment documented on ComplianceController.OverrideComplianceViolation.
export function overrideComplianceViolation(
  shiftId: string,
  venueId: string,
  violationType: string,
  reason: string,
): Promise<ShiftDto> {
  const params = new URLSearchParams({ venueId });
  return apiClient.post<ShiftDto>(
    `/api/shifts/${shiftId}/compliance-violations/${violationType}/override?${params}`,
    { reason },
  );
}
