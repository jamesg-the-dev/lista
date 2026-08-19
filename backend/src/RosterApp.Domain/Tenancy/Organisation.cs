namespace RosterApp.Domain.Tenancy;

/// <summary>
/// Tenancy root. Owns one or more Venues; every Staff/Shift/Roster record
/// is scoped under a Venue that belongs to exactly one Organisation.
/// </summary>
public sealed class Organisation
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public DateTime CreatedAtUtc { get; private set; }

    private Organisation() { } // EF Core

    public static Organisation Create(string name)
    {
        return new Organisation
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }
}
