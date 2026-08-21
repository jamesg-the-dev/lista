using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

public sealed class RoleAwardMappingLookup(RosterDbContext dbContext) : IRoleAwardMappingLookup
{
    public async Task<IReadOnlyList<RoleAwardMappingDto>> GetActiveMappingsForVenueAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var mappings = await dbContext.RoleAwardMappings
            .AsNoTracking()
            .Where(m => m.VenueId == venueId && m.EffectiveToUtc == null)
            .ToListAsync(cancellationToken);

        return mappings.Select(RoleAwardMappingDto.FromDomain).ToList();
    }
}
