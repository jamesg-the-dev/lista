// Venue Profile settings — backed by VenueController
// (backend/src/RosterApp.Api/Controllers/VenueController.cs) and
// GetVenueProfileQuery / UpdateVenueProfileCommand /
// UpdateVenueTradingHoursCommand. See
// docs/features/FEATURE_SETTINGS_VENUE_PROFILE.md for the feature spec.
//
// Follows CLAUDE.md's "wire type vs view model" convention: DTOs match the
// backend query/command shape exactly, view models are what components
// consume. Enum fields (State, TradingHourSession.dayOfWeek) are the exact
// C# member name string, per CLAUDE.md's wire-format rule — never an int.

// ---------------------------------------------------------------------------
// Address — structured, not free text (see CLAUDE.md's Address VO).
// ---------------------------------------------------------------------------

export const AUSTRALIAN_STATES = [
  'NSW',
  'VIC',
  'QLD',
  'WA',
  'SA',
  'TAS',
  'ACT',
  'NT',
] as const;
export type AustralianState = (typeof AUSTRALIAN_STATES)[number];

export const STATE_DEFAULT_TIMEZONE: Record<AustralianState, string> = {
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  QLD: 'Australia/Brisbane',
  WA: 'Australia/Perth',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  ACT: 'Australia/Sydney',
  NT: 'Australia/Darwin',
};

export const AU_TIMEZONE_ITEMS = [
  { value: 'Australia/Sydney', label: 'Sydney / Canberra (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Lord_Howe', label: 'Lord Howe Island (LHST/LHDT)' },
] as const;

export interface AddressDto {
  line1: string;
  line2: string | null;
  suburb: string;
  state: string; // AustralianState wire member name
  postcode: string;
  country: string;
}

export interface Address {
  line1: string;
  line2: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  country: string;
}

function mapAddress(dto: AddressDto): Address {
  return {
    line1: dto.line1,
    line2: dto.line2 ?? '',
    suburb: dto.suburb,
    state: dto.state as AustralianState,
    postcode: dto.postcode,
    country: dto.country,
  };
}

// ABN checksum (ATO algorithm), mirrored from backend/src/RosterApp.Domain/
// ValueObjects/Abn.cs — used only for immediate visual feedback (the
// AbnInput check/cross indicator); the backend's FluentValidation rule
// remains the source of truth, surfaced via the save mutation's error state.
const ABN_WEIGHTING_FACTORS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function isValidAbn(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  const sum = [...digits].reduce((total, digit, index) => {
    const value = Number(digit) - (index === 0 ? 1 : 0);
    return total + value * ABN_WEIGHTING_FACTORS[index];
  }, 0);

  return sum % 89 === 0;
}

// ---------------------------------------------------------------------------
// Trading hours — one row per session; multiple rows can share a day for
// split-shift trading (e.g. lunch + dinner). `key` is a client-only React
// identity, never sent to the backend — UpdateVenueTradingHoursCommand
// replaces the whole week's sessions in one call, so no server-assigned id
// is needed to address an individual row.
// ---------------------------------------------------------------------------

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const WEEKDAY_TABLE: Record<string, number> = {
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

function mapDayOfWeek(wire: string): number {
  const mapped = WEEKDAY_TABLE[wire];
  if (mapped === undefined) {
    throw new Error(`Unknown DayOfWeek wire value: ${wire}`);
  }
  return mapped;
}
function unmapDayOfWeek(value: number): string {
  return WEEKDAY_REVERSE[value];
}

function fromWireTime(hhmmss: string): string {
  return hhmmss.slice(0, 5);
}
function toWireTime(hhmm: string): string {
  return `${hhmm}:00`;
}

export interface TradingHourSessionDto {
  dayOfWeek: string;
  sessionLabel: string | null;
  openTime: string | null; // TimeOnly, "HH:mm:ss"
  closeTime: string | null;
  isClosed: boolean;
  crossesMidnight: boolean;
}

export interface TradingHourSession {
  key: string;
  dayOfWeek: number; // index into DAY_LABELS
  sessionLabel: string;
  openTime: string; // "HH:mm" — matches <input type="time">'s value format
  closeTime: string;
  isClosed: boolean;
  crossesMidnight: boolean;
}

function newSessionKey(): string {
  return crypto.randomUUID();
}

export function blankSession(dayOfWeek: number, isClosed: boolean): TradingHourSession {
  return {
    key: newSessionKey(),
    dayOfWeek,
    sessionLabel: '',
    openTime: '09:00',
    closeTime: '17:00',
    isClosed,
    crossesMidnight: false,
  };
}

// Ensures every day of the week has at least one row to render, even if the
// venue has never set trading hours for that day (falls back to a closed
// placeholder the owner can open up).
export function toTradingHoursFormValue(
  dtos: TradingHourSessionDto[],
): TradingHourSession[] {
  const sessions = dtos.map(dto => ({
    key: newSessionKey(),
    dayOfWeek: mapDayOfWeek(dto.dayOfWeek),
    sessionLabel: dto.sessionLabel ?? '',
    openTime: dto.openTime ? fromWireTime(dto.openTime) : '09:00',
    closeTime: dto.closeTime ? fromWireTime(dto.closeTime) : '17:00',
    isClosed: dto.isClosed,
    crossesMidnight: dto.crossesMidnight,
  }));

  const result: TradingHourSession[] = [];
  for (let day = 0; day < DAY_LABELS.length; day++) {
    const daySessions = sessions.filter(s => s.dayOfWeek === day);
    result.push(...(daySessions.length > 0 ? daySessions : [blankSession(day, true)]));
  }
  return result;
}

export function toTradingHourSessionInputDto(session: TradingHourSession) {
  return {
    dayOfWeek: unmapDayOfWeek(session.dayOfWeek),
    sessionLabel: session.sessionLabel.trim() || null,
    openTime: session.isClosed ? null : toWireTime(session.openTime),
    closeTime: session.isClosed ? null : toWireTime(session.closeTime),
    isClosed: session.isClosed,
    crossesMidnight: session.isClosed ? false : session.crossesMidnight,
  };
}

// ---------------------------------------------------------------------------
// Venue profile.
// ---------------------------------------------------------------------------

export interface VenueProfileDto {
  id: string;
  organisationId: string;
  name: string;
  abn: string;
  address: AddressDto;
  timezone: string;
  isActive: boolean;
  forecastSalesTarget: number | null;
  tradingHours: TradingHourSessionDto[];
}

export interface VenueProfile {
  id: string;
  organisationId: string;
  name: string;
  abn: string;
  address: Address;
  timezone: string;
  isActive: boolean;
  tradingHours: TradingHourSession[];
}

export function mapVenueProfile(dto: VenueProfileDto): VenueProfile {
  return {
    id: dto.id,
    organisationId: dto.organisationId,
    name: dto.name,
    abn: dto.abn,
    address: mapAddress(dto.address),
    timezone: dto.timezone,
    isActive: dto.isActive,
    tradingHours: toTradingHoursFormValue(dto.tradingHours),
  };
}

// One combined form for the whole "Venue Profile" tab — profile fields and
// trading hours are saved together from a single header Save button (see
// the spec's UI mockup), even though they're two separate backend commands
// under the hood (VenueProfileTab.tsx fires both mutations on submit).
export interface VenueProfileTabValue {
  name: string;
  abn: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  timezone: string;
  tradingHours: TradingHourSession[];
}

export function toVenueProfileTabValue(profile: VenueProfile): VenueProfileTabValue {
  return {
    name: profile.name,
    abn: profile.abn,
    addressLine1: profile.address.line1,
    addressLine2: profile.address.line2,
    suburb: profile.address.suburb,
    state: profile.address.state,
    postcode: profile.address.postcode,
    timezone: profile.timezone,
    tradingHours: profile.tradingHours,
  };
}

// Request body for PUT /api/venues/{id}/profile (UpdateVenueProfileCommand).
export function toUpdateVenueProfileRequestDto(value: VenueProfileTabValue) {
  return {
    name: value.name,
    abn: value.abn,
    addressLine1: value.addressLine1,
    addressLine2: value.addressLine2.trim() || null,
    suburb: value.suburb,
    state: value.state,
    postcode: value.postcode,
    country: 'AU',
    timezone: value.timezone,
  };
}

// ---------------------------------------------------------------------------
// Award & Pay Config — backed by AwardConfigurationController
// (backend/src/RosterApp.Api/Controllers/AwardConfigurationController.cs)
// and GetAvailableAwardsQuery / GetActiveAwardConfigurationQuery /
// GetAwardConfigurationHistoryQuery / UpdateAwardConfigurationCommand. See
// docs/features/FEATURE_SETTINGS_AWARD_PAY_CONFIG.md for the feature spec.
//
// RoleAwardMapping (the "map your venue's roles to award classifications"
// sub-feature the spec describes) is deferred until Staff & Roles
// introduces a real Role entity to hang it off — see the backend's
// AwardConfiguration domain doc comments. AwardPayTab therefore only
// renders the venue-level config form below; the role-mapping table isn't
// built yet.
// ---------------------------------------------------------------------------

export const PAY_PERIOD_ITEMS = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Fortnightly', label: 'Fortnightly' },
] as const;
export type PayPeriod = (typeof PAY_PERIOD_ITEMS)[number]['value'];

export const DAY_OF_WEEK_ITEMS = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
] as const;
export type DayOfWeekName = (typeof DAY_OF_WEEK_ITEMS)[number]['value'];

// Exact C# PenaltyType member names (wire format) — matches
// RosterApp.Domain.AwardConfig.PenaltyType.
export const PENALTY_TYPE_ITEMS = [
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
  { value: 'EveningAfter7pm', label: 'Evening (after 7pm)' },
  { value: 'EarlyMorningBefore7am', label: 'Early morning (before 7am)' },
] as const;
export type PenaltyType = (typeof PENALTY_TYPE_ITEMS)[number]['value'];

export interface AwardDto {
  id: string;
  awardCode: string;
  name: string;
  jurisdiction: string;
  minimumCasualLoadingPercent: number | null;
}

export interface PenaltyRateToggleDto {
  penaltyType: string; // PenaltyType wire member name
  isEnabled: boolean;
}

export interface AwardConfigurationDto {
  id: string;
  venueId: string;
  awardId: string;
  effectiveFromUtc: string;
  effectiveToUtc: string | null;
  casualLoadingPercent: number;
  superannuationRatePercent: number;
  statutoryMinimumSuperannuationPercent: number;
  meetsSuperannuationMinimum: boolean;
  payPeriod: string; // PayPeriod wire member name
  payPeriodCutoffDay: string; // DayOfWeekName wire member name
  createdByManagerId: string;
  createdAtUtc: string;
  penaltyToggles: PenaltyRateToggleDto[];
}

// One toggle per PenaltyType, fixed cardinality (the UI always shows all
// five as checkboxes — see the spec's mockup) — a keyed record is simpler
// for the form to read/write per-checkbox than an array keyed by hunting
// for a matching PenaltyType each render.
export type PenaltyToggleFormValue = Record<PenaltyType, boolean>;

function defaultPenaltyToggles(): PenaltyToggleFormValue {
  return {
    Saturday: false,
    Sunday: false,
    PublicHoliday: false,
    EveningAfter7pm: false,
    EarlyMorningBefore7am: false,
  };
}

function toPenaltyToggleFormValue(dtos: PenaltyRateToggleDto[]): PenaltyToggleFormValue {
  const toggles = defaultPenaltyToggles();
  for (const dto of dtos) {
    if (dto.penaltyType in toggles) {
      toggles[dto.penaltyType as PenaltyType] = dto.isEnabled;
    }
  }
  return toggles;
}

function toPenaltyRateToggleInputDtos(value: PenaltyToggleFormValue) {
  return PENALTY_TYPE_ITEMS.map(item => ({
    penaltyType: item.value,
    isEnabled: value[item.value],
  }));
}

export interface AwardPayTabValue {
  awardId: string;
  casualLoadingPercent: number;
  superannuationRatePercent: number;
  confirmBelowMinimumSuper: boolean;
  payPeriod: PayPeriod;
  payPeriodCutoffDay: DayOfWeekName;
  penaltyToggles: PenaltyToggleFormValue;
}

export function blankAwardPayTabValue(): AwardPayTabValue {
  return {
    awardId: '',
    casualLoadingPercent: 0,
    superannuationRatePercent: 0,
    confirmBelowMinimumSuper: false,
    payPeriod: 'Weekly',
    payPeriodCutoffDay: 'Sunday',
    penaltyToggles: defaultPenaltyToggles(),
  };
}

// A venue with no config yet (config is null) starts from a blank form
// rather than nulling out the whole tab — there's nothing to "cancel" back
// to until the owner saves for the first time.
export function toAwardPayTabValue(
  config: AwardConfigurationDto | null,
): AwardPayTabValue {
  if (!config) {
    return blankAwardPayTabValue();
  }

  return {
    awardId: config.awardId,
    casualLoadingPercent: config.casualLoadingPercent,
    superannuationRatePercent: config.superannuationRatePercent,
    confirmBelowMinimumSuper: false,
    payPeriod: config.payPeriod as PayPeriod,
    payPeriodCutoffDay: config.payPeriodCutoffDay as DayOfWeekName,
    penaltyToggles: toPenaltyToggleFormValue(config.penaltyToggles),
  };
}

// Request body for PUT /api/venues/{id}/award-configuration (UpdateAwardConfigurationCommand).
export function toUpdateAwardConfigurationRequestDto(value: AwardPayTabValue) {
  return {
    awardId: value.awardId,
    casualLoadingPercent: value.casualLoadingPercent,
    superannuationRatePercent: value.superannuationRatePercent,
    confirmBelowMinimumSuper: value.confirmBelowMinimumSuper,
    payPeriod: value.payPeriod,
    payPeriodCutoffDay: value.payPeriodCutoffDay,
    penaltyToggles: toPenaltyRateToggleInputDtos(value.penaltyToggles),
  };
}

// ---------------------------------------------------------------------------
// Roster Rules & Compliance — backed by RosterComplianceController
// (backend/src/RosterApp.Api/Controllers/RosterComplianceController.cs) and
// GetActiveRosterComplianceConfigurationQuery /
// GetRosterComplianceConfigurationHistoryQuery /
// UpdateRosterComplianceConfigurationCommand / GetPublicHolidaysQuery /
// GetVenueHolidayOverridesQuery / AddVenueHolidayOverrideCommand. See
// docs/features/FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md for the feature
// spec.
//
// The backend stores shift-length/rest/overtime figures in minutes; the form
// works in hours (decimal) to match the settings UI mockup — converted at
// the DTO boundary the same way TradingHourSession converts "HH:mm" <->
// "HH:mm:ss" above. Minor rule time-of-day fields reuse that same
// fromWireTime/toWireTime pair directly (TimeOnly wire format is identical).
// ---------------------------------------------------------------------------

/** Mirrors backend RosterComplianceConfiguration.MinimumRestBetweenShiftsMinutesFloor (600 minutes) — a hard legal floor, never editable below this. */
export const MIN_REST_BETWEEN_SHIFTS_FLOOR_HOURS = 10;

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}
function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export interface MealBreakRuleDto {
  afterHoursWorked: number;
  breakDurationMinutes: number;
  isPaid: boolean;
}

export interface MinorRosterRuleDto {
  maxDailyHours: number;
  maxWeeklyHours: number;
  earliestStartTime: string; // TimeOnly wire, "HH:mm:ss"
  latestFinishTime: string;
}

export interface RosterComplianceConfigurationDto {
  id: string;
  venueId: string;
  effectiveFromUtc: string;
  effectiveToUtc: string | null;
  minShiftLengthMinutes: number;
  maxShiftLengthMinutes: number;
  minRestBetweenShiftsMinutes: number;
  weeklyOvertimeThresholdMinutes: number;
  minorRules: MinorRosterRuleDto;
  mealBreakRules: MealBreakRuleDto[];
  createdByManagerId: string;
  createdAtUtc: string;
}

// `key` is a client-only React identity, never sent to the backend — same
// rationale as TradingHourSession.key: UpdateRosterComplianceConfigurationCommand
// replaces the whole meal-break rule list in one call.
export interface MealBreakRuleRow {
  key: string;
  afterHoursWorked: number;
  breakDurationMinutes: number;
  isPaid: boolean;
}

export interface MinorRosterRuleFormValue {
  maxDailyHours: number;
  maxWeeklyHours: number;
  earliestStartTime: string; // "HH:mm" — matches <input type="time">'s value format
  latestFinishTime: string;
}

export interface RosterRulesTabValue {
  minShiftLengthHours: number;
  maxShiftLengthHours: number;
  minRestBetweenShiftsHours: number;
  weeklyOvertimeThresholdHours: number;
  minorRules: MinorRosterRuleFormValue;
  mealBreakRules: MealBreakRuleRow[];
}

function newRowKey(): string {
  return crypto.randomUUID();
}

export function blankMealBreakRuleRow(): MealBreakRuleRow {
  return { key: newRowKey(), afterHoursWorked: 5, breakDurationMinutes: 30, isPaid: false };
}

// Sensible pre-filled defaults so a new venue isn't starting from a blank,
// intimidating settings page (§2 AC4) — matches the spec's own UI mockup
// figures, and the backend's RosterComplianceThresholds.Default fallback
// used by IRosterComplianceValidator before any config is saved.
export function blankRosterRulesTabValue(): RosterRulesTabValue {
  return {
    minShiftLengthHours: 3,
    maxShiftLengthHours: 12,
    minRestBetweenShiftsHours: MIN_REST_BETWEEN_SHIFTS_FLOOR_HOURS,
    weeklyOvertimeThresholdHours: 38,
    minorRules: {
      maxDailyHours: 8,
      maxWeeklyHours: 38,
      earliestStartTime: '06:00',
      latestFinishTime: '22:00',
    },
    mealBreakRules: [blankMealBreakRuleRow()],
  };
}

// A venue with no config yet (config is null) starts from the blank
// defaults above rather than nulling out the whole tab — same "nothing to
// cancel back to until the owner saves for the first time" rationale as
// toAwardPayTabValue.
export function toRosterRulesTabValue(
  config: RosterComplianceConfigurationDto | null,
): RosterRulesTabValue {
  if (!config) {
    return blankRosterRulesTabValue();
  }

  return {
    minShiftLengthHours: minutesToHours(config.minShiftLengthMinutes),
    maxShiftLengthHours: minutesToHours(config.maxShiftLengthMinutes),
    minRestBetweenShiftsHours: minutesToHours(config.minRestBetweenShiftsMinutes),
    weeklyOvertimeThresholdHours: minutesToHours(config.weeklyOvertimeThresholdMinutes),
    minorRules: {
      maxDailyHours: config.minorRules.maxDailyHours,
      maxWeeklyHours: config.minorRules.maxWeeklyHours,
      earliestStartTime: fromWireTime(config.minorRules.earliestStartTime),
      latestFinishTime: fromWireTime(config.minorRules.latestFinishTime),
    },
    mealBreakRules:
      config.mealBreakRules.length > 0
        ? config.mealBreakRules.map(rule => ({
            key: newRowKey(),
            afterHoursWorked: rule.afterHoursWorked,
            breakDurationMinutes: rule.breakDurationMinutes,
            isPaid: rule.isPaid,
          }))
        : [blankMealBreakRuleRow()],
  };
}

// Request body for PUT /api/venues/{id}/roster-compliance-configuration
// (UpdateRosterComplianceConfigurationCommand).
export function toUpdateRosterComplianceConfigurationRequestDto(value: RosterRulesTabValue) {
  return {
    minShiftLengthMinutes: hoursToMinutes(value.minShiftLengthHours),
    maxShiftLengthMinutes: hoursToMinutes(value.maxShiftLengthHours),
    minRestBetweenShiftsMinutes: hoursToMinutes(value.minRestBetweenShiftsHours),
    weeklyOvertimeThresholdMinutes: hoursToMinutes(value.weeklyOvertimeThresholdHours),
    minorRules: {
      maxDailyHours: value.minorRules.maxDailyHours,
      maxWeeklyHours: value.minorRules.maxWeeklyHours,
      earliestStartTime: toWireTime(value.minorRules.earliestStartTime),
      latestFinishTime: toWireTime(value.minorRules.latestFinishTime),
    },
    mealBreakRules: value.mealBreakRules.map(rule => ({
      afterHoursWorked: rule.afterHoursWorked,
      breakDurationMinutes: rule.breakDurationMinutes,
      isPaid: rule.isPaid,
    })),
  };
}

// Public holidays — system-maintained reference data (§2 AC3), read-only to
// owners. DateOnly serializes as "yyyy-MM-dd" by default, which already
// matches <input type="date">'s value format and the Calendar component's
// ISO date strings, so no conversion is needed at this boundary.
export interface PublicHolidayDto {
  id: string;
  state: string; // AustralianState wire member name
  date: string; // DateOnly, "yyyy-MM-dd"
  name: string;
  isNational: boolean;
}

// Venue-specific closures — additive only (§6): a real public holiday can't
// be deleted, only supplemented.
export interface VenueHolidayOverrideDto {
  id: string;
  venueId: string;
  overrideDate: string; // DateOnly, "yyyy-MM-dd"
  name: string;
  createdByManagerId: string;
  createdAtUtc: string;
}

// Request body for POST /api/venues/{id}/holiday-overrides (AddVenueHolidayOverrideCommand).
export function toAddVenueHolidayOverrideRequestDto(overrideDate: string, name: string) {
  return { overrideDate, name };
}
