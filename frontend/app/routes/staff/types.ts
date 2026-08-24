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

export type EmploymentType = 'casual' | 'part_time' | 'full_time';

const EMPLOYMENT_TYPE_TABLE: Record<string, EmploymentType> = {
  Casual: 'casual',
  PartTime: 'part_time',
  FullTime: 'full_time',
};
const EMPLOYMENT_TYPE_REVERSE: Record<EmploymentType, string> = {
  casual: 'Casual',
  part_time: 'PartTime',
  full_time: 'FullTime',
};

export function mapEmploymentType(wire: string): EmploymentType {
  return mustMapWireEnum(wire, EMPLOYMENT_TYPE_TABLE, 'EmploymentType');
}
export function unmapEmploymentType(value: EmploymentType): string {
  return EMPLOYMENT_TYPE_REVERSE[value];
}

export const EMPLOYMENT_TYPE_META: Record<EmploymentType, { label: string }> = {
  casual: { label: 'Casual' },
  part_time: { label: 'Part-time' },
  full_time: { label: 'Full-time' },
};

// ---------------------------------------------------------------------------
// Award classification (pay tier) — kept as a selectable structured value
// per MA000009, not free text, since IAwardRateCalculator will key off it.
// Levels and descriptions are illustrative for UI/architecture purposes only
// — same disclaimer as the award-rate multipliers in RosterBuilder.tsx, not
// sourced from Fair Work's Pay Calculator. See CLAUDE.md § Award compliance.
// ---------------------------------------------------------------------------

export type AwardClassification =
  'introductory' | 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | 'level_6';

const CLASSIFICATION_TABLE: Record<string, AwardClassification> = {
  Introductory: 'introductory',
  Level1: 'level_1',
  Level2: 'level_2',
  Level3: 'level_3',
  Level4: 'level_4',
  Level5: 'level_5',
  Level6: 'level_6',
};
const CLASSIFICATION_REVERSE: Record<AwardClassification, string> = {
  introductory: 'Introductory',
  level_1: 'Level1',
  level_2: 'Level2',
  level_3: 'Level3',
  level_4: 'Level4',
  level_5: 'Level5',
  level_6: 'Level6',
};

export function mapClassification(wire: string): AwardClassification {
  return mustMapWireEnum(wire, CLASSIFICATION_TABLE, 'AwardClassification');
}
export function unmapClassification(value: AwardClassification): string {
  return CLASSIFICATION_REVERSE[value];
}

export const CLASSIFICATION_META: Record<
  AwardClassification,
  { label: string; description: string }
> = {
  introductory: {
    label: 'Introductory',
    description: 'Induction / first 3 months',
  },
  level_1: {
    label: 'Level 1',
    description: 'Kitchen Attendant, F&B Attendant Gr1',
  },
  level_2: {
    label: 'Level 2',
    description: 'F&B Attendant Gr2, Cook Gr2',
  },
  level_3: {
    label: 'Level 3',
    description: 'F&B Attendant Gr3, Cook Gr3, Bartender',
  },
  level_4: {
    label: 'Level 4',
    description: 'F&B Attendant Gr4, Cook Gr4',
  },
  level_5: {
    label: 'Level 5',
    description: 'Tradesperson Cook',
  },
  level_6: {
    label: 'Level 6',
    description: 'Supervisor',
  },
};

// ---------------------------------------------------------------------------
// Standing weekly availability — default-available-unless-excepted. Anything
// not listed as an exception is assumed available.
// ---------------------------------------------------------------------------

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
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
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
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

export type TimeBlock = 'morning' | 'afternoon' | 'evening';

const TIME_BLOCK_TABLE: Record<string, TimeBlock> = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Evening: 'evening',
};
const TIME_BLOCK_REVERSE: Record<TimeBlock, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export function mapTimeBlock(wire: string): TimeBlock {
  return mustMapWireEnum(wire, TIME_BLOCK_TABLE, 'AvailabilityBlock');
}
export function unmapTimeBlock(value: TimeBlock): string {
  return TIME_BLOCK_REVERSE[value];
}

export const TIME_BLOCK_META: Record<TimeBlock, { label: string }> = {
  morning: { label: 'Morning' },
  afternoon: { label: 'Afternoon' },
  evening: { label: 'Evening' },
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
  blocks: TimeBlock[] | 'all_day';
}

export function mapAvailabilityException(
  dto: AvailabilityExceptionDto,
): AvailabilityException {
  return {
    id: dto.id,
    dayOfWeek: mapDayOfWeek(dto.dayOfWeek),
    blocks: dto.isAllDay ? 'all_day' : dto.blocks.map(mapTimeBlock),
  };
}

export interface AvailabilityExceptionInput {
  dayOfWeek: DayOfWeek;
  blocks: TimeBlock[] | 'all_day';
}

// Request body for POST /api/staff/{id}/unavailability
// (SetStandingUnavailabilityCommand) — the id is assigned server-side and
// returned in the response, so it's not part of the request.
export function toSetStandingUnavailabilityRequestDto(input: AvailabilityExceptionInput) {
  return {
    dayOfWeek: unmapDayOfWeek(input.dayOfWeek),
    isAllDay: input.blocks === 'all_day',
    blocks: input.blocks === 'all_day' ? [] : input.blocks.map(unmapTimeBlock),
  };
}

// ---------------------------------------------------------------------------
// One-off leave requests.
// ---------------------------------------------------------------------------

export type LeaveRequestStatus = 'requested' | 'approved' | 'declined';

const LEAVE_REQUEST_STATUS_TABLE: Record<string, LeaveRequestStatus> = {
  Requested: 'requested',
  Approved: 'approved',
  Declined: 'declined',
};

export function mapLeaveRequestStatus(wire: string): LeaveRequestStatus {
  return mustMapWireEnum(wire, LEAVE_REQUEST_STATUS_TABLE, 'LeaveRequestStatus');
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
// Permission level — fixed, code-defined tier (Owner/Manager/Supervisor/
// Staff per FEATURE_SETTINGS_STAFF_ROLES.md §3). Data capture only: the
// backend's AuthorizationBehavior doesn't enforce this tier yet (see its doc
// comment), so setting someone to Owner here doesn't currently grant them
// anything beyond the label. Edited from Settings → Staff & Roles
// (UpdateStaffPermissionLevelCommand), not from this route's profile form —
// see StaffMemberForm.tsx's doc comment.
// ---------------------------------------------------------------------------

export type PermissionLevel = 'staff' | 'supervisor' | 'manager' | 'owner';

const PERMISSION_LEVEL_TABLE: Record<string, PermissionLevel> = {
  Staff: 'staff',
  Supervisor: 'supervisor',
  Manager: 'manager',
  Owner: 'owner',
};
const PERMISSION_LEVEL_REVERSE: Record<PermissionLevel, string> = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  manager: 'Manager',
  owner: 'Owner',
};

export function mapPermissionLevel(wire: string): PermissionLevel {
  return mustMapWireEnum(wire, PERMISSION_LEVEL_TABLE, 'PermissionLevel');
}
export function unmapPermissionLevel(value: PermissionLevel): string {
  return PERMISSION_LEVEL_REVERSE[value];
}

export const PERMISSION_LEVEL_META: Record<
  PermissionLevel,
  { label: string; description: string }
> = {
  owner: { label: 'Owner', description: 'Full access, including settings' },
  manager: { label: 'Manager', description: 'Publish rosters, approve swaps' },
  supervisor: { label: 'Supervisor', description: 'Edit rosters for their own venue' },
  staff: { label: 'Staff', description: 'View own roster and shifts' },
};

// ---------------------------------------------------------------------------
// Pay rate override — above-award hourly rate, layered on top of (never
// instead of) the award-derived base rate. Read-only here; set/cleared from
// Settings → Staff & Roles (SetStaffPayRateOverrideCommand /
// ClearStaffPayRateOverrideCommand).
// ---------------------------------------------------------------------------

export interface PayRateOverrideDto {
  overrideHourlyRate: number;
  reason: string;
  effectiveFromUtc: string;
  setByStaffMemberId: string;
}

export interface PayRateOverride {
  overrideHourlyRate: number;
  reason: string;
  effectiveFromUtc: Date;
  setByStaffMemberId: string;
}

function mapPayRateOverride(dto: PayRateOverrideDto): PayRateOverride {
  return {
    overrideHourlyRate: dto.overrideHourlyRate,
    reason: dto.reason,
    effectiveFromUtc: new Date(dto.effectiveFromUtc),
    setByStaffMemberId: dto.setByStaffMemberId,
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
  dateOfBirth: string; // DateOnly, "yyyy-MM-dd"
  employmentType: string;
  classification: string;
  maxWeeklyHours: number;
  permissionLevel: string; // PermissionLevel wire member name
  primaryRoleId: string | null;
  payRateOverride: PayRateOverrideDto | null;
  venueIds: string[];
  unavailability: AvailabilityExceptionDto[];
  leaveRequests: LeaveRequestDto[];
  isActive: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  permissionLevel: PermissionLevel;
  primaryRoleId: string | null;
  payRateOverride: PayRateOverride | null;
  venueIds: string[];
  unavailability: AvailabilityException[];
  leaveRequests: LeaveRequest[];
  isActive: boolean;
}

export function mapStaffMember(dto: StaffMemberDto): StaffMember {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    dateOfBirth: new Date(`${dto.dateOfBirth}T00:00:00Z`),
    employmentType: mapEmploymentType(dto.employmentType),
    classification: mapClassification(dto.classification),
    maxWeeklyHours: dto.maxWeeklyHours,
    permissionLevel: mapPermissionLevel(dto.permissionLevel),
    primaryRoleId: dto.primaryRoleId,
    payRateOverride: dto.payRateOverride ? mapPayRateOverride(dto.payRateOverride) : null,
    venueIds: dto.venueIds,
    unavailability: dto.unavailability.map(mapAvailabilityException),
    leaveRequests: dto.leaveRequests.map(mapLeaveRequest),
    isActive: dto.isActive,
  };
}

// Input shape for the create/edit form — core profile fields only.
// Availability exceptions and leave requests are managed through their own
// granular endpoints below (add/remove/decide), not bundled into one big
// upsert, matching CQRS's one-command-per-action shape. permissionLevel is
// only ever read by toCreateStaffMemberRequestDto (UpdateStaffMemberCommand
// has no such field — permission changes go through the dedicated
// UpdateStaffPermissionLevelCommand from Settings → Staff & Roles instead,
// see PermissionLevel's doc comment above); it's still part of this one
// shared input shape so StaffMemberForm.tsx's blank/edit value builders
// don't need two different return types.
export interface StaffMemberInput {
  id: string | null; // null = create (POST /api/staff); otherwise PUT /api/staff/{id}
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  venueIds: string[];
  permissionLevel: PermissionLevel;
  primaryRoleId: string | null;
}

// Request body for POST /api/staff (CreateStaffMemberCommand).
export function toCreateStaffMemberRequestDto(input: StaffMemberInput) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    dateOfBirth: toIsoDate(input.dateOfBirth),
    employmentType: unmapEmploymentType(input.employmentType),
    classification: unmapClassification(input.classification),
    maxWeeklyHours: input.maxWeeklyHours,
    venueIds: input.venueIds,
    permissionLevel: unmapPermissionLevel(input.permissionLevel),
    primaryRoleId: input.primaryRoleId,
  };
}

// Request body for PUT /api/staff/{id} (UpdateStaffMemberCommand) — no
// permissionLevel field, see StaffMemberInput's doc comment.
export function toUpdateStaffMemberRequestDto(input: StaffMemberInput) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    dateOfBirth: toIsoDate(input.dateOfBirth),
    employmentType: unmapEmploymentType(input.employmentType),
    classification: unmapClassification(input.classification),
    maxWeeklyHours: input.maxWeeklyHours,
    venueIds: input.venueIds,
    primaryRoleId: input.primaryRoleId,
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
