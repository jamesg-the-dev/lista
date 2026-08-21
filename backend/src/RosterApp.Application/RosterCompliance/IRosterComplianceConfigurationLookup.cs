namespace RosterApp.Application.RosterCompliance;

/// <summary>Read side for RosterComplianceConfiguration — projects straight to DTOs (AsNoTracking), same repository/lookup split as AwardConfig.</summary>
public interface IRosterComplianceConfigurationLookup
{
    /// <summary>The currently-active row for a venue, or null if the venue hasn't configured its roster rules yet — the settings UI pre-fills sensible defaults client-side in that case (§2 AC4).</summary>
    Task<RosterComplianceConfigurationDto?> GetActiveAsync(Guid venueId, CancellationToken cancellationToken);

    /// <summary>All versions (including superseded ones), newest first — for the settings UI's configuration history.</summary>
    Task<IReadOnlyList<RosterComplianceConfigurationDto>> GetHistoryAsync(Guid venueId, CancellationToken cancellationToken);
}
