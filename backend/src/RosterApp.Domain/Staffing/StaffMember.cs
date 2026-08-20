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
/// Aggregate root for a rostered employee's profile. VenueAssignments is
/// owned directly by the aggregate — a staff member's venue assignment is
/// core identity data that every command here (create/update, availability,
/// leave) needs loaded and saved atomically with the profile, not a
/// separate join-entity concern like ManagerVenueAccess.
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
    /// Null until the staff member activates the staff app (Phase 5) —
    /// managers create the profile first via CreateStaffMemberCommand, then
    /// the staff member links their own Supabase Auth account to it via
    /// LinkStaffSupabaseAccountCommand, matched by email. Same "Supabase
    /// user id -> internal identity" shape as Manager.SupabaseUserId.
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
        EmploymentType employmentType,
        AwardClassification classification,
        int maxWeeklyHours,
        IReadOnlyList<Guid> venueIds)
    {
        var staff = new StaffMember
        {
            Id = Guid.NewGuid(),
            OrganisationId = organisationId,
            Name = name,
            Email = NormalizeEmail(email),
            Phone = ParseMobile(phone),
            EmploymentType = employmentType,
            Classification = classification,
            MaxWeeklyHours = maxWeeklyHours,
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
        EmploymentType employmentType,
        AwardClassification classification,
        int maxWeeklyHours,
        IReadOnlyList<Guid> venueIds)
    {
        Name = name;
        Email = NormalizeEmail(email);
        Phone = ParseMobile(phone);
        EmploymentType = employmentType;
        Classification = classification;
        MaxWeeklyHours = maxWeeklyHours;

        _venueAssignments.Clear();
        _venueAssignments.AddRange(venueIds.Select(StaffMemberVenueAssignment.Create));

        AddDomainEvent(new StaffMemberUpdated(Id, DateTime.UtcNow));
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
