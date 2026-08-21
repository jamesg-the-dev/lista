using RosterApp.Domain.Rostering;

namespace RosterApp.Application.Rostering;

/// <summary>
/// Resolves the config-driven thresholds IRosterComplianceValidator needs
/// (min/max shift length, min rest, meal break rules) for a venue. Kept as
/// its own port, separate from RosterApp.Application.RosterCompliance's
/// repository/lookup interfaces, so Rostering command handlers depend only
/// on Domain.Rostering types — the same "resolved by caller, validator
/// stays a pure function with no cross-context dependency" discipline as
/// AwardConfiguration.CreateNewVersion's award-minimum resolution.
/// </summary>
public interface IRosterComplianceThresholdsLookup
{
    /// <summary>RosterComplianceThresholds.Default if the venue hasn't configured its roster rules yet.</summary>
    Task<RosterComplianceThresholds> GetActiveThresholdsAsync(Guid venueId, CancellationToken cancellationToken);
}
