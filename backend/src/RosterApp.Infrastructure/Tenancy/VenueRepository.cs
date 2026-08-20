using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Tenancy;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Tenancy;

public sealed class VenueRepository(RosterDbContext dbContext) : IVenueRepository
{
    public Task<Venue?> GetByIdAsync(Guid venueId, CancellationToken cancellationToken) =>
        dbContext.Venues.FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken);
}
