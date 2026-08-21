using Microsoft.EntityFrameworkCore;
using RosterApp.Application.RosterCompliance;
using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Infrastructure.RosterCompliance;

public sealed class RosterComplianceConfigurationRepository(RosterDbContext dbContext) : IRosterComplianceConfigurationRepository
{
    public Task<RosterComplianceConfiguration?> GetActiveByVenueIdAsync(Guid venueId, CancellationToken cancellationToken) =>
        dbContext.RosterComplianceConfigurations
            .FirstOrDefaultAsync(c => c.VenueId == venueId && c.EffectiveToUtc == null, cancellationToken);

    public void Add(RosterComplianceConfiguration configuration) => dbContext.RosterComplianceConfigurations.Add(configuration);
}
