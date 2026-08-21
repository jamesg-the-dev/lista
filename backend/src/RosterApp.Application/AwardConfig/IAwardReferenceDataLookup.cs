namespace RosterApp.Application.AwardConfig;

/// <summary>
/// Read port over the system-maintained award reference data (AwardDefinition/
/// AwardClassificationDefinition/AwardRate) — owners never write to this,
/// they only select from it, so there's no matching repository.
/// </summary>
public interface IAwardReferenceDataLookup
{
    /// <summary>Populates the award dropdown (GetAvailableAwardsQuery).</summary>
    Task<IReadOnlyList<AwardDto>> GetAvailableAwardsAsync(CancellationToken cancellationToken);

    Task<bool> AwardExistsAsync(Guid awardId, CancellationToken cancellationToken);

    /// <summary>
    /// The strictest (highest) currently-active CasualLoadingPercentMin
    /// across every classification under this award, or null if the award
    /// has no classification/rate data seeded yet. TODO: once RoleAwardMapping
    /// exists (Staff & Roles build-order step), narrow this to only the
    /// classifications actually mapped to a role in this venue, rather than
    /// every classification the award defines — a venue that only rosters
    /// Level 1 staff shouldn't be held to a Level 6 minimum it never uses.
    /// </summary>
    Task<decimal?> GetMinimumCasualLoadingPercentAsync(Guid awardId, CancellationToken cancellationToken);
}
