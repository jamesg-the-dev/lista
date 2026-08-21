using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

public sealed class AwardConfigurationRepository(RosterDbContext dbContext) : IAwardConfigurationRepository
{
    public Task<AwardConfiguration?> GetActiveByVenueIdAsync(Guid venueId, CancellationToken cancellationToken) =>
        dbContext.AwardConfigurations
            .FirstOrDefaultAsync(c => c.VenueId == venueId && c.EffectiveToUtc == null, cancellationToken);

    public void Add(AwardConfiguration configuration) => dbContext.AwardConfigurations.Add(configuration);
}
