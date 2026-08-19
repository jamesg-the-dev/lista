import { DateTime } from "luxon";

import { evaluateComplianceViolations } from "./compliance";
import {
  MOCK_BUDGET_TARGETS,
  MOCK_SHIFTS,
  MOCK_STAFF,
  MOCK_VENUES,
} from "./mock-data";
import type {
  BudgetTargetDto,
  ComplianceOverrideDto,
  ComplianceOverrideInput,
  ComplianceViolationDto,
  ShiftDto,
  ShiftInput,
  StaffMemberDto,
  VenueDto,
} from "./types";
import { toShiftDto } from "./types";

// Stubbed API layer backed by an in-memory mock dataset. Real function
// signatures, called with an artificial delay so loading states are
// exercised for real. When the backend exists, mock-data.ts gets deleted
// and only the body of each function below changes to a real fetch call —
// hooks.ts, and every component, stay untouched. Follows the same pattern
// as routes/staff/api.ts.

const staffStore: StaffMemberDto[] = MOCK_STAFF.map((s) => ({ ...s }));
const shiftsStore: Record<string, ShiftDto[]> = Object.fromEntries(
  Object.entries(MOCK_SHIFTS).map(([key, shifts]) => [key, shifts.map((s) => ({ ...s }))]),
);
const budgetTargetStore: Record<string, number | null> = Object.fromEntries(
  Object.entries(MOCK_BUDGET_TARGETS).map(([venueId, dto]) => [venueId, dto.weeklyTarget]),
);
const overridesStore: Record<string, ComplianceOverrideDto[]> = {};

function delay<T>(value: T, ms = 150 + Math.random() * 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function weekKey(venueId: string, weekStartIso: string): string {
  return `${venueId}:${weekStartIso}`;
}

function previousWeekIso(weekStartIso: string): string {
  const prev = DateTime.fromISO(weekStartIso).minus({ weeks: 1 }).toISODate();
  if (!prev) throw new Error(`Invalid weekStartIso: ${weekStartIso}`);
  return prev;
}

// ---------------------------------------------------------------------------
// Venues / staff
// ---------------------------------------------------------------------------

export async function fetchVenues(): Promise<VenueDto[]> {
  return delay(MOCK_VENUES);
}

export async function fetchStaffMembers(venueId: string): Promise<StaffMemberDto[]> {
  const staff = staffStore.filter((s) => s.venueIds.includes(venueId));
  return delay(staff.map((s) => ({ ...s })));
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

export async function fetchShifts(venueId: string, weekStartIso: string): Promise<ShiftDto[]> {
  const shifts = shiftsStore[weekKey(venueId, weekStartIso)] ?? [];
  return delay(shifts.map((s) => ({ ...s })));
}

// Upsert, keyed by the client-generated id — see ShiftInput in types.ts for
// why the id is always client-supplied rather than server-generated.
export async function saveShift(
  venueId: string,
  weekStartIso: string,
  input: ShiftInput,
): Promise<ShiftDto> {
  const dto = toShiftDto(input);
  const key = weekKey(venueId, weekStartIso);
  const list = shiftsStore[key] ? [...shiftsStore[key]] : [];
  const existingIndex = list.findIndex((s) => s.id === dto.id);
  if (existingIndex === -1) {
    shiftsStore[key] = [...list, dto];
  } else {
    list[existingIndex] = dto;
    shiftsStore[key] = list;
  }
  return delay({ ...dto });
}

export async function deleteShift(
  venueId: string,
  weekStartIso: string,
  shiftId: string,
): Promise<void> {
  const key = weekKey(venueId, weekStartIso);
  shiftsStore[key] = (shiftsStore[key] ?? []).filter((s) => s.id !== shiftId);
  return delay(undefined);
}

// ---------------------------------------------------------------------------
// Budget target
// ---------------------------------------------------------------------------

// weekStartIso is accepted alongside venueId (not just venueId) so this can
// become week-scoped later without a signature change — MVP keeps a single
// target per venue, per CLAUDE.md's "simple input is fine for MVP" call for
// this feature, so it isn't read below.
export async function fetchBudgetTarget(
  venueId: string,
  weekStartIso: string,
): Promise<BudgetTargetDto> {
  void weekStartIso;
  return delay({ venueId, weeklyTarget: budgetTargetStore[venueId] ?? null });
}

export async function saveBudgetTarget(
  venueId: string,
  weekStartIso: string,
  weeklyTarget: number | null,
): Promise<BudgetTargetDto> {
  void weekStartIso;
  budgetTargetStore[venueId] = weeklyTarget;
  return delay({ venueId, weeklyTarget });
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export async function fetchComplianceViolations(
  venueId: string,
  weekStartIso: string,
): Promise<ComplianceViolationDto[]> {
  const shifts = shiftsStore[weekKey(venueId, weekStartIso)] ?? [];
  const staff = staffStore.filter((s) => s.venueIds.includes(venueId));
  const weekStart = DateTime.fromISO(weekStartIso);
  return delay(evaluateComplianceViolations(weekStart, shifts, staff));
}

export async function fetchComplianceOverrides(
  venueId: string,
  weekStartIso: string,
): Promise<ComplianceOverrideDto[]> {
  return delay(overridesStore[weekKey(venueId, weekStartIso)] ?? []);
}

export async function saveComplianceOverride(
  venueId: string,
  weekStartIso: string,
  input: ComplianceOverrideInput,
): Promise<ComplianceOverrideDto> {
  const key = weekKey(venueId, weekStartIso);
  const created: ComplianceOverrideDto = {
    violationId: input.violationId,
    reason: input.reason,
    createdAtUtc: new Date().toISOString(),
  };
  const existing = (overridesStore[key] ?? []).filter(
    (o) => o.violationId !== input.violationId,
  );
  overridesStore[key] = [...existing, created];
  return delay({ ...created });
}

// ---------------------------------------------------------------------------
// Copy previous week
// ---------------------------------------------------------------------------

export async function fetchPreviousWeekRoster(
  venueId: string,
  weekStartIso: string,
): Promise<ShiftDto[]> {
  // Reuses fetchShifts against the prior week's key rather than duplicating
  // the lookup — "no previous week" naturally resolves to an empty array,
  // not an error.
  return fetchShifts(venueId, previousWeekIso(weekStartIso));
}

export async function copyPreviousWeekRoster(
  venueId: string,
  weekStartIso: string,
): Promise<ShiftDto[]> {
  const previous = shiftsStore[weekKey(venueId, previousWeekIso(weekStartIso))] ?? [];
  const cloned = previous.map((s) => ({ ...s, id: crypto.randomUUID() }));
  shiftsStore[weekKey(venueId, weekStartIso)] = cloned;
  return delay(cloned.map((s) => ({ ...s })));
}
