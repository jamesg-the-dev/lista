using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;

namespace RosterApp.Infrastructure.Staffing;

public sealed class RoleUniquenessChecker(RosterDbContext dbContext) : IRoleUniquenessChecker
{
    public Task<bool> IsDisplayNameTakenAsync(
        Guid venueId,
        string displayName,
        Guid? excludeRoleId,
        CancellationToken cancellationToken
    )
    {
        var normalizedName = displayName.Trim().ToLowerInvariant();

        return dbContext
            .Roles.AsNoTracking()
            .Where(r =>
                r.VenueId == venueId && r.IsActive && r.DisplayName.ToLower() == normalizedName
            )
            .Where(r => excludeRoleId == null || r.Id != excludeRoleId)
            .AnyAsync(cancellationToken);
    }
}
