using Microsoft.EntityFrameworkCore;
using RosterApp.Application.AwardConfig;
using RosterApp.Domain.AwardConfig;

namespace RosterApp.Infrastructure.AwardConfig;

public sealed class RoleAwardMappingRepository(RosterDbContext dbContext) : IRoleAwardMappingRepository
{
    public Task<RoleAwardMapping?> GetActiveByRoleIdAsync(Guid roleId, CancellationToken cancellationToken) =>
        dbContext.RoleAwardMappings
            .FirstOrDefaultAsync(m => m.RoleId == roleId && m.EffectiveToUtc == null, cancellationToken);

    public void Add(RoleAwardMapping mapping) => dbContext.RoleAwardMappings.Add(mapping);
}
