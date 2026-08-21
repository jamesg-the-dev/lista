using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Tenancy;

namespace RosterApp.Infrastructure.Tenancy;

public sealed class VenueLookup(RosterDbContext dbContext) : IVenueLookup
{
    public async Task<VenueDto?> GetByIdAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var venue = await dbContext.Venues.AsNoTracking().FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken);
        return venue is null ? null : VenueDto.FromDomain(venue);
    }

    public async Task<IReadOnlyList<VenueDto>> GetForOrganisationAsync(Guid organisationId, CancellationToken cancellationToken)
    {
        var venues = await dbContext.Venues
            .AsNoTracking()
            .Where(v => v.OrganisationId == organisationId)
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);

        return venues.Select(VenueDto.FromDomain).ToList();
    }
}
