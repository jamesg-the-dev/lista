using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Tenancy;
using RosterApp.Domain.Tenancy;

namespace RosterApp.Infrastructure.Tenancy;

public sealed class VenueRepository(RosterDbContext dbContext) : IVenueRepository
{
    public Task<Venue?> GetByIdAsync(Guid venueId, CancellationToken cancellationToken) =>
        dbContext.Venues.FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken);

    public void Add(Venue venue) => dbContext.Venues.Add(venue);

    public Task<int> CountActiveAsync(Guid organisationId, CancellationToken cancellationToken) =>
        dbContext.Venues.CountAsync(v => v.OrganisationId == organisationId && v.IsActive, cancellationToken);
}
