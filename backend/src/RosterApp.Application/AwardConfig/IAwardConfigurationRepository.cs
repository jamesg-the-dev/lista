using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Write-side port for the AwardConfiguration aggregate — tracked-entity
/// repository, same shape as IVenueRepository. Read-heavy queries (active
/// config, history) go through IAwardConfigurationLookup instead.
/// </summary>
public interface IAwardConfigurationRepository
{
    /// <summary>The currently-active (EffectiveToUtc IS NULL) row for a venue, tracked so Supersede() can be called on it — null if the venue has never configured its award.</summary>
    Task<AwardConfiguration?> GetActiveByVenueIdAsync(Guid venueId, CancellationToken cancellationToken);

    void Add(AwardConfiguration configuration);
}
