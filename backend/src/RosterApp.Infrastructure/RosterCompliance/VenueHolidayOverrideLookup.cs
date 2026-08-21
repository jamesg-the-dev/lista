using Microsoft.EntityFrameworkCore;
using RosterApp.Application.RosterCompliance;

namespace RosterApp.Infrastructure.RosterCompliance;

public sealed class VenueHolidayOverrideLookup(RosterDbContext dbContext) : IVenueHolidayOverrideLookup
{
    public async Task<IReadOnlyList<VenueHolidayOverrideDto>> GetForVenueAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var overrides = await dbContext.VenueHolidayOverrides
            .AsNoTracking()
            .Where(o => o.VenueId == venueId)
            .OrderBy(o => o.OverrideDate)
            .ToListAsync(cancellationToken);

        return overrides.Select(VenueHolidayOverrideDto.FromDomain).ToList();
    }
}
