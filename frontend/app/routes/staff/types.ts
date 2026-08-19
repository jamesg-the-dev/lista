// Staff profiles + availability/leave — the prerequisite data every other
// screen reads from (roster double-booking prevention, IAwardRateCalculator
// loadings, IRosterComplianceValidator context). See CLAUDE.md build order
// step 2.
//
// Follows CLAUDE.md's "wire type vs view model" convention: DTOs match the
// backend query/command shape (enums as ints, dates as ISO strings), view
// models are what components consume (string unions, Date objects). Mapping
// happens once, at the boundary, in the mapXxx/toXxxDto functions below.

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
// Employment type — drives IAwardRateCalculator loadings later.
// ---------------------------------------------------------------------------

const EMPLOYMENT_TYPE_TABLE = ["casual", "part_time", "full_time"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPE_TABLE)[number];

export function mapEmploymentType(value: number): EmploymentType {
  return mustMapEnum(value, EMPLOYMENT_TYPE_TABLE, "EmploymentType");
}
export function unmapEmploymentType(value: EmploymentType): number {
  return EMPLOYMENT_TYPE_TABLE.indexOf(value);
}

export const EMPLOYMENT_TYPE_META: Record<EmploymentType, { label: string }> = {
  casual: { label: "Casual" },
  part_time: { label: "Part-time" },
  full_time: { label: "Full-time" },
};

// ---------------------------------------------------------------------------
// Award classification (pay tier) — kept as a selectable structured value
// per MA000009, not free text, since IAwardRateCalculator will key off it.
// Levels and descriptions are illustrative for UI/architecture purposes only
// — same disclaimer as the award-rate multipliers in RosterBuilder.tsx, not
// sourced from Fair Work's Pay Calculator. See CLAUDE.md § Award compliance.
// ---------------------------------------------------------------------------

const CLASSIFICATION_TABLE = [
  "introductory",
  "level_1",
  "level_2",
  "level_3",
  "level_4",
  "level_5",
  "level_6",
] as const;
export type AwardClassification = (typeof CLASSIFICATION_TABLE)[number];

export function mapClassification(value: number): AwardClassification {
  return mustMapEnum(value, CLASSIFICATION_TABLE, "AwardClassification");
}
export function unmapClassification(value: AwardClassification): number {
  return CLASSIFICATION_TABLE.indexOf(value);
}

export const CLASSIFICATION_META: Record<
  AwardClassification,
  { label: string; description: string }
> = {
  introductory: {
    label: "Introductory",
    description: "Induction / first 3 months",
  },
  level_1: {
    label: "Level 1",
    description: "Kitchen Attendant, F&B Attendant Gr1",
  },
  level_2: {
    label: "Level 2",
    description: "F&B Attendant Gr2, Cook Gr2",
  },
  level_3: {
    label: "Level 3",
    description: "F&B Attendant Gr3, Cook Gr3, Bartender",
  },
  level_4: {
    label: "Level 4",
    description: "F&B Attendant Gr4, Cook Gr4",
  },
  level_5: {
    label: "Level 5",
    description: "Tradesperson Cook",
  },
  level_6: {
    label: "Level 6",
    description: "Supervisor",
  },
};

// ---------------------------------------------------------------------------
// Standing weekly availability — default-available-unless-excepted. Anything
// not listed as an exception is assumed available.
// ---------------------------------------------------------------------------

export const DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TIME_BLOCK_TABLE = ["morning", "afternoon", "evening"] as const;
export type TimeBlock = (typeof TIME_BLOCK_TABLE)[number];

export function mapTimeBlock(value: number): TimeBlock {
  return mustMapEnum(value, TIME_BLOCK_TABLE, "TimeBlock");
}
export function unmapTimeBlock(value: TimeBlock): number {
  return TIME_BLOCK_TABLE.indexOf(value);
}

export const TIME_BLOCK_META: Record<TimeBlock, { label: string }> = {
  morning: { label: "Morning" },
  afternoon: { label: "Afternoon" },
  evening: { label: "Evening" },
};

export interface AvailabilityExceptionDto {
  id: string;
  dayOfWeek: number; // 0=Mon..6=Sun
  isAllDay: boolean;
  blocks: number[]; // TimeBlock enum ints; ignored when isAllDay is true
}

export interface AvailabilityException {
  id: string;
  dayOfWeek: DayOfWeek;
  blocks: TimeBlock[] | "all_day";
}

export function mapAvailabilityException(
  dto: AvailabilityExceptionDto,
): AvailabilityException {
  return {
    id: dto.id,
    dayOfWeek: dto.dayOfWeek as DayOfWeek,
    blocks: dto.isAllDay ? "all_day" : dto.blocks.map(mapTimeBlock),
  };
}

export function toAvailabilityExceptionDto(
  exception: Omit<AvailabilityException, "id">,
  id: string,
): AvailabilityExceptionDto {
  return {
    id,
    dayOfWeek: exception.dayOfWeek,
    isAllDay: exception.blocks === "all_day",
    blocks:
      exception.blocks === "all_day"
        ? []
        : exception.blocks.map(unmapTimeBlock),
  };
}

// ---------------------------------------------------------------------------
// One-off leave requests.
// ---------------------------------------------------------------------------

const LEAVE_REQUEST_STATUS_TABLE = [
  "requested",
  "approved",
  "declined",
] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUS_TABLE)[number];

export function mapLeaveRequestStatus(value: number): LeaveRequestStatus {
  return mustMapEnum(value, LEAVE_REQUEST_STATUS_TABLE, "LeaveRequestStatus");
}
export function unmapLeaveRequestStatus(value: LeaveRequestStatus): number {
  return LEAVE_REQUEST_STATUS_TABLE.indexOf(value);
}

export interface LeaveRequestDto {
  id: string;
  startDate: string; // ISO date-only, e.g. "2026-08-20"
  endDate: string;
  status: number;
  reason: string | null;
}

export interface LeaveRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  reason: string | null;
}

export function mapLeaveRequest(dto: LeaveRequestDto): LeaveRequest {
  return {
    id: dto.id,
    startDate: new Date(`${dto.startDate}T00:00:00Z`),
    endDate: new Date(`${dto.endDate}T00:00:00Z`),
    status: mapLeaveRequestStatus(dto.status),
    reason: dto.reason,
  };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Venue (subset of fields this screen needs — id/name/suburb, matching the
// shape RosterBuilder.tsx already displays).
// ---------------------------------------------------------------------------

export interface VenueDto {
  id: string;
  name: string;
  suburb: string;
}

export type Venue = VenueDto;

// ---------------------------------------------------------------------------
// Staff member.
// ---------------------------------------------------------------------------

export interface StaffMemberDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  employmentType: number;
  classification: number;
  maxWeeklyHours: number;
  venueIds: string[];
  unavailability: AvailabilityExceptionDto[];
  leaveRequests: LeaveRequestDto[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  venueIds: string[];
  unavailability: AvailabilityException[];
  leaveRequests: LeaveRequest[];
}

export function mapStaffMember(dto: StaffMemberDto): StaffMember {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    employmentType: mapEmploymentType(dto.employmentType),
    classification: mapClassification(dto.classification),
    maxWeeklyHours: dto.maxWeeklyHours,
    venueIds: dto.venueIds,
    unavailability: dto.unavailability.map(mapAvailabilityException),
    leaveRequests: dto.leaveRequests.map(mapLeaveRequest),
  };
}

// Input shape for the create/edit form — core profile fields only.
// Availability exceptions and leave requests are managed through their own
// granular endpoints below (add/remove/decide), not bundled into one big
// upsert, matching CQRS's one-command-per-action shape.
export interface StaffMemberInput {
  id: string | null; // null = create
  name: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  venueIds: string[];
}

export function toStaffMemberInputDto(input: StaffMemberInput) {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    employmentType: unmapEmploymentType(input.employmentType),
    classification: unmapClassification(input.classification),
    maxWeeklyHours: input.maxWeeklyHours,
    venueIds: input.venueIds,
  };
}

export interface AvailabilityExceptionInput {
  dayOfWeek: DayOfWeek;
  blocks: TimeBlock[] | "all_day";
}

export interface LeaveRequestInput {
  startDate: Date;
  endDate: Date;
  reason: string | null;
}

export function toLeaveRequestInputDto(input: LeaveRequestInput) {
  return {
    startDate: toIsoDate(input.startDate),
    endDate: toIsoDate(input.endDate),
    reason: input.reason,
  };
}
