using RosterApp.Domain.Common;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Domain.Staffing;

public enum EmploymentType
{
    Casual,
    PartTime,
    FullTime,
}

/// <summary>
/// MA000009 pay tier. Levels/descriptions are illustrative for
/// UI/architecture purposes only — not sourced from Fair Work's Pay
/// Calculator (see CLAUDE.md § Award compliance). IAwardRateCalculator
/// doesn't key off this yet (Phase 1 takes a raw baseRatePerHour); wiring
/// classification into it is a follow-up once a per-classification rate
/// table is sourced.
/// </summary>
public enum AwardClassification
{
    Introductory,
    Level1,
    Level2,
    Level3,
    Level4,
    Level5,
    Level6,
}

/// <summary>
/// Fixed, code-defined permission tier — see
/// FEATURE_SETTINGS_STAFF_ROLES.md §3's permission matrix. Not enforced by
/// AuthorizationBehavior yet (see its TODO): every authenticated Manager
/// can still call every command today. This field only captures which tier
/// an owner has assigned a staff member to; the "last Owner can't be
/// demoted" invariant (UpdateStaffPermissionLevelCommandHandler) is the one
/// piece of this that's enforced now, since it's a data-integrity rule, not
/// an access-control one.
/// </summary>
/// <summary>
/// Staff is declared first (rather than Owner-first, privilege-descending)
/// so the enum's CLR default (the first member) matches
/// StaffMemberConfiguration's HasDefaultValue(Staff) — EF Core can't tell
/// "explicitly set to the CLR-default member" apart from "not set" for a
/// non-nullable enum column with a DB default, and silently defers to the
/// DB default whenever the two collide. Keeping them the same value makes
/// that ambiguity harmless instead of a silent data-corruption risk (e.g.
/// an explicit Owner assignment landing in the database as Staff).
/// </summary>
public enum PermissionLevel
{
    Staff,
    Supervisor,
    Manager,
    Owner,
}

/// <summary>
/// One row of a staff member's venue assignment. Owned by StaffMember (same
/// OwnsMany pattern as Shift.AwardBreakdown), not a native Postgres array —
/// EF Core 9's "primitive collections" feature (List&lt;Guid&gt; mapped
/// straight to a uuid[] column) fails to scaffold migrations in this
/// project's EF Core/Npgsql tooling combo
/// ("Cannot scaffold C# literals of type
/// System.Reflection.NullabilityInfoContext"), so a real owned child table
/// is used instead. No FK constraint against Venues — membership is
/// validated at the application layer against
/// ICurrentTenantContext.AccessibleVenueIds on every write, and Venues are
/// never deleted in this MVP so orphan risk is negligible.
/// </summary>
public sealed record StaffMemberVenueAssignment(Guid VenueId)
{
    public static StaffMemberVenueAssignment Create(Guid venueId) => new(venueId);
}

/// <summary>
/// Aggregate root for a rostered employee's profile — every authenticated
/// actor (Owner, Manager, Supervisor, or plain Staff) is a StaffMember row,
/// distinguished only by PermissionLevel; there is no separate Manager
/// population. VenueAssignments is owned directly by the aggregate — a
/// staff member's venue assignment is core identity data that every
/// command here (create/update, availability, leave) needs loaded and
/// saved atomically with the profile, not a separate join-entity concern.
/// </summary>
public sealed class StaffMember : AggregateRoot
{
    public Guid Id { get; private set; }

    /// <summary>
    /// Set once at creation and never changed by UpdateProfile — a staff
    /// member can't move between organisations in this MVP. Backs the
    /// (OrganisationId, Email) / (OrganisationId, Phone) uniqueness
    /// enforced by IStaffUniquenessChecker and the matching DB unique
    /// indexes (see StaffMemberConfiguration). Scoped per-organisation
    /// rather than globally so two unrelated tenants using this SaaS don't
    /// collide on the same email/phone.
    /// </summary>
    public Guid OrganisationId { get; private set; }
    public string Name { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public PhoneNumber Phone { get; private set; } = null!;
    public EmploymentType EmploymentType { get; private set; }
    public AwardClassification Classification { get; private set; }
    public int MaxWeeklyHours { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// Required for every staff member — drives the minor rostering rules
    /// referenced by RosterComplianceConfiguration.MinorRosterRule (§2 AC2).
    /// Added in the Staff & Roles build-order step; IRosterComplianceValidator
    /// doesn't consume IsMinorAsOf yet (see MinorRosterRule's doc comment) —
    /// wiring the actual enforcement is a separate follow-up, not part of
    /// this settings CRUD feature.
    /// </summary>
    public DateOnly DateOfBirth { get; private set; }

    public PermissionLevel PermissionLevel { get; private set; }

    /// <summary>
    /// Soft-delete flag, same pattern as Role.IsActive/Venue.IsActive — a
    /// staff member is never hard-deleted since past shifts/timesheets
    /// reference them by EmployeeId with no FK (see Shift.EmployeeId's doc
    /// comment). Defaults true; flipped false only by Deactivate(), never
    /// back — there is no reactivate, matching Role's soft-delete-only
    /// contract.
    /// </summary>
    public bool IsActive { get; private set; } = true;

    /// <summary>
    /// A staff member can be rostered under multiple roles but has a
    /// "usual" one for default rostering — see Role's doc comment for why
    /// this is a plain FK rather than an owned reference (RoleAwardMapping
    /// is looked up separately, kept decoupled from both Role and
    /// StaffMember).
    /// </summary>
    public Guid? PrimaryRoleId { get; private set; }

    public PayRateOverride? PayRateOverride { get; private set; }

    /// <summary>
    /// Null until the staff member activates the staff app (Phase 5) —
    /// managers create the profile first via CreateStaffMemberCommand, then
    /// the staff member links their own Supabase Auth account to it via
    /// LinkStaffSupabaseAccountCommand, matched by email. An Owner/Manager's
    /// own row has this set immediately at creation instead, since they are
    /// their own login.
    /// </summary>
    public string? SupabaseUserId { get; private set; }

    private readonly List<StaffMemberVenueAssignment> _venueAssignments = [];
    public IReadOnlyList<StaffMemberVenueAssignment> VenueAssignments => _venueAssignments.AsReadOnly();
    public IReadOnlyList<Guid> VenueIds => _venueAssignments.Select(a => a.VenueId).ToList();

    private StaffMember() { } // EF Core

    public static StaffMember Create(
        Guid organisationId,
        string name,
        string email,
        string phone,
        DateOnly dateOfBirth,
        EmploymentType employmentType,
        AwardClassification classification,
        int maxWeeklyHours,
        IReadOnlyList<Guid> venueIds,
        PermissionLevel permissionLevel,
        Guid? primaryRoleId)
    {
        var staff = new StaffMember
        {
            Id = Guid.NewGuid(),
            OrganisationId = organisationId,
            Name = name,
            Email = NormalizeEmail(email),
            Phone = ParseMobile(phone),
            DateOfBirth = dateOfBirth,
            EmploymentType = employmentType,
            Classification = classification,
            MaxWeeklyHours = maxWeeklyHours,
            PermissionLevel = permissionLevel,
            PrimaryRoleId = primaryRoleId,
            CreatedAtUtc = DateTime.UtcNow,
        };

        staff._venueAssignments.AddRange(venueIds.Select(StaffMemberVenueAssignment.Create));
        staff.AddDomainEvent(new StaffMemberCreated(staff.Id, DateTime.UtcNow));

        return staff;
    }

    public void UpdateProfile(
        string name,
        string email,
        string phone,
        DateOnly dateOfBirth,
        EmploymentType employmentType,
        AwardClassification classification,
        int maxWeeklyHours,
        IReadOnlyList<Guid> venueIds,
        Guid? primaryRoleId)
    {
        Name = name;
        Email = NormalizeEmail(email);
        Phone = ParseMobile(phone);
        DateOfBirth = dateOfBirth;
        EmploymentType = employmentType;
        Classification = classification;
        MaxWeeklyHours = maxWeeklyHours;
        PrimaryRoleId = primaryRoleId;

        _venueAssignments.Clear();
        _venueAssignments.AddRange(venueIds.Select(StaffMemberVenueAssignment.Create));

        AddDomainEvent(new StaffMemberUpdated(Id, DateTime.UtcNow));
    }

    public bool IsMinorAsOf(DateOnly date) =>
        date.Year - DateOfBirth.Year - (date < DateOfBirth.AddYears(date.Year - DateOfBirth.Year) ? 1 : 0) < 18;

    /// <summary>
    /// The "last remaining Owner can't be demoted" check (§6) needs to
    /// count other Owners across the organisation, which this aggregate
    /// can't do on its own — UpdateStaffPermissionLevelCommandHandler
    /// resolves that via a repository query and passes the result in as
    /// isLastOwner, keeping this method a pure function like
    /// AwardConfiguration.CreateNewVersion's caller-resolved minimums.
    /// </summary>
    public void UpdatePermissionLevel(PermissionLevel permissionLevel, bool isLastOwner)
    {
        if (PermissionLevel == PermissionLevel.Owner && permissionLevel != PermissionLevel.Owner && isLastOwner)
        {
            throw new InvalidOperationException(
                "Cannot demote the last remaining Owner. Promote another staff member to Owner first.");
        }

        PermissionLevel = permissionLevel;
        AddDomainEvent(new StaffMemberPermissionLevelChanged(Id, permissionLevel, DateTime.UtcNow));
    }

    /// <summary>
    /// Idempotent for the same Supabase user (a retried/duplicate call from
    /// the staff app is a no-op, not an error) but rejects re-linking to a
    /// different account — a staff profile maps to exactly one login.
    /// </summary>
    public void LinkSupabaseAccount(string supabaseUserId)
    {
        if (SupabaseUserId == supabaseUserId)
        {
            return;
        }

        if (SupabaseUserId is not null)
        {
            throw new InvalidOperationException(
                $"Staff member '{Id}' is already linked to a different Supabase account.");
        }

        SupabaseUserId = supabaseUserId;
        AddDomainEvent(new StaffMemberSupabaseAccountLinked(Id, DateTime.UtcNow));
    }

    /// <summary>
    /// Layered on top of (never instead of) the award-derived base rate —
    /// see PayRateOverride's doc comment. Below-award-rate is a soft
    /// warning surfaced by the caller (§6), not blocked here, since a
    /// probation-period structure might legitimately justify it.
    /// </summary>
    public void SetPayRateOverride(decimal hourlyRate, string reason, Guid setByStaffMemberId)
    {
        PayRateOverride = PayRateOverride.Create(hourlyRate, reason, setByStaffMemberId);
        AddDomainEvent(new StaffMemberPayRateOverrideSet(Id, DateTime.UtcNow));
    }

    public void ClearPayRateOverride()
    {
        if (PayRateOverride is null)
        {
            return;
        }

        PayRateOverride = null;
        AddDomainEvent(new StaffMemberPayRateOverrideCleared(Id, DateTime.UtcNow));
    }

    /// <summary>
    /// Soft-delete only, mirroring Role.Deactivate — see IsActive's doc
    /// comment. isLastActiveOwner is caller-resolved (
    /// DeactivateStaffMemberCommandHandler queries it via
    /// IStaffLookup.CountByPermissionLevelAsync), same
    /// caller-resolved-invariant pattern as UpdatePermissionLevel's
    /// isLastOwner — this aggregate can't count other Owners on its own.
    /// </summary>
    public void Deactivate(bool isLastActiveOwner)
    {
        if (!IsActive)
        {
            return;
        }

        if (PermissionLevel == PermissionLevel.Owner && isLastActiveOwner)
        {
            throw new InvalidOperationException(
                "Cannot deactivate the last remaining Owner. Promote another staff member to Owner first.");
        }

        IsActive = false;
        AddDomainEvent(new StaffMemberDeactivated(Id, DateTime.UtcNow));
    }

    // Case/whitespace differences shouldn't defeat the email/phone
    // uniqueness constraint (e.g. "A@x.com" vs "a@x.com").
    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    // Staff phone is used for SMS/roster-swap notifications, so it must be a
    // mobile number specifically, not just any valid AU number.
    private static PhoneNumber ParseMobile(string phone)
    {
        if (!PhoneNumber.TryCreateMobile(phone, out var parsed, out var error))
        {
            throw new ArgumentException(error, nameof(phone));
        }

        return parsed;
    }
}
