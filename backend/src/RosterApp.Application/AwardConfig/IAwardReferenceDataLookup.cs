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

    /// <summary>Populates the classification dropdown in RoleAwardMappingTable, scoped to the venue's currently-selected award.</summary>
    Task<IReadOnlyList<AwardClassificationDto>> GetClassificationsForAwardAsync(Guid awardId, CancellationToken cancellationToken);

    /// <summary>Backs SetRoleAwardMappingCommandValidator's existence check.</summary>
    Task<bool> ClassificationExistsAsync(Guid awardClassificationId, CancellationToken cancellationToken);

    /// <summary>
    /// The strictest (highest) currently-active CasualLoadingPercentMin
    /// across every classification under this award, or null if the award
    /// has no classification/rate data seeded yet. TODO: RoleAwardMapping
    /// now exists (Staff & Roles build-order step), but this still isn't
    /// narrowed to only the classifications actually mapped to a role in
    /// this venue — a venue that only rosters Level 1 staff shouldn't be
    /// held to a Level 6 minimum it never uses. Narrowing this is pay-calc
    /// scope, not part of the Staff & Roles settings CRUD work that
    /// introduced RoleAwardMapping.
    /// </summary>
    Task<decimal?> GetMinimumCasualLoadingPercentAsync(Guid awardId, CancellationToken cancellationToken);
}
