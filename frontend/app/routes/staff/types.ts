// Staff profiles + availability/leave — the prerequisite data every other
// screen reads from (roster double-booking prevention, IAwardRateCalculator
// loadings, IRosterComplianceValidator context). See CLAUDE.md build order
// step 2.
//
// Follows CLAUDE.md's "wire type vs view model" convention: DTOs match the
// backend query/command shape, view models are what components consume.
// Mapping happens once, at the boundary, in the mapXxx/toXxxDto functions
// below.
//
// Backed by StaffController (backend/src/RosterApp.Api/Controllers/
// StaffController.cs) and LeaveRequestController.cs. Per CLAUDE.md's
// wire-format-for-enums rule, every enum on these DTOs is the exact C#
// member name string (e.g. "Casual", "Level4", "Monday") — never an int.
// Venue below is NOT part of either controller's contract — no controller
// lists venues, so it's sourced from useCurrentAccount()'s venues instead
// (see hooks.ts's useVenues) rather than mocked or given its own endpoint.

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
// Employment type — drives IAwardRateCalculator loadings later.
// ---------------------------------------------------------------------------

export type EmploymentType = "casual" | "part_time" | "full_time";

const EMPLOYMENT_TYPE_TABLE: Record<string, EmploymentType> = {
  Casual: "casual",
  PartTime: "part_time",
  FullTime: "full_time",
};
const EMPLOYMENT_TYPE_REVERSE: Record<EmploymentType, string> = {
  casual: "Casual",
  part_time: "PartTime",
  full_time: "FullTime",
};

export function mapEmploymentType(wire: string): EmploymentType {
  return mustMapWireEnum(wire, EMPLOYMENT_TYPE_TABLE, "EmploymentType");
}
export function unmapEmploymentType(value: EmploymentType): string {
  return EMPLOYMENT_TYPE_REVERSE[value];
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

export type AwardClassification =
  | "introductory"
  | "level_1"
  | "level_2"
  | "level_3"
  | "level_4"
  | "level_5"
  | "level_6";

const CLASSIFICATION_TABLE: Record<string, AwardClassification> = {
  Introductory: "introductory",
  Level1: "level_1",
  Level2: "level_2",
  Level3: "level_3",
  Level4: "level_4",
  Level5: "level_5",
  Level6: "level_6",
};
const CLASSIFICATION_REVERSE: Record<AwardClassification, string> = {
  introductory: "Introductory",
  level_1: "Level1",
  level_2: "Level2",
  level_3: "Level3",
  level_4: "Level4",
  level_5: "Level5",
  level_6: "Level6",
};

export function mapClassification(wire: string): AwardClassification {
  return mustMapWireEnum(wire, CLASSIFICATION_TABLE, "AwardClassification");
}
export function unmapClassification(value: AwardClassification): string {
  return CLASSIFICATION_REVERSE[value];
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

// Kept as a numeric view model (index into DAY_LABELS) rather than a string
// union, matching the existing UI's <select> handling — only the wire
// mapping to/from the backend's Weekday enum member names changes here.
const WEEKDAY_TABLE: Record<string, DayOfWeek> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};
const WEEKDAY_REVERSE = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function mapDayOfWeek(wire: string): DayOfWeek {
  const mapped = WEEKDAY_TABLE[wire];
  if (mapped === undefined) {
    throw new Error(`Unknown Weekday wire value: ${wire}`);
  }
  return mapped;
}
export function unmapDayOfWeek(value: DayOfWeek): string {
  return WEEKDAY_REVERSE[value];
}

export type TimeBlock = "morning" | "afternoon" | "evening";

const TIME_BLOCK_TABLE: Record<string, TimeBlock> = {
  Morning: "morning",
  Afternoon: "afternoon",
  Evening: "evening",
};
const TIME_BLOCK_REVERSE: Record<TimeBlock, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export function mapTimeBlock(wire: string): TimeBlock {
  return mustMapWireEnum(wire, TIME_BLOCK_TABLE, "AvailabilityBlock");
}
export function unmapTimeBlock(value: TimeBlock): string {
  return TIME_BLOCK_REVERSE[value];
}

export const TIME_BLOCK_META: Record<TimeBlock, { label: string }> = {
  morning: { label: "Morning" },
  afternoon: { label: "Afternoon" },
  evening: { label: "Evening" },
};

export interface AvailabilityExceptionDto {
  id: string;
  dayOfWeek: string; // Weekday enum member name, e.g. "Monday"
  isAllDay: boolean;
  blocks: string[]; // AvailabilityBlock enum member names; ignored when isAllDay is true
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
    dayOfWeek: mapDayOfWeek(dto.dayOfWeek),
    blocks: dto.isAllDay ? "all_day" : dto.blocks.map(mapTimeBlock),
  };
}

export interface AvailabilityExceptionInput {
  dayOfWeek: DayOfWeek;
  blocks: TimeBlock[] | "all_day";
}

// Request body for POST /api/staff/{id}/unavailability
// (SetStandingUnavailabilityCommand) — the id is assigned server-side and
// returned in the response, so it's not part of the request.
export function toSetStandingUnavailabilityRequestDto(input: AvailabilityExceptionInput) {
  return {
    dayOfWeek: unmapDayOfWeek(input.dayOfWeek),
    isAllDay: input.blocks === "all_day",
    blocks: input.blocks === "all_day" ? [] : input.blocks.map(unmapTimeBlock),
  };
}

// ---------------------------------------------------------------------------
// One-off leave requests.
// ---------------------------------------------------------------------------

export type LeaveRequestStatus = "requested" | "approved" | "declined";

const LEAVE_REQUEST_STATUS_TABLE: Record<string, LeaveRequestStatus> = {
  Requested: "requested",
  Approved: "approved",
  Declined: "declined",
};

export function mapLeaveRequestStatus(wire: string): LeaveRequestStatus {
  return mustMapWireEnum(wire, LEAVE_REQUEST_STATUS_TABLE, "LeaveRequestStatus");
}

export interface LeaveRequestDto {
  id: string;
  startDate: string; // ISO date-only, e.g. "2026-08-20"
  endDate: string;
  status: string; // LeaveRequestStatus enum member name, e.g. "Requested"
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

export interface LeaveRequestInput {
  startDate: Date;
  endDate: Date;
  reason: string | null;
}

// Request body for POST /api/staff/{id}/leave-requests
// (SubmitLeaveRequestCommand) — StaffMemberId comes from the URL.
export function toLeaveRequestInputDto(input: LeaveRequestInput) {
  return {
    startDate: toIsoDate(input.startDate),
    endDate: toIsoDate(input.endDate),
    reason: input.reason,
  };
}

// ---------------------------------------------------------------------------
// Venue — sourced from useCurrentAccount()'s venues (see file header), not
// its own endpoint. Only the fields AccountVenueDto actually carries.
// ---------------------------------------------------------------------------

export interface Venue {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Staff member.
// ---------------------------------------------------------------------------

export interface StaffMemberDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  employmentType: string;
  classification: string;
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
  id: string | null; // null = create (POST /api/staff); otherwise PUT /api/staff/{id}
  name: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  venueIds: string[];
}

// Request body shape shared by CreateStaffMemberRequest and
// UpdateStaffMemberRequest — both are identical; only the id (URL for
// update, absent for create) and HTTP verb differ, so api.ts picks the
// route based on StaffMemberInput.id rather than needing two DTO shapes.
export function toStaffMemberRequestDto(input: StaffMemberInput) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    employmentType: unmapEmploymentType(input.employmentType),
    classification: unmapClassification(input.classification),
    maxWeeklyHours: input.maxWeeklyHours,
    venueIds: input.venueIds,
  };
}

// ---------------------------------------------------------------------------
// Availability window — GET /api/staff/{id}/availability
// (GetStaffAvailabilityQuery). Not consumed by any screen yet (no roster
// double-booking check wired up), but included for full StaffController
// contract coverage.
// ---------------------------------------------------------------------------

export interface StaffAvailabilityDto {
  staffMemberId: string;
  unavailability: AvailabilityExceptionDto[];
  approvedLeave: LeaveRequestDto[];
}

export interface StaffAvailability {
  staffMemberId: string;
  unavailability: AvailabilityException[];
  approvedLeave: LeaveRequest[];
}

export function mapStaffAvailability(dto: StaffAvailabilityDto): StaffAvailability {
  return {
    staffMemberId: dto.staffMemberId,
    unavailability: dto.unavailability.map(mapAvailabilityException),
    approvedLeave: dto.approvedLeave.map(mapLeaveRequest),
  };
}
