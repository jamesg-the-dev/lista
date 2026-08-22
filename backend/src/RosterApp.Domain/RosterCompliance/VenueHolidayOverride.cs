namespace RosterApp.Domain.RosterCompliance;

/// <summary>
/// Owner-added, venue-specific closure day (e.g. a private event) —
/// additive only per §6: a real public holiday can't be deleted, only
/// supplemented. Not an AggregateRoot — nothing downstream reacts to a
/// closure day being added yet, so it stays a plain entity, same treatment
/// as AwardDefinition.
/// </summary>
public sealed class VenueHolidayOverride
{
    public Guid Id { get; private set; }
    public Guid VenueId { get; private set; }
    public DateOnly OverrideDate { get; private set; }
    public string Name { get; private set; } = null!;
    public Guid CreatedByStaffMemberId { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    private VenueHolidayOverride() { } // EF Core

    public static VenueHolidayOverride Create(Guid venueId, DateOnly overrideDate, string name, Guid createdByStaffMemberId) =>
        new()
        {
            Id = Guid.NewGuid(),
            VenueId = venueId,
            OverrideDate = overrideDate,
            Name = name,
            CreatedByStaffMemberId = createdByStaffMemberId,
            CreatedAtUtc = DateTime.UtcNow,
        };
}
