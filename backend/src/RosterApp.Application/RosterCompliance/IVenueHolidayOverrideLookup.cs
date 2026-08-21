namespace RosterApp.Application.RosterCompliance;

public interface IVenueHolidayOverrideLookup
{
    Task<IReadOnlyList<VenueHolidayOverrideDto>> GetForVenueAsync(Guid venueId, CancellationToken cancellationToken);
}
