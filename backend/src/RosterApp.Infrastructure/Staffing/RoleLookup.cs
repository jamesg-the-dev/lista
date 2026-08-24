using Microsoft.EntityFrameworkCore;
using RosterApp.Application.Staffing;
using RosterApp.Domain.Staffing;

namespace RosterApp.Infrastructure.Staffing;

/// <summary>
/// Joins across into AwardConfig's RoleAwardMappings/AwardClassificationDefinitions
/// tables so each RoleDto already carries its mapping status — see
/// IRoleLookup's doc comment for why this is fine at the Infrastructure
/// layer despite Role/RoleAwardMapping living in different Application-layer
/// bounded contexts.
/// </summary>
public sealed class RoleLookup(RosterDbContext dbContext) : IRoleLookup
{
    public async Task<IReadOnlyList<RoleDto>> GetRolesForVenueAsync(Guid venueId, CancellationToken cancellationToken)
    {
        var roles = await dbContext.Roles
            .AsNoTracking()
            .Where(r => r.VenueId == venueId)
            .OrderBy(r => r.DisplayName)
            .ToListAsync(cancellationToken);

        return await ComposeAsync(roles, cancellationToken);
    }

    public async Task<RoleDto?> GetRoleAsync(Guid roleId, CancellationToken cancellationToken)
    {
        var role = await dbContext.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);
        if (role is null)
        {
            return null;
        }

        var composed = await ComposeAsync([role], cancellationToken);
        return composed[0];
    }

    private async Task<IReadOnlyList<RoleDto>> ComposeAsync(IReadOnlyList<Role> roles, CancellationToken cancellationToken)
    {
        var roleIds = roles.Select(r => r.Id).ToList();

        var activeMappings = await dbContext.RoleAwardMappings
            .AsNoTracking()
            .Where(m => roleIds.Contains(m.RoleId) && m.EffectiveToUtc == null)
            .Join(
                dbContext.AwardClassificationDefinitions.AsNoTracking(),
                mapping => mapping.AwardClassificationId,
                classification => classification.Id,
                (mapping, classification) => new { mapping.RoleId, classification.Id, classification.Name })
            .ToDictionaryAsync(x => x.RoleId, x => (x.Id, x.Name), cancellationToken);

        // Separate dictionary rather than a single joined query — same
        // "compose two independent lookups in memory" pattern
        // AwardReferenceDataLookup.GetAvailableAwardsAsync already uses for
        // its own AwardRates join, and a role's mapped classification can
        // legitimately have no currently-active rate row (matches
        // AwardReferenceDataLookup's own "simply has no entry" comment).
        var classificationIds = activeMappings.Values.Select(x => x.Id).ToList();
        var ratesByClassification = await dbContext.AwardRates
            .AsNoTracking()
            .Where(rate => classificationIds.Contains(rate.AwardClassificationId) && rate.EffectiveToUtc == null)
            .ToDictionaryAsync(rate => rate.AwardClassificationId, rate => rate.BaseHourlyRate, cancellationToken);

        return roles
            .Select(r =>
            {
                if (!activeMappings.TryGetValue(r.Id, out var mapping))
                {
                    return RoleDto.FromDomain(r, null, null, null);
                }

                var baseHourlyRate = ratesByClassification.TryGetValue(mapping.Id, out var rate) ? rate : (decimal?)null;
                return RoleDto.FromDomain(r, mapping.Id, mapping.Name, baseHourlyRate);
            })
            .ToList();
    }
}
