using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

public sealed class AwardConfigurationLookup(RosterDbContext dbContext) : IAwardConfigurationLookup
{
    public async Task<AwardConfigurationDto?> GetActiveAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var config = await dbContext.AwardConfigurations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.VenueId == venueId && c.EffectiveToUtc == null, cancellationToken);

        return config is null ? null : AwardConfigurationDto.FromDomain(config);
    }

    public async Task<IReadOnlyList<AwardConfigurationDto>> GetHistoryAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var configs = await dbContext.AwardConfigurations
            .AsNoTracking()
            .Where(c => c.VenueId == venueId)
            .OrderByDescending(c => c.EffectiveFromUtc)
            .ToListAsync(cancellationToken);

        return configs.Select(AwardConfigurationDto.FromDomain).ToList();
    }
}
