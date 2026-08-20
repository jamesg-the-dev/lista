import { DateTime } from "luxon";

import { apiClient } from "~/lib/api-client";

import { MOCK_STAFF, MOCK_VENUES } from "./mock-data";
import type {
  BudgetSummaryDto,
  ShiftDto,
  ShiftInput,
  StaffMemberDto,
  VenueDto,
} from "./types";
import { toShiftRequestDto } from "./types";

// Venues and staff aren't backed by any of the 8 controllers covered in
// this pass (venue listing has no controller yet; staff is
// StaffController's turn) — stay mock-backed until then. Everything else
// below calls the real RosterController endpoints.

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
// Venues / staff (mock — see file header)
// ---------------------------------------------------------------------------

export async function fetchVenues(): Promise<VenueDto[]> {
  return delay(MOCK_VENUES);
}

export async function fetchStaffMembers(venueId: string): Promise<StaffMemberDto[]> {
  const staff = staffStore.filter((s) => s.venueIds.includes(venueId));
  return delay(staff.map((s) => ({ ...s })));
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
