// Roster builder wire types + view models. Follows CLAUDE.md's "wire type
// vs view model" convention: DTOs match the backend query/command shape
// (enums as ints, dates/times as ISO strings), view models are what
// components consume (string unions). Mapping happens once, at the
// boundary, in the mapXxx/toXxxDto functions below — mirrors the pattern
// established in routes/staff/types.ts.

import { DateTime, Duration, Interval } from "luxon";

function mustMapEnum<T extends string>(
  value: number,
  table: readonly T[],
  enumName: string,
): T {
  const mapped = table[value];
  if (mapped === undefined) {
    throw new Error(`Unknown ${enumName} value: ${value}`);
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Venue
// ---------------------------------------------------------------------------

export interface VenueDto {
  id: string;
  name: string;
  suburb: string;
}
export type Venue = VenueDto;

export function mustFindVenue(venues: Venue[], venueId: string): Venue {
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) throw new Error(`Unknown venue id: ${venueId}`);
  return venue;
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

const ROLE_TABLE = ["kitchen", "floor", "bar", "manager"] as const;
export type Role = (typeof ROLE_TABLE)[number];

export function mapRole(value: number): Role {
  return mustMapEnum(value, ROLE_TABLE, "Role");
}
export function unmapRole(value: Role): number {
  return ROLE_TABLE.indexOf(value);
}

export interface RoleMeta {
  label: string;
  color: string;
  tint: string;
  letter: string;
}

// Role colors are our only custom-hue tokens — functional (role identity),
// not decorative. See docs/design-system.md § Role colors.
export const ROLE_META: Record<Role, RoleMeta> = {
  kitchen: { label: "Kitchen", color: "#B85C2E", tint: "#3A2519", letter: "K" },
  floor: { label: "Floor", color: "#4C9A8E", tint: "#173029", letter: "F" },
  bar: { label: "Bar", color: "#C9A227", tint: "#332B0E", letter: "B" },
  manager: { label: "Manager", color: "#7D8CC4", tint: "#232A42", letter: "M" },
};

// ---------------------------------------------------------------------------
// Staff member (roster-scoped subset — the full profile, availability, and
// leave data lives in routes/staff; this is only what the grid/panel need).
// ---------------------------------------------------------------------------

export interface StaffMemberDto {
  id: string;
  name: string;
  role: number;
  title: string;
  rate: number;
  venueIds: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  title: string;
  rate: number;
  venueIds: string[];
}

export function mapStaffMember(dto: StaffMemberDto): StaffMember {
  return {
    id: dto.id,
    name: dto.name,
    role: mapRole(dto.role),
    title: dto.title,
    rate: dto.rate,
    venueIds: dto.venueIds,
  };
}

export function mustFindStaff(staff: StaffMember[], staffId: string): StaffMember {
  const member = staff.find((s) => s.id === staffId);
  if (!member) throw new Error(`Unknown staff id: ${staffId}`);
  return member;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Day of week — 0=Mon..6=Sun, matching routes/staff's convention.
// ---------------------------------------------------------------------------

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function dateForDay(weekStart: DateTime, dayOfWeek: number): DateTime {
  return weekStart.plus({ days: dayOfWeek });
}

// ---------------------------------------------------------------------------
// Shift
// ---------------------------------------------------------------------------

export interface ShiftDto {
  id: string;
  staffId: string;
  dayOfWeek: number;
  start: string; // "HH:mm"
  end: string; // "HH:mm" — may be past midnight, rolls to the next day
  breakMins: number;
}

export interface Shift {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  start: string;
  end: string;
  breakMins: number;
}

export function mapShift(dto: ShiftDto): Shift {
  return {
    id: dto.id,
    staffId: dto.staffId,
    dayOfWeek: dto.dayOfWeek as DayOfWeek,
    start: dto.start,
    end: dto.end,
    breakMins: dto.breakMins,
  };
}

export interface ShiftDraft {
  start: string;
  end: string;
  breakMins: number;
}

// The client always generates the id (at "add shift" time, not on save) so
// that compliance-violation ids — deterministically derived from shift id —
// stay stable between the live preview shown while editing and the
// persisted result after saving. See ComplianceViolationDto below.
export interface ShiftInput extends ShiftDraft {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
}

export function toShiftDto(input: ShiftInput): ShiftDto {
  return {
    id: input.id,
    staffId: input.staffId,
    dayOfWeek: input.dayOfWeek,
    start: input.start,
    end: input.end,
    breakMins: input.breakMins,
  };
}

export type ShiftsByKey = Record<string, Shift[] | undefined>;

export function shiftKey(staffId: string, dayOfWeek: number): string {
  return `${staffId}-${dayOfWeek}`;
}

export function groupShiftsByStaffDay(shifts: Shift[]): ShiftsByKey {
  const grouped: ShiftsByKey = {};
  for (const shift of shifts) {
    const key = shiftKey(shift.staffId, shift.dayOfWeek);
    grouped[key] = [...(grouped[key] ?? []), shift];
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// Award rate breakdown — receipt-style, per CLAUDE.md's transparency
// principle. Same MA000009-illustrative rules as before, unchanged: ordinary
// hours, Saturday +25%, Sunday +50%, weekday evening (after 7pm) +10%. This
// is a UI/aggregation concern reusing IAwardRateCalculator's illustrative
// output shape — not a change to the pricing rules themselves.
// ---------------------------------------------------------------------------

export interface RateInfo {
  grossHrs: number;
  paidHrs: number;
  multiplier: number;
  label: string;
  cost: number;
}

export function getRateInfo(
  weekStart: DateTime,
  dayOfWeek: number,
  start: string,
  end: string,
  breakMins: number,
  baseRate: number,
): RateInfo {
  const date = dateForDay(weekStart, dayOfWeek);
  const startDT = DateTime.fromISO(`${date.toISODate()}T${start}`);
  let endDT = DateTime.fromISO(`${date.toISODate()}T${end}`);
  // Overnight shifts (end time past midnight) roll onto the next calendar
  // day so the interval below is correct by construction — no manual
  // hour-wraparound arithmetic.
  if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

  const grossHrs = Interval.fromDateTimes(startDT, endDT).length("hours");
  const breakHrs = Duration.fromObject({ minutes: breakMins }).as("hours");
  const paidHrs = Math.max(0, grossHrs - breakHrs);

  let multiplier = 1;
  let label = "Ordinary hours";
  if (dayOfWeek === 5) {
    multiplier = 1.25;
    label = "Saturday penalty +25%";
  } else if (dayOfWeek === 6) {
    multiplier = 1.5;
    label = "Sunday penalty +50%";
  } else if (endDT.hour + endDT.minute / 60 > 19) {
    multiplier = 1.1;
    label = "Weekday evening loading +10%";
  }

  const cost = paidHrs * baseRate * multiplier;
  return { grossHrs, paidHrs, multiplier, label, cost };
}

export function currency(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}
export function currency2(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}
export function formatHoursDuration(hours: number): string {
  const dur = Duration.fromObject({ hours }).shiftTo("hours", "minutes");
  const h = Math.trunc(dur.hours);
  const m = Math.round(dur.minutes);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Live labour budget target — settable per-venue weekly $ figure. Reuses the
// award-breakdown cost data already computed per shift; this is aggregation,
// not a new pricing engine.
// ---------------------------------------------------------------------------

export interface BudgetTargetDto {
  venueId: string;
  weeklyTarget: number | null;
}
export type BudgetTarget = BudgetTargetDto;

export type BudgetStatus = "no_target" | "under" | "near" | "over";

export function getBudgetStatus(
  weeklyTotal: number,
  target: number | null,
): BudgetStatus {
  if (target === null || target <= 0) return "no_target";
  const pctUsed = weeklyTotal / target;
  if (pctUsed > 1) return "over";
  if (pctUsed >= 0.9) return "near";
  return "under";
}

// ---------------------------------------------------------------------------
// Compliance violations — mirrors CLAUDE.md's IRosterComplianceValidator
// record shape (Type/Severity/Message) exactly, so the eventual real
// contract is a non-event. Itemised per shift, never flattened to a boolean
// "isCompliant" flag: a manager needs to see *which* rule fired to make an
// informed override decision.
// ---------------------------------------------------------------------------

const VIOLATION_TYPE_TABLE = [
  "insufficient_rest",
  "missing_break",
  "span_of_hours_exceeded",
  "max_consecutive_days",
] as const;
export type ComplianceViolationType = (typeof VIOLATION_TYPE_TABLE)[number];

export function mapViolationType(value: number): ComplianceViolationType {
  return mustMapEnum(value, VIOLATION_TYPE_TABLE, "ComplianceViolationType");
}
export function unmapViolationType(value: ComplianceViolationType): number {
  return VIOLATION_TYPE_TABLE.indexOf(value);
}

export const VIOLATION_TYPE_META: Record<ComplianceViolationType, { label: string }> = {
  insufficient_rest: { label: "Insufficient rest" },
  missing_break: { label: "Missing break" },
  span_of_hours_exceeded: { label: "Span of hours exceeded" },
  max_consecutive_days: { label: "Max consecutive days" },
};

const SEVERITY_TABLE = ["warning", "blocking"] as const;
export type ComplianceSeverity = (typeof SEVERITY_TABLE)[number];

export function mapSeverity(value: number): ComplianceSeverity {
  return mustMapEnum(value, SEVERITY_TABLE, "ComplianceSeverity");
}
export function unmapSeverity(value: ComplianceSeverity): number {
  return SEVERITY_TABLE.indexOf(value);
}

// id is deterministic (`${shiftId}:${type}`), not random — so an override
// recorded against a violation still matches it after the violation list is
// recomputed on the next fetch.
export interface ComplianceViolationDto {
  id: string;
  shiftId: string;
  type: number;
  severity: number;
  message: string;
}

export interface ComplianceViolation {
  id: string;
  shiftId: string;
  type: ComplianceViolationType;
  severity: ComplianceSeverity;
  message: string;
}

export function mapComplianceViolation(dto: ComplianceViolationDto): ComplianceViolation {
  return {
    id: dto.id,
    shiftId: dto.shiftId,
    type: mapViolationType(dto.type),
    severity: mapSeverity(dto.severity),
    message: dto.message,
  };
}

export interface ComplianceOverrideDto {
  violationId: string;
  reason: string;
  createdAtUtc: string;
}
export interface ComplianceOverride {
  violationId: string;
  reason: string;
  createdAt: Date;
}
export function mapComplianceOverride(dto: ComplianceOverrideDto): ComplianceOverride {
  return {
    violationId: dto.violationId,
    reason: dto.reason,
    createdAt: new Date(dto.createdAtUtc),
  };
}

export interface ComplianceOverrideInput {
  violationId: string;
  reason: string;
}
