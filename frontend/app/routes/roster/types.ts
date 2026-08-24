// Roster builder wire types + view models. Follows CLAUDE.md's "wire type
// vs view model" convention: DTOs match the backend query/command shape,
// view models are what components consume. Mapping happens once, at the
// boundary, in the mapXxx/toXxxDto functions below.
//
// Shift/AwardBreakdown/ComplianceViolation mirror
// backend/src/RosterApp.Application/Rostering/{ShiftDto,CreateShiftCommand,
// UpdateShiftCommand,GetBudgetSummaryQuery}.cs and
// RosterController.cs exactly. Per CLAUDE.md's wire-format-for-enums rule,
// every enum on these DTOs is the exact C# member name string (e.g.
// "Draft", "InsufficientRest") — never an int. TimeOnly fields serialize as
// "HH:mm:ss" (System.Text.Json's default TimeOnly converter); the view
// model strips the seconds since the UI only edits to the minute.
//
// Staff and Role are real, cross-route data: StaffMember is owned by the
// `staff` route, Role by the `settings` route (both per CLAUDE.md's
// route-ownership convention) — this route imports those types/hooks
// directly rather than duplicating the DTO shapes, same pattern
// settings/components/StaffTable.tsx already establishes. Venue has no
// controller of its own, so it's sourced from useCurrentAccount()'s venues
// instead (see hooks.ts's useVenues).

import { DateTime, Duration, Interval } from 'luxon';

import type { Role } from '~/routes/settings/types';
import type { StaffMember } from '~/routes/staff/types';

export type { Role } from '~/routes/settings/types';
export type { StaffMember } from '~/routes/staff/types';

function mustMapWireEnum<T extends string>(
  wire: string,
  table: Record<string, T>,
  enumName: string,
): T {
  const mapped = table[wire];
  if (mapped === undefined) {
    throw new Error(`Unknown ${enumName} wire value: ${wire}`);
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Venue — sourced from useCurrentAccount()'s venues (see file header), not
// its own endpoint or mock data.
// ---------------------------------------------------------------------------

export interface Venue {
  id: string;
  name: string;
}

export function mustFindVenue(venues: Venue[], venueId: string): Venue {
  const venue = venues.find(v => v.id === venueId);
  if (!venue) throw new Error(`Unknown venue id: ${venueId}`);
  return venue;
}

// ---------------------------------------------------------------------------
// Role badge color — arbitrary per-venue Role.colorTag (a hex string, e.g.
// "#4C9A8E"; see settings/types.ts's ROLE_COLOR_SWATCHES/RoleList.tsx,
// which already renders this same field). Role colors are functional (role
// identity), not decorative — the one deliberate exception to "no inline
// var(--token) styles" in docs/design-system.md — so using the raw hex
// value directly via inline style here is consistent with that carve-out,
// not a violation of it. A neutral gray stands in for staff with no
// resolvable role (no primaryRoleId, or the role was deactivated).
// ---------------------------------------------------------------------------

const NEUTRAL_ROLE_COLOR = 'var(--muted-foreground)';

export function roleColor(role: Role | null | undefined): string {
  return role?.colorTag ?? NEUTRAL_ROLE_COLOR;
}

// Dim background tint, derived from the one real color the data gives us
// (unlike the old fixed 4-role palette, which hardcoded a matching tint per
// role) via color-mix rather than a second stored value.
export function roleTint(role: Role | null | undefined): string {
  return `color-mix(in srgb, ${roleColor(role)} 20%, var(--background))`;
}

export function roleLetter(role: Role | null | undefined): string {
  return role?.displayName.charAt(0).toUpperCase() ?? '–';
}

// ---------------------------------------------------------------------------
// Staff rate resolution — a shift's base hourly rate is award-derived, per
// docs/features/FEATURE_SETTINGS_STAFF_ROLES.md: staff.primaryRoleId's
// mapped award classification's currently-active AwardRate.BaseHourlyRate
// (Role.mappedAwardClassificationBaseHourlyRate, sourced by
// GetRolesForVenueQuery — see backend RoleLookup.cs), with the staff
// member's optional payRateOverride applied on top when set. 'unresolved'
// (no role, or the role isn't award-mapped) is a real, expected state — the
// roster builder warns rather than guessing a number (see
// ShiftEditorPanel.tsx), matching CLAUDE.md's transparency principle: never
// silently invent pay-affecting figures.
// ---------------------------------------------------------------------------

export type StaffRateSource = 'override' | 'award' | 'unresolved';

export interface StaffRate {
  rate: number | null;
  source: StaffRateSource;
}

export function resolveStaffRate(
  staff: StaffMember | null | undefined,
  role: Role | null | undefined,
): StaffRate {
  if (staff?.payRateOverride) {
    return { rate: staff.payRateOverride.overrideHourlyRate, source: 'override' };
  }
  if (role?.mappedAwardClassificationBaseHourlyRate != null) {
    return { rate: role.mappedAwardClassificationBaseHourlyRate, source: 'award' };
  }
  return { rate: null, source: 'unresolved' };
}

// ---------------------------------------------------------------------------
// Day of week — 0=Mon..6=Sun. The grid is organised by day-of-week column
// within the selected week; the wire model underneath is an absolute
// shiftDate (see Shift below), so dayOfWeekForDate/dateForDay convert
// between the two at the UI boundary.
// ---------------------------------------------------------------------------

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function dateForDay(weekStart: DateTime, dayOfWeek: number): DateTime {
  return weekStart.plus({ days: dayOfWeek });
}

export function dayOfWeekForDate(shiftDateIso: string): DayOfWeek {
  const dt = DateTime.fromISO(shiftDateIso);
  return (dt.weekday - 1) as DayOfWeek; // Luxon weekday: 1=Mon..7=Sun
}

// ---------------------------------------------------------------------------
// Award rate breakdown — receipt-style, per CLAUDE.md's transparency
// principle. Server-computed and returned itemised on every ShiftDto once a
// shift is saved (backend/.../ShiftDto.cs's AwardBreakdownLineDto). No
// enum/date fields, so wire and view model are the same shape.
// ---------------------------------------------------------------------------

export interface AwardBreakdownLineDto {
  label: string;
  hours: number;
  ratePerHour: number;
  amount: number;
}
export type AwardBreakdownLine = AwardBreakdownLineDto;

export function totalAwardCost(breakdown: AwardBreakdownLine[]): number {
  return breakdown.reduce((sum, line) => sum + line.amount, 0);
}

// ---------------------------------------------------------------------------
// Live preview rate calculation — used only for the shift editor's
// receipt-style preview BEFORE a shift is saved (there is no
// preview/dry-run endpoint on RosterController; IAwardRateCalculator only
// runs inside CreateShift/UpdateShift's handlers). Once a shift exists, its
// real awardBreakdown (above) is the source of truth — this mirrors the
// same MA000009-illustrative rules purely so the preview doesn't visibly
// diverge from what the server will compute on save. Same disclaimer as
// CLAUDE.md § Award compliance: illustrative only, not verified.
// ---------------------------------------------------------------------------

export interface RateInfo {
  grossHrs: number;
  paidHrs: number;
  multiplier: number;
  label: string;
  cost: number | null; // null when the staff member's rate is unresolved (see resolveStaffRate)
}

export function getRateInfo(
  weekStart: DateTime,
  dayOfWeek: number,
  start: string,
  end: string,
  unpaidBreakMinutes: number,
  baseRate: number | null,
): RateInfo {
  const date = dateForDay(weekStart, dayOfWeek);
  const startDT = DateTime.fromISO(`${date.toISODate()}T${start}`);
  let endDT = DateTime.fromISO(`${date.toISODate()}T${end}`);
  // Overnight shifts (end time past midnight) roll onto the next calendar
  // day so the interval below is correct by construction — no manual
  // hour-wraparound arithmetic.
  if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

  const grossHrs = Interval.fromDateTimes(startDT, endDT).length('hours');
  const breakHrs = Duration.fromObject({ minutes: unpaidBreakMinutes }).as('hours');
  const paidHrs = Math.max(0, grossHrs - breakHrs);

  let multiplier = 1;
  let label = 'Ordinary hours';
  if (dayOfWeek === 5) {
    multiplier = 1.25;
    label = 'Saturday penalty +25%';
  } else if (dayOfWeek === 6) {
    multiplier = 1.5;
    label = 'Sunday penalty +50%';
  } else if (endDT.hour + endDT.minute / 60 > 19) {
    multiplier = 1.1;
    label = 'Weekday evening loading +10%';
  }

  const cost = baseRate === null ? null : paidHrs * baseRate * multiplier;
  return { grossHrs, paidHrs, multiplier, label, cost };
}

export function currency(n: number): string {
  return n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  });
}
export function currency2(n: number): string {
  return n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  });
}
export function formatHoursDuration(hours: number): string {
  const dur = Duration.fromObject({ hours }).shiftTo('hours', 'minutes');
  const h = Math.trunc(dur.hours);
  const m = Math.round(dur.minutes);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Compliance violations — mirrors backend ComplianceViolationDto exactly:
// itemised per shift, embedded directly on ShiftDto (no separate
// fetch/endpoint), each carrying its own Acknowledged/OverrideReason state
// rather than joining against a separate overrides list. Never flattened to
// a boolean "isCompliant" flag: a manager needs to see *which* rule fired to
// make an informed override decision. Backend has no violation id field —
// `type` is unique per shift (one violation per rule), so it doubles as the
// stable React list key within a given shift's violations array.
//
// Writing an override goes through ComplianceController's
// OverrideComplianceViolationCommand (see api.ts's overrideComplianceViolation
// and hooks.ts's useOverrideComplianceViolation) — unmapViolationType below
// converts the view-model union back to the wire enum member name for the
// route segment, same convention as toShiftRequestDto for the command body.
// ---------------------------------------------------------------------------

const VIOLATION_TYPE_TABLE: Record<string, ComplianceViolationType> = {
  InsufficientRest: 'insufficient_rest',
  MissingBreak: 'missing_break',
  SpanOfHoursExceeded: 'span_of_hours_exceeded',
  MaxConsecutiveDays: 'max_consecutive_days',
};
export type ComplianceViolationType =
  | 'insufficient_rest'
  | 'missing_break'
  | 'span_of_hours_exceeded'
  | 'max_consecutive_days';

export function mapViolationType(wire: string): ComplianceViolationType {
  return mustMapWireEnum(wire, VIOLATION_TYPE_TABLE, 'ComplianceViolationType');
}

const VIOLATION_TYPE_WIRE_TABLE: Record<ComplianceViolationType, string> = {
  insufficient_rest: 'InsufficientRest',
  missing_break: 'MissingBreak',
  span_of_hours_exceeded: 'SpanOfHoursExceeded',
  max_consecutive_days: 'MaxConsecutiveDays',
};

export function unmapViolationType(value: ComplianceViolationType): string {
  return VIOLATION_TYPE_WIRE_TABLE[value];
}

export const VIOLATION_TYPE_META: Record<ComplianceViolationType, { label: string }> = {
  insufficient_rest: { label: 'Insufficient rest' },
  missing_break: { label: 'Missing break' },
  span_of_hours_exceeded: { label: 'Span of hours exceeded' },
  max_consecutive_days: { label: 'Max consecutive days' },
};

const SEVERITY_TABLE: Record<string, ComplianceSeverity> = {
  Warning: 'warning',
  Blocking: 'blocking',
};
export type ComplianceSeverity = 'warning' | 'blocking';

export function mapSeverity(wire: string): ComplianceSeverity {
  return mustMapWireEnum(wire, SEVERITY_TABLE, 'ComplianceSeverity');
}

export interface ComplianceViolationDto {
  type: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  overrideReason: string | null;
}

export interface ComplianceViolation {
  type: ComplianceViolationType;
  severity: ComplianceSeverity;
  message: string;
  acknowledged: boolean;
  overrideReason: string | null;
}

export function mapComplianceViolation(dto: ComplianceViolationDto): ComplianceViolation {
  return {
    type: mapViolationType(dto.type),
    severity: mapSeverity(dto.severity),
    message: dto.message,
    acknowledged: dto.acknowledged,
    overrideReason: dto.overrideReason,
  };
}

// ---------------------------------------------------------------------------
// Shift — backend/src/RosterApp.Application/Rostering/ShiftDto.cs. Response
// shape for GetRosterForWeek / CreateShift / UpdateShift / DuplicateRoster.
// ---------------------------------------------------------------------------

export type ShiftStatus = 'draft' | 'published' | 'confirmed' | 'cancelled';

const SHIFT_STATUS_TABLE: Record<string, ShiftStatus> = {
  Draft: 'draft',
  Published: 'published',
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
};

export function mapShiftStatus(wire: string): ShiftStatus {
  return mustMapWireEnum(wire, SHIFT_STATUS_TABLE, 'ShiftStatus');
}

export interface ShiftDto {
  id: string;
  venueId: string;
  employeeId: string;
  shiftDate: string; // DateOnly, "yyyy-MM-dd"
  start: string; // TimeOnly, "HH:mm:ss"
  end: string; // TimeOnly, "HH:mm:ss" — may be past midnight, rolls to the next day
  unpaidBreakMinutes: number;
  baseRatePerHour: number;
  status: string;
  awardBreakdown: AwardBreakdownLineDto[];
  complianceViolations: ComplianceViolationDto[];
}

export interface Shift {
  id: string;
  venueId: string;
  employeeId: string;
  shiftDate: string;
  start: string; // "HH:mm" — seconds stripped, matches the <input type="time"> value format
  end: string;
  unpaidBreakMinutes: number;
  baseRatePerHour: number;
  status: ShiftStatus;
  awardBreakdown: AwardBreakdownLine[];
  complianceViolations: ComplianceViolation[];
}

function fromWireTime(hhmmss: string): string {
  return hhmmss.slice(0, 5);
}
function toWireTime(hhmm: string): string {
  return `${hhmm}:00`;
}

export function mapShift(dto: ShiftDto): Shift {
  return {
    id: dto.id,
    venueId: dto.venueId,
    employeeId: dto.employeeId,
    shiftDate: dto.shiftDate,
    start: fromWireTime(dto.start),
    end: fromWireTime(dto.end),
    unpaidBreakMinutes: dto.unpaidBreakMinutes,
    baseRatePerHour: dto.baseRatePerHour,
    status: mapShiftStatus(dto.status),
    awardBreakdown: dto.awardBreakdown,
    complianceViolations: dto.complianceViolations.map(mapComplianceViolation),
  };
}

export interface ShiftDraft {
  start: string; // "HH:mm"
  end: string;
  unpaidBreakMinutes: number;
}

// CreateShiftCommand takes no client id — the server generates it. Used for
// both create (POST /api/shifts) and, with a shiftId, update
// (PUT /api/shifts/{id}) — UpdateShiftRequest's body is otherwise identical.
export interface ShiftInput {
  venueId: string;
  employeeId: string;
  shiftDate: string; // ISO date
  start: string; // "HH:mm"
  end: string;
  unpaidBreakMinutes: number;
  baseRatePerHour: number;
}

export function toShiftRequestDto(input: ShiftInput) {
  return {
    venueId: input.venueId,
    employeeId: input.employeeId,
    shiftDate: input.shiftDate,
    start: toWireTime(input.start),
    end: toWireTime(input.end),
    unpaidBreakMinutes: input.unpaidBreakMinutes,
    baseRatePerHour: input.baseRatePerHour,
  };
}

export type ShiftsByKey = Record<string, Shift[] | undefined>;

export function shiftKey(employeeId: string, dayOfWeek: number): string {
  return `${employeeId}-${dayOfWeek}`;
}

export function groupShiftsByStaffDay(shifts: Shift[]): ShiftsByKey {
  const grouped: ShiftsByKey = {};
  for (const shift of shifts) {
    const key = shiftKey(shift.employeeId, dayOfWeekForDate(shift.shiftDate));
    grouped[key] = [...(grouped[key] ?? []), shift];
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// Live labour budget — backend/.../GetBudgetSummaryQuery.cs +
// SetVenueForecastSalesTargetCommand.cs. TotalCost is a server-side
// aggregation over the week's shifts (not re-summed client-side) —
// reuses the award-breakdown data already computed per shift, per
// CLAUDE.md; the day-by-day cost strip in the grid still sums each shift's
// own awardBreakdown client-side purely for the chart's relative bar
// heights, not as a competing source of truth for the weekly total.
// ---------------------------------------------------------------------------

export interface BudgetSummaryDto {
  venueId: string;
  weekStart: string;
  totalCost: number;
  forecastSalesTarget: number | null;
  percentOfTarget: number | null;
}
export type BudgetSummary = BudgetSummaryDto;

export type BudgetStatus = 'no_target' | 'under' | 'near' | 'over';

export function getBudgetStatus(
  weeklyTotal: number,
  target: number | null,
): BudgetStatus {
  if (target === null || target <= 0) return 'no_target';
  const pctUsed = weeklyTotal / target;
  if (pctUsed > 1) return 'over';
  if (pctUsed >= 0.9) return 'near';
  return 'under';
}
