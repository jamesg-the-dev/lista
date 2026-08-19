namespace RosterApp.Domain.Tenancy;

/// <summary>
/// Join record granting a Manager access to a Venue. Composite key
/// (ManagerId, VenueId) — configured in RosterDbContext, not here.
/// </summary>
public sealed class ManagerVenueAccess
{
    public Guid ManagerId { get; private set; }
    public Guid VenueId { get; private set; }

    private ManagerVenueAccess() { } // EF Core

    public static ManagerVenueAccess Create(Guid managerId, Guid venueId)
    {
        return new ManagerVenueAccess
        {
            ManagerId = managerId,
            VenueId = venueId,
        };
    }
}
