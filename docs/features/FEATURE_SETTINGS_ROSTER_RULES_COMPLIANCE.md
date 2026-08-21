# Feature Spec: Owner Settings — Roster Rules & Compliance

**Status:** Ready for build
**Owner area:** Settings → Roster Rules
**Depends on:** Venue Profile (venue-scoped), `IRosterComplianceValidator`, Award & Pay (minors/rest rules interact with award terms)

---

## 1. Overview

This section feeds `IRosterComplianceValidator`, which runs whenever a manager builds or
publishes a roster. The distinction that matters most here is between **hard rules** (legal
minimums that cannot be overridden — e.g. minimum 10-hour break between shifts under most
hospitality awards) and **soft rules** (venue policy, e.g. "we prefer not to roster anyone
over 38 hours without approval") which should warn but allow override with a reason. Getting
this distinction right in the data model avoids a common trap where everything becomes a
blocking validation and managers start working around the tool instead of using it.

---

## 2. Business Requirements

### User Stories

- As an **Owner**, I want to set minimum/maximum shift length, so the roster builder flags
  shifts that are too short (award minimum engagement, e.g. 3 hours) or unreasonably long.
- As an **Owner**, I want to configure the minimum break between two shifts for the same
  staff member (rest period), so the roster builder prevents illegal back-to-back shifts.
- As an **Owner**, I want to configure unpaid meal break rules (after how many hours worked
  a break is required, and its default duration), so shift length calculations for pay are
  accurate.
- As an **Owner**, I want to set the weekly hours threshold before overtime applies, so the
  labour cost dashboard and payroll export correctly flag overtime-eligible hours.
- As an **Owner**, I want to configure rules around rostering staff under 18 (max hours,
  restricted time windows), since this is a distinct legal category under Australian
  workplace law, and I want the system to stop me getting this wrong.
- As an **Owner**, I want the public holiday calendar to be correct for my state (Victoria,
  by default, based on venue address) so public holiday penalty rates apply on the right
  dates without me maintaining a calendar manually.

### Acceptance Criteria

1. Rules are split into `HardRule` (blocking, cannot publish a roster that violates it) and
   `SoftRule` (warning, requires an override reason captured against the roster).
2. Minor-specific rules only apply to staff flagged as under-18 on their staff profile
   (`Staff.DateOfBirth`-derived, recalculated at validation time — not a manual flag, since a
   staff member's age-based restrictions should stop automatically applying the day they turn 18).
3. Public holiday calendar is **system-maintained reference data per state**, not manually
   entered by the owner — owners can view it and, in edge cases, add venue-specific closures,
   but the baseline calendar is provided by Hospo Roster and kept current.
4. All rule values are venue-scoped and have sensible pre-filled defaults based on the
   default award (Section 2) selected during onboarding, so a new venue isn't starting from
   a blank, intimidating settings page.
5. Rule violations surface at the point of roster building (inline, per-shift) *and* as a
   pre-publish summary, so managers aren't surprised at the last step.

---

## 3. Domain Model (DDD)

```
RosterComplianceConfiguration (Aggregate Root — one active version per Venue, versioned like Award Config)
 ├─ RosterComplianceConfigurationId
 ├─ VenueId (FK)
 ├─ EffectiveFromUtc / EffectiveToUtc
 ├─ MinShiftLengthMinutes (int)
 ├─ MaxShiftLengthMinutes (int)
 ├─ MinRestBetweenShiftsMinutes (int)   -- e.g. 600 = 10 hours
 ├─ MealBreakRules: List<MealBreakRule> (owned collection)
 ├─ WeeklyOvertimeThresholdMinutes (int)  -- e.g. 2280 = 38 hours
 ├─ MinorRosterRules: MinorRosterRule (owned, single)
 └─ CreatedByUserId / CreatedAtUtc

MealBreakRule (Value Object)
 ├─ AfterHoursWorked (decimal)   -- e.g. after 5 hours
 ├─ BreakDurationMinutes (int)   -- e.g. 30 min unpaid
 └─ IsPaid (bool)

MinorRosterRule (Value Object)
 ├─ MaxDailyHours (decimal)
 ├─ MaxWeeklyHours (decimal)
 ├─ EarliestStartTime (TimeOnly)
 ├─ LatestFinishTime (TimeOnly)
 └─ RequiresGuardianConsentFlag (bool)  -- metadata only; consent capture is a Staff-profile concern

PublicHoliday (Reference data, system-maintained, per state)
 ├─ PublicHolidayId, State (enum), Date, Name, IsNational (bool)

VenueHolidayOverride (Entity — owner-added venue-specific closures, rare)
 ├─ VenueHolidayOverrideId, VenueId, Date, Name, CreatedByUserId
```

**Hard vs soft rule handling:** rather than a boolean per field (which gets messy fast),
model it as: everything in `RosterComplianceConfiguration` that maps to an actual award/legal
minimum (rest period, minor hours, meal breaks) is **always hard** — there's no owner toggle
for "make rest period a warning instead of a block," because that's not actually optional.
Shift length min/max and the overtime threshold are **soft by nature** — they're venue policy
preferences layered on top of the award, so `IRosterComplianceValidator` treats those two
fields as warnings with a required override reason captured on the `Roster` aggregate,
everything else as a hard block. This keeps the config model simple (no per-field
hard/soft toggle needed) while still giving managers the flexibility they need day-to-day.

---

## 4. Data Model (EF Core / PostgreSQL)

```csharp
public class RosterComplianceConfiguration
{
    public Guid RosterComplianceConfigurationId { get; private set; }
    public Guid VenueId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public int MinShiftLengthMinutes { get; private set; }
    public int MaxShiftLengthMinutes { get; private set; }
    public int MinRestBetweenShiftsMinutes { get; private set; }
    public int WeeklyOvertimeThresholdMinutes { get; private set; }
    public MinorRosterRule MinorRules { get; private set; } = null!;
    public Guid CreatedByUserId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private readonly List<MealBreakRule> _mealBreakRules = new();
    public IReadOnlyCollection<MealBreakRule> MealBreakRules => _mealBreakRules.AsReadOnly();

    private RosterComplianceConfiguration() { }

    public static RosterComplianceConfiguration CreateNewVersion(
        Guid venueId, int minShiftMins, int maxShiftMins, int minRestMins,
        int weeklyOvertimeThresholdMins, MinorRosterRule minorRules,
        IEnumerable<MealBreakRule> mealBreakRules, Guid createdByUserId)
    {
        if (minRestMins < 600) // 10 hours — hospitality award floor; block below this outright
            throw new DomainException("Minimum rest between shifts cannot be set below 10 hours (600 minutes).");
        if (minShiftMins > maxShiftMins)
            throw new DomainException("Minimum shift length cannot exceed maximum shift length.");

        var config = new RosterComplianceConfiguration
        {
            RosterComplianceConfigurationId = Guid.NewGuid(),
            VenueId = venueId,
            EffectiveFromUtc = DateTime.UtcNow,
            MinShiftLengthMinutes = minShiftMins,
            MaxShiftLengthMinutes = maxShiftMins,
            MinRestBetweenShiftsMinutes = minRestMins,
            WeeklyOvertimeThresholdMinutes = weeklyOvertimeThresholdMins,
            MinorRules = minorRules,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = DateTime.UtcNow
        };
        config._mealBreakRules.AddRange(mealBreakRules);
        return config;
    }

    public void Supersede(DateTime supersededAtUtc) => EffectiveToUtc = supersededAtUtc;
}

[Owned]
public class MealBreakRule
{
    public decimal AfterHoursWorked { get; private set; }
    public int BreakDurationMinutes { get; private set; }
    public bool IsPaid { get; private set; }
    private MealBreakRule() { }
    public static MealBreakRule Create(decimal afterHours, int durationMins, bool isPaid) =>
        new() { AfterHoursWorked = afterHours, BreakDurationMinutes = durationMins, IsPaid = isPaid };
}

[Owned]
public class MinorRosterRule
{
    public decimal MaxDailyHours { get; private set; }
    public decimal MaxWeeklyHours { get; private set; }
    public TimeOnly EarliestStartTime { get; private set; }
    public TimeOnly LatestFinishTime { get; private set; }
    private MinorRosterRule() { }
    public static MinorRosterRule Create(decimal maxDaily, decimal maxWeekly, TimeOnly earliest, TimeOnly latest) =>
        new() { MaxDailyHours = maxDaily, MaxWeeklyHours = maxWeekly, EarliestStartTime = earliest, LatestFinishTime = latest };
}
```

```sql
CREATE TABLE roster_compliance_configurations (
    roster_compliance_configuration_id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(venue_id),
    effective_from_utc TIMESTAMPTZ NOT NULL,
    effective_to_utc TIMESTAMPTZ,
    min_shift_length_minutes INT NOT NULL,
    max_shift_length_minutes INT NOT NULL,
    min_rest_between_shifts_minutes INT NOT NULL,
    weekly_overtime_threshold_minutes INT NOT NULL,
    minor_max_daily_hours NUMERIC(4,2) NOT NULL,
    minor_max_weekly_hours NUMERIC(4,2) NOT NULL,
    minor_earliest_start TIME NOT NULL,
    minor_latest_finish TIME NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_roster_compliance_active_per_venue
    ON roster_compliance_configurations(venue_id) WHERE effective_to_utc IS NULL;

CREATE TABLE roster_compliance_meal_break_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_compliance_configuration_id UUID NOT NULL REFERENCES roster_compliance_configurations(roster_compliance_configuration_id) ON DELETE CASCADE,
    after_hours_worked NUMERIC(4,2) NOT NULL,
    break_duration_minutes INT NOT NULL,
    is_paid BOOLEAN NOT NULL
);

-- Reference data, system-maintained
CREATE TABLE public_holidays (
    public_holiday_id UUID PRIMARY KEY,
    state TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    name TEXT NOT NULL,
    is_national BOOLEAN NOT NULL
);
CREATE INDEX idx_public_holidays_state_date ON public_holidays(state, holiday_date);

CREATE TABLE venue_holiday_overrides (
    venue_holiday_override_id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(venue_id),
    override_date DATE NOT NULL,
    name TEXT NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. CQRS Commands & Queries

| Type | Name | Notes |
|---|---|---|
| Command | `UpdateRosterComplianceConfigurationCommand` | Supersede-then-create versioning, same pattern as Award Config. |
| Command | `AddVenueHolidayOverrideCommand` | Rare, owner-initiated exceptions only. |
| Query | `GetActiveRosterComplianceConfigurationQuery(venueId)` | Settings UI + feeds `IRosterComplianceValidator`. |
| Query | `GetPublicHolidaysQuery(state, dateRange)` | Roster builder calendar rendering + penalty rate calculation. |
| Query | `ValidateRosterDraftQuery(rosterId)` | Runs `IRosterComplianceValidator` against a full draft roster, returns hard violations + soft warnings, used at both inline-edit and pre-publish steps. |

---

## 6. Validation Rules

- `MinRestBetweenShiftsMinutes` cannot be set below 600 (10 hours) — hard domain invariant,
  not just UI validation, since this is a legal floor under the relevant awards.
- `MinShiftLengthMinutes` cannot be set below the award's minimum engagement period (pulled
  from Section 2's active award — e.g. 3 hours under the Hospitality award for casuals).
- Minor rules cannot be disabled entirely — a venue can set generous limits but the rule
  category always exists, since it's a legal requirement, not a feature toggle.
- Public holiday reference data is read-only to owners; `VenueHolidayOverride` is additive
  only (can't delete a real public holiday, only add venue-specific closure days like a
  private event day).

---

## 7. UI / UX Design

**Location:** Settings → "Roster Rules" tab.

```
┌─ Settings ───────────────────────────────────────────────┐
│ [Venue Profile] [Award & Pay] [Roster Rules] [Staff/Roles]│
├────────────────────────────────────────────────────────────┤
│  Roster Rules & Compliance                                   │
│  ─────────────────────────                                  │
│  Shift Length                                                 │
│   Minimum   [ 3.0 ] hrs   (award minimum engagement: 3.0 hrs)│
│   Maximum   [ 10.0 ] hrs                                       │
│                                                               │
│  Rest Between Shifts                                          │
│   Minimum   [ 10 ] hrs   🔒 legal minimum, cannot go lower    │
│                                                               │
│  Meal Breaks                                                  │
│   After [5] hrs worked → [30] min  ( ) Paid  (•) Unpaid       │
│   [+ Add another break rule]                                  │
│                                                               │
│  Overtime                                                     │
│   Weekly threshold  [ 38 ] hrs                                 │
│                                                               │
│  Under-18 Staff Rules                            🔒 required  │
│   Max daily hours    [ 8 ]     Max weekly hours   [ 38 ]      │
│   Earliest start     [ 06:00 ]  Latest finish      [ 22:00 ]  │
│                                                               │
│                                    [Cancel]  [Save Changes]   │
│  ─────────────────────────                                  │
│  Public Holidays — Victoria                        [View all]│
│   26 Jan  Australia Day         01 Jan  New Year's Day        │
│   … (system-maintained, read-only)                            │
│   [+ Add venue-specific closure]                               │
└────────────────────────────────────────────────────────────┘
```

**Components:**
- `ShiftLengthRangeInput` — dual numeric inputs with a live-updating helper caption pulling
  the award minimum from `GetActiveAwardConfigurationQuery` so the owner always sees the
  legal floor next to the field they're editing, not in a separate tooltip they'll miss.
- `RestPeriodInput` — locked/disabled-below-minimum numeric input; the 🔒 icon plus a
  tooltip ("Legal minimum under [Award Name]") communicates *why* it's locked rather than
  just blocking silently.
- `MealBreakRuleList` — repeatable row group, same interaction pattern as
  `TradingHoursEditor` from the Venue Profile screen for consistency.
- `MinorRosterRuleCard` — visually distinguished (subtle amber-tinted border or icon) since
  it's a compliance-critical, always-on section — this should read as "important and
  non-negotiable," not just another form section blending into the rest.
- `PublicHolidayList` — read-only accordion/table, defaulted collapsed to a short preview
  (next 3 upcoming holidays) with a "View all" expansion, since the full-year list is long
  and mostly reference material the owner won't edit.
- Inline validation errors render directly under the relevant field (e.g. "Rest period must
  be at least 10 hours") rather than as a generic top-of-form error banner, so the owner
  doesn't have to hunt for which field is invalid.
