using RosterApp.Application.RosterCompliance;
using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Infrastructure.RosterCompliance;

public sealed class VenueHolidayOverrideRepository(RosterDbContext dbContext) : IVenueHolidayOverrideRepository
{
    public void Add(VenueHolidayOverride venueHolidayOverride) => dbContext.VenueHolidayOverrides.Add(venueHolidayOverride);
}
