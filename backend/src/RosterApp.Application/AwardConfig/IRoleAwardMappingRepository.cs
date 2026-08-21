using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

/// <summary>Write-side port, same versioned-aggregate pattern as IAwardConfigurationRepository.</summary>
public interface IRoleAwardMappingRepository
{
    /// <summary>The currently-active (EffectiveToUtc IS NULL) mapping for a role, if any.</summary>
    Task<RoleAwardMapping?> GetActiveByRoleIdAsync(Guid roleId, CancellationToken cancellationToken);

    void Add(RoleAwardMapping mapping);
}
