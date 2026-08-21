namespace RosterApp.Application.AwardConfig;

/// <summary>Read side for AwardConfiguration — projects straight to DTOs (AsNoTracking), same repository/lookup split as Venue.</summary>
public interface IAwardConfigurationLookup
{
    /// <summary>The currently-active row for a venue, or null if the venue hasn't configured its award yet.</summary>
    Task<AwardConfigurationDto?> GetActiveAsync(Guid venueId, CancellationToken cancellationToken);

    /// <summary>All versions (including superseded ones), newest first — for the settings UI's collapsed audit/history panel.</summary>
    Task<IReadOnlyList<AwardConfigurationDto>> GetHistoryAsync(Guid venueId, CancellationToken cancellationToken);
}
