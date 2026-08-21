using RosterApp.Domain.RosterCompliance;

namespace RosterApp.Application.RosterCompliance;

/// <summary>Write-side port for the RosterComplianceConfiguration aggregate — tracked-entity repository, same shape as IAwardConfigurationRepository.</summary>
public interface IRosterComplianceConfigurationRepository
{
    /// <summary>The currently-active (EffectiveToUtc IS NULL) row for a venue, tracked so Supersede() can be called on it — null if the venue has never configured its roster rules.</summary>
    Task<RosterComplianceConfiguration?> GetActiveByVenueIdAsync(Guid venueId, CancellationToken cancellationToken);

    void Add(RosterComplianceConfiguration configuration);
}
