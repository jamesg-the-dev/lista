namespace RosterApp.Domain.Tenancy;

/// <summary>
/// Internal identity a Supabase Auth user maps to for anyone logging in as
/// a manager (as opposed to StaffMember, added in Phase 2, which represents
/// a rostered employee and gains its own login in Phase 5's staff app).
/// One Manager belongs to exactly one Organisation and can be granted
/// access to a subset of that org's venues via ManagerVenueAccess.
/// </summary>
public sealed class Manager
{
    public Guid Id { get; private set; }
    public Guid OrganisationId { get; private set; }
    public string SupabaseUserId { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public DateTime CreatedAtUtc { get; private set; }

    private Manager() { } // EF Core

    public static Manager Create(Guid organisationId, string supabaseUserId, string name, string email)
    {
        return new Manager
        {
            Id = Guid.NewGuid(),
            OrganisationId = organisationId,
            SupabaseUserId = supabaseUserId,
            Name = name,
            Email = email,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }
}
