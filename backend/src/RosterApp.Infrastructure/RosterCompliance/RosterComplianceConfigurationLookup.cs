using Microsoft.EntityFrameworkCore;
using RosterApp.Application.RosterCompliance;

namespace RosterApp.Infrastructure.RosterCompliance;

public sealed class RosterComplianceConfigurationLookup(RosterDbContext dbContext) : IRosterComplianceConfigurationLookup
{
    public async Task<RosterComplianceConfigurationDto?> GetActiveAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var config = await dbContext.RosterComplianceConfigurations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.VenueId == venueId && c.EffectiveToUtc == null, cancellationToken);

        return config is null ? null : RosterComplianceConfigurationDto.FromDomain(config);
    }

    public async Task<IReadOnlyList<RosterComplianceConfigurationDto>> GetHistoryAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var configs = await dbContext.RosterComplianceConfigurations
            .AsNoTracking()
            .Where(c => c.VenueId == venueId)
            .OrderByDescending(c => c.EffectiveFromUtc)
            .ToListAsync(cancellationToken);

        return configs.Select(RosterComplianceConfigurationDto.FromDomain).ToList();
    }
}
