# Feature Spec: Owner Settings — Award & Pay Configuration

**Status:** Ready for build
**Owner area:** Settings → Award & Pay
**Depends on:** Venue Profile (venue-scoped), `IAwardRateCalculator`, Role → Award Classification mapping feature

---

## 1. Overview

This is the most compliance-sensitive settings group in the product. Errors here don't just
produce a bad UX — they produce **underpayment or overpayment of real staff**, which in
Australian hospitality carries Fair Work Ombudsman exposure for the venue owner. The data
model needs to be versioned (rates and rules change periodically — e.g. annual Fair Work
Commission wage reviews each July) rather than treated as static config that gets
overwritten in place.

---

## 2. Business Requirements

### User Stories

- As an **Owner**, I want to select which Modern Award applies to my venue, so that
  `IAwardRateCalculator` uses the correct classification/rate table.
- As an **Owner**, I want to map my venue's custom roles to award classifications (see the
  role-mapping feature discussed separately), so staff rostered under a friendly role name
  ("Bartender") are paid correctly under the formal classification ("F&B Grade 2").
  Role → award classification mapping is a **sub-feature that reads/writes into this section
  of settings**, even though the Role entity itself lives in Staff & Roles (Section 4).
- As an **Owner**, I want to configure casual loading %, and toggle which penalty rates
  apply (weekend, public holiday), so the labour cost dashboard and payroll export reflect
  my actual obligations, not just award defaults I might not use.
- As an **Owner**, I want to set my superannuation guarantee rate, and have the system warn
  me if it's below the current statutory minimum, since this changes periodically
  (11.5% → 12% from 1 July 2025, for example) and I don't want to be silently non-compliant.
- As an **Owner**, I want to configure pay period (weekly/fortnightly) and cut-off day, so
  payroll exports align with my actual pay run.

### Acceptance Criteria

1. Award selection is from a **fixed, system-maintained list** (not free text) — Hospitality
   Industry (General) Award, Restaurant Industry Award, Registered and Licensed Clubs Award,
   Fast Food Industry Award, at minimum. This list is data, not hardcoded enum, so new awards
   or a Fair Work restructure don't require a code deploy.
2. Rate tables underlying each award classification are **not** owner-editable — they're
   system-maintained reference data. What the owner configures is which award applies, which
   classifications are in use, and above-award loadings/penalties layered on top.
3. Superannuation rate defaults to the current statutory minimum and is shown as "compliant"
   only if `>= currentStatutoryMinimum`. Owner *can* set higher, cannot save lower without an
   explicit confirmation ("below minimum — are you sure?") since some edge cases (e.g. small
   business exemptions on old contracts) may legitimately need it, but it should never be a
   silent footgun.
4. Every change to award config is versioned and timestamped — payroll calculations for past
   pay periods must use the config that was active **at the time**, not today's config. This
   is the single most important architectural decision in this section.
5. Casual loading % and penalty toggles are per-venue (a venue might not run Sunday trade,
   so Sunday penalty config is irrelevant but should still be present, just inert/hidden).

---

## 3. Domain Model (DDD)

```
AwardConfiguration (Aggregate Root — one per Venue, but versioned)
 ├─ AwardConfigurationId (Guid)
 ├─ VenueId (FK)
 ├─ AwardId (FK → reference data: AwardDefinition)
 ├─ EffectiveFromUtc / EffectiveToUtc (nullable = currently active)
 ├─ CasualLoadingPercent (decimal, e.g. 25.00)
 ├─ SuperannuationRatePercent (decimal, e.g. 12.00)
 ├─ EnabledPenaltyRates: List<PenaltyRateToggle> (owned collection)
 ├─ PayPeriod (enum: Weekly / Fortnightly)
 ├─ PayPeriodCutoffDay (DayOfWeek)
 └─ CreatedByUserId / CreatedAtUtc

PenaltyRateToggle (Value Object)
 ├─ PenaltyType (enum: Saturday, Sunday, PublicHoliday, EveningAfter7pm, EarlyMorningBefore7am)
 └─ IsEnabled (bool)

RoleAwardMapping (Entity — links Section 4's Role to award classification)
 ├─ RoleAwardMappingId
 ├─ VenueId
 ├─ RoleId (FK → Role, defined in Staff & Roles)
 ├─ AwardClassificationId (FK → reference data)
 ├─ EffectiveFromUtc / EffectiveToUtc
 └─ CreatedByUserId / CreatedAtUtc

--- Reference data (system-maintained, seeded/updated by Hospo Roster, not owners) ---

AwardDefinition
 ├─ AwardId, AwardCode (e.g. "MA000009"), Name, Jurisdiction

AwardClassification
 ├─ AwardClassificationId, AwardId (FK), Name (e.g. "Level 2"), Description

AwardRate (versioned rate table)
 ├─ AwardRateId, AwardClassificationId (FK), EffectiveFromUtc, EffectiveToUtc
 ├─ BaseHourlyRate
 ├─ CasualLoadingPercent (award-mandated minimum — owner's config can't go below this)
 └─ PenaltyMultipliers: List<PenaltyMultiplier> (per PenaltyType)
```

**Key architectural decision — temporal/versioned config:** `AwardConfiguration` and
`RoleAwardMapping` are **never updated in place**. An "edit" is actually: close out the
current row (`EffectiveToUtc = now`) and insert a new row (`EffectiveFromUtc = now`). This
mirrors how `AwardRate` reference data must already behave (rates change on FWC wage review
dates), and it means `IAwardRateCalculator`, when calculating pay for a shift on a given
date, always queries "what config/rate was effective on that date" rather than "what's the
current config" — which is the only way historical payroll runs stay correct after a rate
change. This is the same append-only philosophy as the CCC audit entities.

---

## 4. Data Model (EF Core / PostgreSQL)

```csharp
public class AwardConfiguration
{
    public Guid AwardConfigurationId { get; private set; }
    public Guid VenueId { get; private set; }
    public Guid AwardId { get; private set; }
    public DateTime EffectiveFromUtc { get; private set; }
    public DateTime? EffectiveToUtc { get; private set; }
    public decimal CasualLoadingPercent { get; private set; }
    public decimal SuperannuationRatePercent { get; private set; }
    public PayPeriod PayPeriod { get; private set; }
    public DayOfWeek PayPeriodCutoffDay { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private readonly List<PenaltyRateToggle> _penaltyToggles = new();
    public IReadOnlyCollection<PenaltyRateToggle> PenaltyToggles => _penaltyToggles.AsReadOnly();

    private AwardConfiguration() { }

    public static AwardConfiguration CreateNewVersion(
        Guid venueId, Guid awardId, decimal casualLoadingPercent,
        decimal superRatePercent, decimal statutoryMinSuperRate,
        PayPeriod payPeriod, DayOfWeek cutoffDay, Guid createdByUserId,
        bool ownerConfirmedBelowMinimum = false)
    {
        if (superRatePercent < statutoryMinSuperRate && !ownerConfirmedBelowMinimum)
            throw new DomainException(
                $"Super rate {superRatePercent}% is below the statutory minimum " +
                $"{statutoryMinSuperRate}%. Confirmation required to proceed.");

        return new AwardConfiguration
        {
            AwardConfigurationId = Guid.NewGuid(),
            VenueId = venueId,
            AwardId = awardId,
            EffectiveFromUtc = DateTime.UtcNow,
            CasualLoadingPercent = casualLoadingPercent,
            SuperannuationRatePercent = superRatePercent,
            PayPeriod = payPeriod,
            PayPeriodCutoffDay = cutoffDay,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void Supersede(DateTime supersededAtUtc) => EffectiveToUtc = supersededAtUtc;
}

[Owned]
public class PenaltyRateToggle
{
    public PenaltyType PenaltyType { get; private set; }
    public bool IsEnabled { get; private set; }

    private PenaltyRateToggle() { }

    public static PenaltyRateToggle Create(PenaltyType type, bool enabled) =>
        new() { PenaltyType = type, IsEnabled = enabled };
}

public enum PenaltyType { Saturday, Sunday, PublicHoliday, EveningAfter7pm, EarlyMorningBefore7am }
public enum PayPeriod { Weekly, Fortnightly }
```

```sql
CREATE TABLE award_configurations (
    award_configuration_id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(venue_id),
    award_id UUID NOT NULL REFERENCES award_definitions(award_id),
    effective_from_utc TIMESTAMPTZ NOT NULL,
    effective_to_utc TIMESTAMPTZ,
    casual_loading_percent NUMERIC(5,2) NOT NULL,
    superannuation_rate_percent NUMERIC(5,2) NOT NULL,
    pay_period TEXT NOT NULL,
    pay_period_cutoff_day SMALLINT NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Partial unique index: only one "currently active" config per venue
CREATE UNIQUE INDEX idx_award_config_active_per_venue
    ON award_configurations(venue_id) WHERE effective_to_utc IS NULL;

CREATE TABLE award_configuration_penalty_toggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    award_configuration_id UUID NOT NULL REFERENCES award_configurations(award_configuration_id) ON DELETE CASCADE,
    penalty_type TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL
);

CREATE TABLE role_award_mappings (
    role_award_mapping_id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(venue_id),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    award_classification_id UUID NOT NULL REFERENCES award_classifications(award_classification_id),
    effective_from_utc TIMESTAMPTZ NOT NULL,
    effective_to_utc TIMESTAMPTZ,
    created_by_user_id UUID NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_role_award_mapping_active
    ON role_award_mappings(role_id) WHERE effective_to_utc IS NULL;

-- Reference data (system-owned, not owner-editable)
CREATE TABLE award_definitions (award_id UUID PRIMARY KEY, award_code TEXT NOT NULL, name TEXT NOT NULL, jurisdiction TEXT NOT NULL);
CREATE TABLE award_classifications (award_classification_id UUID PRIMARY KEY, award_id UUID REFERENCES award_definitions(award_id), name TEXT NOT NULL, description TEXT);
CREATE TABLE award_rates (
    award_rate_id UUID PRIMARY KEY,
    award_classification_id UUID REFERENCES award_classifications(award_classification_id),
    effective_from_utc TIMESTAMPTZ NOT NULL,
    effective_to_utc TIMESTAMPTZ,
    base_hourly_rate NUMERIC(8,2) NOT NULL,
    casual_loading_percent_min NUMERIC(5,2) NOT NULL
);
```

`IAwardRateCalculator.CalculateRate(shift, role, date)` resolves: `RoleAwardMapping` active
on `date` → `AwardClassification` → `AwardRate` active on `date`, then layers the venue's
`AwardConfiguration` active on `date` (loading %, enabled penalties, super rate) on top.
Two independent temporal lookups, both resolved against the shift's date — never "now".

---

## 5. CQRS Commands & Queries

| Type | Name | Notes |
|---|---|---|
| Command | `UpdateAwardConfigurationCommand` | Never updates in place — handler calls `Supersede()` on current, then `CreateNewVersion()`. Wrapped in a transaction. |
| Command | `SetRoleAwardMappingCommand` | Same supersede-then-create pattern, scoped to a single `RoleId`. |
| Command | `TogglePenaltyRateCommand` | Convenience command, internally still goes through the versioning flow. |
| Query | `GetActiveAwardConfigurationQuery(venueId)` | For settings UI — "what's active right now". |
| Query | `GetAwardConfigurationHistoryQuery(venueId)` | For audit/compliance review, and for payroll recalculation debugging. |
| Query | `GetAvailableAwardsQuery` | Populates the award dropdown from reference data. |
| Query | `GetUnmappedRolesQuery(venueId)` | Drives a settings warning banner: "3 roles have no award mapping." |

`UpdateAwardConfigurationCommand` should run through `FluentValidation` at the API boundary
(consistent with existing convention) checking: award exists, casual loading ≥ award minimum
for at least one classification in use, super rate handling as described above.

---

## 6. Validation Rules

- Casual loading % cannot be saved below the award-mandated minimum for any currently-mapped
  classification (hard block, no override — this one's a legal minimum, not a suggestion).
- Super rate below statutory minimum requires explicit owner confirmation (soft block).
- A venue cannot have zero enabled penalty rates if its trading hours (Section 1) include
  weekend or public-holiday trade — soft warning, not a hard block, since some owners
  genuinely pay flat rates above award as a deliberate simplification (still award-compliant
  if the flat rate exceeds the maximum penalty rate, but that's a business decision the
  product shouldn't silently assume).
- Every `Role` used in an active roster must have an active `RoleAwardMapping` before shifts
  using that role can be published — this is enforced at roster-publish time, not just
  flagged in settings, since an unmapped role publishing is the actual compliance failure.

---

## 7. UI / UX Design

**Location:** Settings → "Award & Pay" tab.

```
┌─ Settings ───────────────────────────────────────────────┐
│ [Venue Profile] [Award & Pay] [Roster Rules] [Staff/Roles]│
├────────────────────────────────────────────────────────────┤
│  Award & Pay Configuration                                  │
│  ─────────────────────────                                  │
│  Applicable Award                                            │
│  [ Hospitality Industry (General) Award (MA000009) ▾ ]      │
│                                                               │
│  ⚠ 3 roles are not yet mapped to an award classification.   │
│     [Go to Role Mapping →]                                   │
│                                                               │
│  Casual Loading            [ 25.00 ] %   (award minimum: 25%)│
│  Superannuation Guarantee  [ 12.00 ] %   ✓ meets minimum     │
│                                                               │
│  Penalty Rates                                                │
│   ☑ Saturday        ☑ Sunday         ☑ Public Holiday        │
│   ☐ Evening (after 7pm)   ☐ Early morning (before 7am)       │
│                                                               │
│  Pay Period          ( ) Weekly   (•) Fortnightly            │
│  Pay Run Cut-off Day [ Sunday ▾ ]                             │
│                                                               │
│                                    [Cancel]  [Save Changes]   │
│  ─────────────────────────                                  │
│  Role → Award Classification Mapping                        │
│                                                               │
│   Bartender          → [ F&B Grade 2         ▾ ]  ✓          │
│   Head Chef           → [ Cook Grade 4        ▾ ]  ✓          │
│   Kitchen Hand         → [ (not mapped)       ▾ ]  ⚠          │
│   Weekend Runner       → [ F&B Grade 1        ▾ ]  ✓          │
│                                                               │
│  [+ Add custom role]                       [Save Mappings]   │
│                                                               │
│  ─────────────────────────                                  │
│  Configuration History                            [Expand ▾] │
│  Shows past versions with effective date ranges, for audit.  │
└────────────────────────────────────────────────────────────┘
```

**Components:**
- `AwardSelect` — dropdown sourced from `GetAvailableAwardsQuery`, disabled (with an
  explanatory tooltip) if any roster has already been published under the current award,
  since switching awards mid-stream needs a guided flow, not a silent dropdown change.
- `RoleAwardMappingTable` — one row per `Role` (pulled from Staff & Roles section), each row
  a `Select` of classifications scoped to the currently selected award. Unmapped rows show a
  amber warning icon; the "3 roles are not yet mapped" banner at the top deep-links here.
- `SuperRateInput` — numeric input with inline validation state (green check / amber warning
  with confirm dialog if below minimum).
- `ConfigurationHistoryPanel` — collapsed by default, expands into a simple table of past
  versions (`EffectiveFrom` – `EffectiveTo`, changed by, changed at) for compliance review —
  this is largely a read-only audit view, not something owners interact with often, so it
  should be visually de-emphasised (collapsed accordion) rather than competing for attention
  with the actual configuration form.
- Saving triggers a confirmation toast that explicitly states the change takes effect "from
  today" and does not retroactively alter past pay periods — small copy detail, but important
  for owner trust in a compliance-adjacent feature.
