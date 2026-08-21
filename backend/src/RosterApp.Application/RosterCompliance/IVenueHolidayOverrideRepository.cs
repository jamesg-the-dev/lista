using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

public interface IVenueHolidayOverrideRepository
{
    void Add(VenueHolidayOverride venueHolidayOverride);
}
