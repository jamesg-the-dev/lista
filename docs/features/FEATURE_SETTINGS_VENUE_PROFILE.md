# Feature Spec: Owner Settings — Venue & Business Profile

**Status:** Ready for build
**Owner area:** Settings → Venue Profile
**Depends on:** Tenant/Organisation aggregate (existing), Auth/permissions model

---

## 1. Overview

This is the foundational settings group. Every other settings section (award config, roster
rules, staff/roles) either belongs to a specific venue or inherits defaults from it, so the
data model here needs to support **multi-venue organisations from day one**, even if the UI
only surfaces a single venue for most customers initially. Retrofitting multi-venue support
later means a painful migration of every FK that currently points at "the org" instead of
"the venue" — cheaper to model it correctly now and hide the complexity in the UI.

---

## 2. Business Requirements

### User Stories

- As an **Owner**, I want to set up my venue's core business details (name, ABN, address,
  timezone) so that rosters, payroll exports, and compliance calculations use correct data.
- As an **Owner** with more than one venue, I want to manage each venue's profile separately,
  and choose whether new settings I create should apply to all venues or just one.
- As an **Owner**, I want to define trading hours per day of the week, so the roster builder
  can warn managers when a shift is scheduled outside normal operating hours.
- As a **Manager**, I want to view (but not edit) the venue profile so I understand which
  timezone and trading hours the roster is built against.

### Acceptance Criteria

1. Venue profile requires: Venue name, ABN (validated, 11-digit with checksum), address
   (structured, not free text), timezone (IANA identifier, defaulted from address state).
2. Owner accounts can have 1..N venues. Org-level settings (billing, owner user list) live
   above the venue; operational settings (award, roster rules, staff) live at venue level
   with an explicit "copy from another venue" action rather than silent inheritance.
3. Trading hours support different hours per day, multiple sessions per day (e.g. lunch +
   dinner service with a gap), and a "closed" toggle per day.
4. ABN validation happens client-side (checksum) and should ideally be verified against the
   ABN Lookup API (ABR) as a stretch goal — not required for MVP but the field should be
   structured to support it later.
5. Only Owner role can edit; Manager and Staff roles are read-only on this section.
6. All changes are audited (who changed what, when) — consistent with the append-only audit
   pattern already used in Pentana's CCC workflow.

---

## 3. Domain Model (DDD)

```
Organisation (Aggregate Root)
 ├─ OrganisationId (Guid)
 ├─ Name
 ├─ OwnerUserId
 ├─ Venues: List<Venue>  (entity, not separate aggregate — venue lifecycle is owned by Org)
 └─ BillingProfile (existing, out of scope here)

Venue (Entity within Organisation aggregate)
 ├─ VenueId (Guid)
 ├─ OrganisationId (FK)
 ├─ Name
 ├─ Abn (value object)
 ├─ Address (value object)
 ├─ Timezone (IANA string, e.g. "Australia/Melbourne")
 ├─ TradingHours: List<TradingHourSession> (owned collection)
 ├─ IsActive
 ├─ CreatedAtUtc / CreatedBy
 └─ RowVersion (concurrency token)

TradingHourSession (Value Object, owned by Venue)
 ├─ DayOfWeek (enum)
 ├─ SessionLabel (e.g. "Lunch", "Dinner", nullable — null = single session)
 ├─ OpenTime (TimeOnly)
 ├─ CloseTime (TimeOnly)
 └─ IsClosed (bool)

Abn (Value Object)
 ├─ Value (string, 11 digits, no spaces stored)
 └─ Factory method: Abn.Create(string raw) — validates checksum, throws DomainException

Address (Value Object)
 ├─ Line1, Line2, Suburb, State (enum: NSW/VIC/QLD/WA/SA/TAS/ACT/NT), Postcode, Country
```

Following the existing convention: **private constructors + static factory methods**
(`Venue.Create(...)`, `Abn.Create(...)`) so invalid states are unrepresentable. `Abn` and
`Address` are immutable value objects compared by value, consistent with the
`PhoneNumber` value object already built for Hospo Roster.

**Why Venue is an entity inside Organisation, not its own aggregate:** venue creation/
deactivation must go through the Organisation's invariants (e.g. "an org must have at least
one active venue", "can't delete a venue with a published future roster"). Keeping it inside
the aggregate boundary lets `Organisation` enforce that without cross-aggregate transactions.

---

## 4. Data Model (EF Core / PostgreSQL — Supabase)

```csharp
public class Venue
{
    public Guid VenueId { get; private set; }
    public Guid OrganisationId { get; private set; }
    public string Name { get; private set; } = null!;
    public Abn Abn { get; private set; } = null!;
    public Address Address { get; private set; } = null!;
    public string Timezone { get; private set; } = "Australia/Melbourne";
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAtUtc { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    [Timestamp] public uint RowVersion { get; private set; }

    private readonly List<TradingHourSession> _tradingHours = new();
    public IReadOnlyCollection<TradingHourSession> TradingHours => _tradingHours.AsReadOnly();

    private Venue() { } // EF

    public static Venue Create(Guid organisationId, string name, Abn abn, Address address,
        string timezone, Guid createdByUserId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Venue name is required.");

        return new Venue
        {
            VenueId = Guid.NewGuid(),
            OrganisationId = organisationId,
            Name = name.Trim(),
            Abn = abn,
            Address = address,
            Timezone = timezone,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = createdByUserId
        };
    }

    public void UpdateTradingHours(IEnumerable<TradingHourSession> sessions)
    {
        _tradingHours.Clear();
        _tradingHours.AddRange(sessions);
    }
}

[Owned]
public class TradingHourSession
{
    public DayOfWeek DayOfWeek { get; private set; }
    public string? SessionLabel { get; private set; }
    public TimeOnly? OpenTime { get; private set; }
    public TimeOnly? CloseTime { get; private set; }
    public bool IsClosed { get; private set; }

    private TradingHourSession() { }

    public static TradingHourSession Open(DayOfWeek day, TimeOnly open, TimeOnly close, string? label = null)
    {
        if (close <= open)
            throw new DomainException("Close time must be after open time.");
        return new TradingHourSession { DayOfWeek = day, OpenTime = open, CloseTime = close, SessionLabel = label };
    }

    public static TradingHourSession Closed(DayOfWeek day) =>
        new() { DayOfWeek = day, IsClosed = true };
}
```

**EF Core configuration notes:**
- `Address` and `Abn` mapped as `[Owned]` complex types (Postgres — stored as columns on
  `Venues` table, prefixed `Address_*` / `Abn_*`, OR as jsonb if you want schema flexibility
  for international expansion later — recommend plain columns for MVP, jsonb is premature).
- `TradingHourSession` mapped as an owned **collection**, which in EF Core + Postgres becomes
  a separate table `VenueTradingHours` with a shadow FK `VenueId`. This is the cleanest option
  since owned collections can't be jsonb-mapped as easily as single owned types.
- Multi-tenancy: `OrganisationId` participates in the existing tenant isolation strategy
  (global query filter), same pattern as `ServiceRepairOrder_`-prefixed DB isolation in
  Pentana, just applied via Postgres row-level tenancy rather than database-per-tenant.

```sql
CREATE TABLE venues (
    venue_id UUID PRIMARY KEY,
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id),
    name TEXT NOT NULL,
    abn TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    address_suburb TEXT NOT NULL,
    address_state TEXT NOT NULL,
    address_postcode TEXT NOT NULL,
    address_country TEXT NOT NULL DEFAULT 'AU',
    timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_user_id UUID NOT NULL,
    row_version BYTEA NOT NULL
);

CREATE TABLE venue_trading_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    session_label TEXT,
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_venue_trading_hours_venue ON venue_trading_hours(venue_id);
```

---

## 5. CQRS Commands & Queries (MediatR)

| Type | Name | Notes |
|---|---|---|
| Command | `CreateVenueCommand` | Owner only. Returns `VenueId`. |
| Command | `UpdateVenueProfileCommand` | Name, ABN, address, timezone. Owner only. |
| Command | `UpdateVenueTradingHoursCommand` | Replaces full week's sessions in one call (simpler than per-day patch). |
| Command | `DeactivateVenueCommand` | Blocked if venue has published rosters in the future (domain invariant check). |
| Query | `GetVenueProfileQuery` | Returns profile + trading hours for settings UI. |
| Query | `GetVenuesForOrganisationQuery` | Powers the venue switcher if multi-venue. |

All commands go through the existing `IPermissionBehavior` pipeline — reuse the same pattern
as Pentana's MediatR permission behaviors rather than reinventing authorisation per handler.
`UpdateVenueProfileCommand` and `UpdateVenueTradingHoursCommand` should raise domain events
(`VenueProfileUpdated`, `VenueTradingHoursUpdated`) that the audit interceptor picks up,
mirroring `ICauseCorrectionAuditableEvent`.

---

## 6. Validation Rules

- ABN: 11 digits, passes the ABN checksum algorithm. Reject on save, not just on blur, in
  case of paste.
- Address: postcode must be numeric, 4 digits, and consistent with the selected state
  (loose validation — postcode ranges per state — non-blocking warning, not a hard error).
- Timezone: must be a valid IANA tz string; default suggested from address state
  (VIC → `Australia/Melbourne`, NSW → `Australia/Sydney`, etc.) but editable, since some
  venues near state borders or in WA/NT need explicit control.
- Trading hours: `CloseTime > OpenTime` unless it's a venue that trades past midnight, in
  which case allow `CloseTime < OpenTime` with an explicit "crosses midnight" flag rather
  than silently misinterpreting it — this matters a lot for shift/roster date attribution.
- At least one venue must remain active per organisation at all times.

---

## 7. UI / UX Design

**Location:** Settings → "Venue Profile" (first tab, default landing tab for Settings).

**Layout:** Single-column form inside a card, max-width ~640px, consistent with shadcn form
patterns already used elsewhere in Hospo Roster. Sections separated by subtle dividers
rather than nested cards, to avoid "card-in-card" clutter.

```
┌─ Settings ───────────────────────────────────────────────┐
│ [Venue Profile] [Award & Pay] [Roster Rules] [Staff/Roles]│
├────────────────────────────────────────────────────────────┤
│  Venue Profile                                              │
│  ─────────────────────────                                  │
│  Venue Name        [ The Public House            ]          │
│  ABN                [ 12 345 678 901              ]  ✓       │
│                                                               │
│  Address                                                     │
│  Line 1             [ 123 Chapel St               ]          │
│  Line 2 (optional)  [                              ]          │
│  Suburb             [ Prahran        ]  State [VIC ▾]        │
│  Postcode           [ 3181 ]  Country  Australia              │
│                                                               │
│  Timezone            [ Australia/Melbourne ▾ ]                │
│                                                               │
│  ─────────────────────────                                  │
│  Trading Hours                                               │
│                                                               │
│   Mon   [09:00] – [22:00]        [+ Add session] [✕]         │
│   Tue   [09:00] – [22:00]                          [✕]        │
│   Wed   ☐ Closed                                              │
│   Thu   [09:00] – [22:00]                          [✕]        │
│   Fri   [09:00] – [14:00]  [17:00] – [23:00]  (Lunch/Dinner)  │
│   Sat   [09:00] – [23:00]                          [✕]        │
│   Sun   [10:00] – [21:00]                          [✕]        │
│                                                               │
│                                    [Cancel]  [Save Changes]   │
└────────────────────────────────────────────────────────────┘
```

**Components:**
- `VenueProfileForm` — React Hook Form + Zod schema mirroring the C# validation rules above
  (keep client and server validation logically identical to avoid surprise 400s).
- `TradingHoursEditor` — a per-day row component, each row supporting 1..N session chips;
  "Add session" appends a second open/close pair for split-shift trading days (common for
  hospitality lunch/dinner service).
- `AbnInput` — masked input with live checksum validation and a small green check / red
  cross indicator, debounced.
- Read-only rendering for Manager/Staff roles: same layout, inputs replaced with plain text,
  no Save button — reuse the form component with a `readOnly` prop rather than a separate
  view, so the two never drift out of sync.
- If multi-venue: a venue switcher (shadcn `Select` or `Tabs`, TBD based on typical venue
  count — Select scales better past ~4 venues) sits above the settings tabs, and switching
  venue re-fetches all four settings groups scoped to that `venueId`.

**Empty/first-run state:** New organisations land here first as an onboarding step before
any roster can be built — the roster builder should hard-block with a "Complete your venue
profile" prompt if `Venue.IsProfileComplete` (name, ABN, address, timezone all set) is false.
