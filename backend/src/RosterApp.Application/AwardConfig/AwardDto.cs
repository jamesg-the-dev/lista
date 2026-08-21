using RosterApp.Domain.AwardConfig;

namespace RosterApp.Application.AwardConfig;

/// <summary>
/// System-maintained reference data — populates the award dropdown
/// (GetAvailableAwardsQuery). MinimumCasualLoadingPercent lets the settings
/// UI show/validate the "(award minimum: 25%)" hint inline against the
/// currently-selected award, mirroring
/// UpdateAwardConfigurationCommandValidator's own casual-loading-floor
/// check; null means the award has no classification/rate data seeded yet
/// (see AwardDefinition — only MA000009 does in MVP).
/// </summary>
public sealed record AwardDto(
    Guid Id,
    string AwardCode,
    string Name,
    string Jurisdiction,
    decimal? MinimumCasualLoadingPercent)
{
    public static AwardDto FromDomain(AwardDefinition award, decimal? minimumCasualLoadingPercent) =>
        new(award.Id, award.AwardCode, award.Name, award.Jurisdiction, minimumCasualLoadingPercent);
}
