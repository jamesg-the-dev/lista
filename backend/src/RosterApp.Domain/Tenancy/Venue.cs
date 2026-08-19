namespace RosterApp.Domain.Tenancy;

/// <summary>
/// Child of Organisation. Staff, shifts, and rosters all carry a VenueId —
/// this is the unit tenant-scoping actually checks against, not the
/// Organisation directly (a manager can be scoped to a subset of venues
/// within their org).
/// </summary>
public sealed class Venue
{
    public Guid Id { get; private set; }
    public Guid OrganisationId { get; private set; }
    public string Name { get; private set; } = null!;
    public DateTime CreatedAtUtc { get; private set; }

    private Venue() { } // EF Core

    public static Venue Create(Guid organisationId, string name)
    {
        return new Venue
        {
            Id = Guid.NewGuid(),
            OrganisationId = organisationId,
            Name = name,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }
}
