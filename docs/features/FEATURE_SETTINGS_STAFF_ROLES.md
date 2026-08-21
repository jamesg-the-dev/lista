# Feature Spec: Owner Settings — Staff & Roles

**Status:** Ready for build
**Owner area:** Settings → Staff & Roles
**Depends on:** Venue Profile, Award & Pay (`RoleAwardMapping` lives here conceptually but is
persisted/consumed by Award & Pay — see cross-reference below)

---

## 1. Overview

This is where the venue's **custom role list** is defined — the feature that kicked off this
whole settings review. The key design decision, already validated earlier: roles are
venue-defined display labels, and every role *must* map to a fixed award classification to
remain compliant. This document covers the `Role` entity itself, staff permission levels,
default/override pay rates per staff member, and availability rules. The actual
`RoleAwardMapping` entity is defined in `FEATURE_SETTINGS_AWARD_PAY_CONFIG.md` since it's
versioned alongside award configuration — this document treats it as a dependency, not a
duplicate.

---

## 2. Business Requirements

### User Stories

- As an **Owner**, I want to create custom roles (e.g. "Bartender", "Head Chef", "Weekend
  Runner") for my venue, so rostering reflects how my team actually talks about jobs, not
  formal award classification names.
- As an **Owner**, when I create a role, I want to be prompted (or required) to map it to an
  award classification immediately, so I can't accidentally create an unpaid-correctly role.
- As an **Owner**, I want to set staff permission levels (Owner, Manager, Supervisor, Staff),
  so I control who can edit settings, publish rosters, or just view their own shifts.
- As an **Owner**, I want to optionally set an above-award hourly rate override for a
  specific staff member (e.g. a senior bartender paid above the award minimum), without
  changing the award classification itself.
- As an **Owner**, I want to decide whether staff can set their own availability/unavailability
  directly, or whether it requires manager approval, so the workflow matches how my venue
  actually operates.

### Acceptance Criteria

1. `Role` is a venue-scoped entity with a free-text display name, but **cannot be used in a
   published roster** until it has an active `RoleAwardMapping` (enforced at roster-publish
   time, cross-checked against Section 2's requirements).
2. Creating a role surfaces the award mapping step inline (not as a separate, skippable
   step) — this is the single most important UX guardrail in this document, directly
   addressing the original problem this whole settings section was designed to solve.
3. Permission levels are a fixed enum (`Owner`, `Manager`, `Supervisor`, `Staff`) — not
   custom/configurable, to keep the permission matrix auditable and simple. Each level has a
   fixed, code-defined capability set (documented below), not per-venue customisable
   permissions, which would explode QA surface area for little real-world benefit at MVP.
4. Above-award rate overrides are per staff member, optional, and stored as a modifier on top
   of (never instead of) the award-derived base rate, so payroll export can show both the
   award rate and the applied override transparently.
5. Availability self-service is a venue-level toggle (on / on-with-approval / off), not
   per-staff, to keep the settings surface simple — per-staff exceptions can be a fast-follow
   if real usage demands it, not built speculatively now.

---

## 3. Domain Model (DDD)

```
Role (Entity, venue-scoped — NOT the RoleAwardMapping itself, see Award & Pay doc)
 ├─ RoleId (Guid)
 ├─ VenueId (FK)
 ├─ DisplayName (e.g. "Bartender")
 ├─ ColorTag (for roster UI — visual grouping by role)
 ├─ IsActive (bool)
 ├─ CreatedByUserId / CreatedAtUtc
 └─ (RoleAwardMapping is looked up separately by RoleId — see Award & Pay doc, kept
     decoupled so award mapping can be re-versioned without touching the Role entity itself)

StaffMember (Aggregate Root — likely already exists elsewhere in the domain; settings-relevant
             fields only shown here)
 ├─ StaffMemberId
 ├─ VenueId
 ├─ Name, PhoneNumber (existing value object), Email, DateOfBirth
 ├─ PermissionLevel (enum: Owner / Manager / Supervisor / Staff)
 ├─ PrimaryRoleId (FK → Role, nullable — a staff member can be rostered under multiple roles
 │                  but has a "usual" one for default rostering)
 ├─ PayRateOverride: PayRateOverride? (owned, nullable value object)
 └─ IsActive

PayRateOverride (Value Object)
 ├─ OverrideHourlyRate (decimal)
 ├─ Reason (free text, required — "Senior bartender, 5 yrs experience")
 ├─ EffectiveFromUtc / EffectiveToUtc (nullable)
 └─ SetByUserId

VenueAvailabilitySettings (Value Object, part of Venue or its own small config — one per venue)
 ├─ SelfServiceMode (enum: Disabled / RequiresApproval / AutoApproved)
 └─ AdvanceNoticeDays (int — minimum notice staff must give for unavailability requests)
```

**Permission matrix (fixed, code-defined — not stored as configurable data):**

| Capability | Owner | Manager | Supervisor | Staff |
|---|---|---|---|---|
| Edit Settings (all sections) | ✓ | ✗ | ✗ | ✗ |
| Publish/edit rosters | ✓ | ✓ | ✓ (own venue) | ✗ |
| View labour cost dashboard | ✓ | ✓ | ✗ | ✗ |
| Approve shift swaps | ✓ | ✓ | ✓ | ✗ |
| Set own availability | ✓ | ✓ | ✓ | ✓ (per venue toggle) |
| View own roster/shifts | ✓ | ✓ | ✓ | ✓ |

This table lives in code (a policy/authorisation handler), not the database — it's a
deliberate simplification versus a fully data-driven permission system, appropriate for MVP
scale, and matches the existing `IPermissionBehavior` pipeline pattern from Pentana.

---

## 4. Data Model (EF Core / PostgreSQL)

```csharp
public class Role
{
    public Guid RoleId { get; private set; }
    public Guid VenueId { get; private set; }
    public string DisplayName { get; private set; } = null!;
    public string? ColorTag { get; private set; }
    public bool IsActive { get; private set; } = true;
    public Guid CreatedByUserId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private Role() { }

    public static Role Create(Guid venueId, string displayName, string? colorTag, Guid createdByUserId)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new DomainException("Role name is required.");

        return new Role
        {
            RoleId = Guid.NewGuid(),
            VenueId = venueId,
            DisplayName = displayName.Trim(),
            ColorTag = colorTag,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public void Deactivate() => IsActive = false;
}

public class StaffMember
{
    public Guid StaffMemberId { get; private set; }
    public Guid VenueId { get; private set; }
    public string Name { get; private set; } = null!;
    public PhoneNumber Phone { get; private set; } = null!;
    public string? Email { get; private set; }
    public DateOnly DateOfBirth { get; private set; }
    public PermissionLevel PermissionLevel { get; private set; }
    public Guid? PrimaryRoleId { get; private set; }
    public PayRateOverride? PayRateOverride { get; private set; }
    public bool IsActive { get; private set; } = true;

    public bool IsMinorAsOf(DateOnly date) =>
        date.Year - DateOfBirth.Year - (date < DateOfBirth.AddYears(date.Year - DateOfBirth.Year) ? 1 : 0) < 18;

    private StaffMember() { }

    public static StaffMember Create(Guid venueId, string name, PhoneNumber phone, string? email,
        DateOnly dateOfBirth, PermissionLevel level, Guid? primaryRoleId)
    {
        return new StaffMember
        {
            StaffMemberId = Guid.NewGuid(),
            VenueId = venueId,
            Name = name.Trim(),
            Phone = phone,
            Email = email,
            DateOfBirth = dateOfBirth,
            PermissionLevel = level,
            PrimaryRoleId = primaryRoleId
        };
    }

    public void SetPayRateOverride(decimal hourlyRate, string reason, Guid setByUserId)
    {
        if (hourlyRate <= 0) throw new DomainException("Override rate must be positive.");
        if (string.IsNullOrWhiteSpace(reason)) throw new DomainException("A reason is required for pay rate overrides.");
        PayRateOverride = PayRateOverride.Create(hourlyRate, reason, setByUserId);
    }

    public void ClearPayRateOverride() => PayRateOverride = null;
}

[Owned]
public class PayRateOverride
{
    public decimal OverrideHourlyRate { get; private set; }
    public string Reason { get; private set; } = null!;
    public DateTime EffectiveFromUtc { get; private set; }
    public Guid SetByUserId { get; private set; }

    private PayRateOverride() { }

    public static PayRateOverride Create(decimal rate, string reason, Guid setByUserId) => new()
    {
        OverrideHourlyRate = rate,
        Reason = reason,
        EffectiveFromUtc = DateTime.UtcNow,
        SetByUserId = setByUserId
    };
}

public enum PermissionLevel { Owner, Manager, Supervisor, Staff }
```

```sql
CREATE TABLE roles (
    role_id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(venue_id),
    display_name TEXT NOT NULL,
    color_tag TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_user_id UUID NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_roles_venue_name ON roles(venue_id, lower(display_name)) WHERE is_active;

CREATE TABLE staff_members (
    staff_member_id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(venue_id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    date_of_birth DATE NOT NULL,
    permission_level TEXT NOT NULL,
    primary_role_id UUID REFERENCES roles(role_id),
    override_hourly_rate NUMERIC(8,2),
    override_reason TEXT,
    override_effective_from_utc TIMESTAMPTZ,
    override_set_by_user_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_staff_members_venue ON staff_members(venue_id);

CREATE TABLE venue_availability_settings (
    venue_id UUID PRIMARY KEY REFERENCES venues(venue_id),
    self_service_mode TEXT NOT NULL DEFAULT 'RequiresApproval',
    advance_notice_days INT NOT NULL DEFAULT 7
);
```

---

## 5. CQRS Commands & Queries

| Type | Name | Notes |
|---|---|---|
| Command | `CreateRoleCommand` | Returns `RoleId`; UI immediately opens award mapping step using this ID. |
| Command | `DeactivateRoleCommand` | Blocked if role is used in any future published roster. |
| Command | `CreateStaffMemberCommand` | Standard staff onboarding. |
| Command | `UpdateStaffPermissionLevelCommand` | Owner only; cannot demote the last remaining Owner on a venue. |
| Command | `SetStaffPayRateOverrideCommand` / `ClearStaffPayRateOverrideCommand` | Owner/Manager only. |
| Command | `UpdateVenueAvailabilitySettingsCommand` | Venue-level toggle, Owner only. |
| Query | `GetRolesForVenueQuery` | Feeds both this settings screen and the Award & Pay mapping table. |
| Query | `GetStaffForVenueQuery` | Settings + roster builder staff picker. |
| Query | `GetUnmappedRolesQuery` | Same query referenced in Award & Pay doc — shared between both settings sections for the warning banner. |

---

## 6. Validation Rules

- Role display names must be unique per venue (case-insensitive), among active roles.
- A role cannot be deactivated while referenced by `PrimaryRoleId` on any active staff member
  or used in a future/published roster — soft-delete only, never hard delete, consistent with
  append-only/audit conventions used elsewhere.
- At least one `Owner`-level staff member must exist per venue at all times — the last Owner
  cannot be demoted or deactivated without first promoting another staff member to Owner.
- `PayRateOverride.OverrideHourlyRate` should trigger a soft warning if it's *below* the
  award-derived rate for that staff member's mapped role (not blocked — an owner might have a
  legitimate reason tied to a probation period structured differently, but it's worth flagging).
- `DateOfBirth` is required for all staff (drives the minor roster rules from Section 3), and
  the UI should be explicit about why it's collected (compliance, not marketing).

---

## 7. UI / UX Design

**Location:** Settings → "Staff & Roles" tab. This tab is naturally the busiest of the four,
so it's split into two clearly separated sub-sections within the tab rather than further tabs.

```
┌─ Settings ───────────────────────────────────────────────┐
│ [Venue Profile] [Award & Pay] [Roster Rules] [Staff/Roles]│
├────────────────────────────────────────────────────────────┤
│  Roles                                          [+ New Role] │
│  ─────────────────────────                                  │
│   🔵 Bartender         Mapped: F&B Grade 2          [Edit]   │
│   🟢 Head Chef          Mapped: Cook Grade 4          [Edit]   │
│   🟡 Weekend Runner     Mapped: F&B Grade 1          [Edit]   │
│   ⚪ Kitchen Hand        ⚠ Not mapped                 [Edit]   │
│                                                               │
│  ── New Role dialog (triggered by [+ New Role]) ──           │
│  │  Role name        [ Cellar Hand              ]         │  │
│  │  Colour tag        (•)🔵 ( )🟢 ( )🟡 ( )🟣 ( )⚪         │  │
│  │  Award classification (required)                        │  │
│  │            [ Select classification ▾ ]                  │  │
│  │  ⓘ Every role must map to an award classification        │  │
│  │    before it can be used on a published roster.          │  │
│  │                                    [Cancel] [Create Role] │  │
│  ─────────────────────────                                  │
│  Staff                                        [+ Add Staff]  │
│                                                               │
│   Name           Role          Permission   Rate      ⋮      │
│   Sarah Chen      Bartender     Manager      Award      •••   │
│   Tom Ridley       Head Chef     Staff        +$3.50/hr  •••   │
│   Amy Nguyen        Kitchen Hand  Staff        Award      •••   │
│                                                               │
│  ─────────────────────────                                  │
│  Staff Availability Self-Service                             │
│   Mode  ( ) Disabled  (•) Requires manager approval  ( ) Auto│
│   Minimum notice     [ 7 ] days                                │
└────────────────────────────────────────────────────────────┘
```

**Components:**
- `RoleList` — compact row list with a coloured dot (role's `ColorTag`, reused later in the
  roster grid for visual scanning), mapping status pill, inline "Edit" opening the same
  dialog used for creation, pre-filled.
- `NewRoleDialog` — this is the single most important UI moment in this whole settings
  system: the award classification select is **not optional** and sits directly under the
  role name field, with the info line making the "why" explicit rather than just disabling
  the Create button with no explanation. This directly operationalises the earlier insight
  that custom roles must not be allowed to drift away from award compliance.
- `StaffTable` — standard data table (shadcn `Table` or `DataTable` if using TanStack Table),
  Rate column shows "Award" as a neutral badge when no override exists, or "+$X.XX/hr" as a
  small positive-toned badge when an override is active — deliberately not showing the full
  dollar rate inline to avoid a cluttered table; full detail is in the row's edit drawer.
- `StaffEditDrawer` (opened via the ⋮ menu) — permission level select, pay rate override
  section (toggle + rate + required reason field), primary role select.
- `AvailabilitySettingsCard` — simple radio group + numeric input, sits below the staff table
  since it's a single venue-wide toggle rather than a per-staff configuration, visually
  separated to avoid implying it's part of the staff table itself.
