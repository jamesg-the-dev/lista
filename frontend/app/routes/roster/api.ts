import { DateTime } from "luxon";

import { apiClient } from "~/lib/api-client";

import { MOCK_STAFF } from "./mock-data";
import type {
  BudgetSummaryDto,
  ShiftDto,
  ShiftInput,
  StaffMemberDto,
} from "./types";
import { toShiftRequestDto } from "./types";

// Roster-grid staff (role/title/rate) isn't backed by any of the 8
// controllers covered in this pass — no controller returns that shape (see
// mock-data.ts) — so it stays mock-backed. Venues now come from
// useCurrentAccount() (see hooks.ts's useVenues), not from here. Everything
// else below calls the real RosterController endpoints.

const staffStore: StaffMemberDto[] = MOCK_STAFF.map((s) => ({ ...s }));

function delay<T>(value: T, ms = 100 + Math.random() * 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function previousWeekIso(weekStartIso: string): string {
  const prev = DateTime.fromISO(weekStartIso).minus({ weeks: 1 }).toISODate();
  if (!prev) throw new Error(`Invalid weekStartIso: ${weekStartIso}`);
  return prev;
}

// ---------------------------------------------------------------------------
// Roster-grid staff (mock — see file header)
// ---------------------------------------------------------------------------

// Not filtered by venueId: the mock dataset's venueIds are illustrative
// labels ("v1"/"v2"), not real venue GUIDs, since venues are now real
// account data — every mock staff member shows up for every real venue.
export async function fetchStaffMembers(venueId: string): Promise<StaffMemberDto[]> {
  void venueId;
  return delay(staffStore.map((s) => ({ ...s })));
}

// ---------------------------------------------------------------------------
// Shifts — RosterController
// ---------------------------------------------------------------------------

export function fetchShifts(venueId: string, weekStartIso: string): Promise<ShiftDto[]> {
  const params = new URLSearchParams({ weekStart: weekStartIso });
  return apiClient.get<ShiftDto[]>(`/api/venues/${venueId}/roster?${params}`);
}

export function createShift(input: ShiftInput): Promise<ShiftDto> {
  return apiClient.post<ShiftDto>("/api/shifts", toShiftRequestDto(input));
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

export function fetchBudgetSummary(venueId: string, weekStartIso: string): Promise<BudgetSummaryDto> {
  const params = new URLSearchParams({ weekStart: weekStartIso });
  return apiClient.get<BudgetSummaryDto>(`/api/venues/${venueId}/roster/budget-summary?${params}`);
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

export function fetchPreviousWeekRoster(venueId: string, weekStartIso: string): Promise<ShiftDto[]> {
  // Reuses fetchShifts against the prior week — "no previous week" naturally
  // resolves to an empty array, not an error.
  return fetchShifts(venueId, previousWeekIso(weekStartIso));
}

export function duplicateRoster(venueId: string, weekStartIso: string): Promise<ShiftDto[]> {
  return apiClient.post<ShiftDto[]>(`/api/venues/${venueId}/roster/duplicate`, {
    sourceWeekStart: previousWeekIso(weekStartIso),
    targetWeekStart: weekStartIso,
  });
}
